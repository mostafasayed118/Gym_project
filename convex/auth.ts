import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { checkRateLimit } from "./rateLimit";

// ─── Type-safe role enum ─────────────────────────────────────────────
export const ROLES = ["admin", "coach", "user"] as const;
export type ConvexUserRole = (typeof ROLES)[number];

const ROLE_HIERARCHY: Record<ConvexUserRole, number> = {
  admin: 3,
  coach: 2,
  user: 1,
};

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Look up a user row by Clerk ID, healing duplicate rows defensively.
 *
 * Two concurrent calls to `syncUser` (e.g. Clerk webhook racing a client-side
 * sync, or two webhook deliveries before idempotency landed) could both pass
 * the existence check and both insert. Without this guard, every subsequent
 * `.unique()` lookup throws "expected at most one." (Closes BUG-051.)
 *
 * Resolution: prefer the older row (smallest `_creationTime`) as canonical
 * and delete the duplicates. Read-only `QueryCtx` callers skip the delete
 * and just pick the canonical row.
 */
async function findUserByClerkId(ctx: QueryCtx | MutationCtx, clerkId: string) {
  const rows = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .take(2);
  if (rows.length <= 1) return rows[0] ?? null;

  const sorted = [...rows].sort((a, b) => a._creationTime - b._creationTime);
  const canonical = sorted[0]!;
  if ("delete" in ctx.db) {
    // We're in a mutation — clean up the duplicate.
    for (const dup of sorted.slice(1)) {
      await (ctx as MutationCtx).db.delete(dup._id);
    }
  }
  return canonical;
}

/**
 * Returns the authenticated Convex user, or throws.
 *
 * Throws on: missing identity, missing Convex user row, or `status === "suspended"`.
 * This is the foundational gate used by every other auth helper.
 */
export async function requireIdentity(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: not authenticated");
  }

  const user = await findUserByClerkId(ctx, identity.subject);
  if (!user) {
    throw new Error("Unauthorized: user not found in database");
  }

  if (user.status === "suspended") {
    throw new Error("Forbidden: account suspended");
  }

  return user;
}

/**
 * Server-side auth guard: verifies the caller is authenticated, not suspended,
 * and has at least one of the allowed roles. Returns the authenticated user.
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: ConvexUserRole[],
): Promise<Doc<"users">> {
  const user = await requireIdentity(ctx);

  const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
  const requiredLevel = Math.min(
    ...allowedRoles.map((r) => ROLE_HIERARCHY[r] ?? 0),
  );

  if (userLevel < requiredLevel) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return user;
}

/**
 * Legacy ownership guard kept for back-compat in READ paths where coach/admin
 * access to other users' data is desired.
 *
 * DO NOT use this for WRITES on user-scoped data — its admin/coach bypass
 * allowed a god-mode IDOR pattern across the codebase. Use `requireSelf` or
 * `requireCoachOfClient` instead.
 *
 * @deprecated for write paths — use `requireSelf` / `requireCoachOfClient`.
 */
export async function requireOwnership(
  ctx: QueryCtx | MutationCtx,
  targetUserId: string,
): Promise<Doc<"users">> {
  const caller = await requireIdentity(ctx);

  if (caller.role === "admin" || caller.role === "coach") {
    return caller;
  }

  if (caller._id !== targetUserId) {
    throw new Error("Forbidden: can only access your own resources");
  }

  return caller;
}

/**
 * Strict identity check: the caller MUST match `targetUserId` (admins bypass).
 *
 * Use for write mutations on user-scoped data — user's own stats, messages,
 * push tokens, check-ins, progress. Coaches do NOT bypass. Closes the IDOR
 * cluster (BUG-002, 003, 004, 012, 013, 035).
 */
export async function requireSelf(
  ctx: QueryCtx | MutationCtx,
  targetUserId: Id<"users"> | string,
): Promise<Doc<"users">> {
  const caller = await requireIdentity(ctx);

  if (caller.role === "admin") {
    return caller;
  }

  if (caller._id !== targetUserId) {
    throw new Error("Forbidden: this action requires the resource owner");
  }

  return caller;
}

/**
 * Coach-scope check: caller is admin, OR caller is the assigned coach of the
 * target client.
 *
 * Use for coach-side writes on client data (review check-in, create session
 * for client, etc.). Prevents cross-coach interference (BUG-027, 028, 029).
 */
export async function requireCoachOfClient(
  ctx: QueryCtx | MutationCtx,
  clientId: Id<"users"> | string,
): Promise<Doc<"users">> {
  const caller = await requireIdentity(ctx);

  if (caller.role === "admin") {
    return caller;
  }

  if (caller.role !== "coach") {
    throw new Error("Forbidden: coach role required");
  }

  const client = await ctx.db.get(clientId as Id<"users">);
  if (!client) {
    throw new Error("Client not found");
  }

  if (client.coachId !== caller._id) {
    throw new Error("Forbidden: not the assigned coach for this client");
  }

  return caller;
}

// ─── Public Queries (no auth required) ──────────────────────────────

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await findUserByClerkId(ctx, args.clerkId);
  },
});

// ─── User Mutations ─────────────────────────────────────────────────

export const syncUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("coach"), v.literal("user")),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // Webhook calls (no identity) — trusted because the webhook route
    // already verifies the svix signature before calling this mutation.
    const isWebhook = !identity;

    if (!isWebhook) {
      const caller = await findUserByClerkId(ctx, identity!.subject);
      const isSelfSync = identity!.subject === args.clerkId;
      const isAdmin = caller?.role === "admin";

      if (!isSelfSync && !isAdmin) {
        throw new Error("Forbidden: can only sync your own account");
      }

      // Rate limit: 10 syncs per minute (only for client-initiated syncs)
      const callerId = caller?._id ?? identity!.subject;
      const rateLimitKey = `syncUser:${callerId}`;
      await checkRateLimit(ctx, rateLimitKey, 10, 60_000);

      // Non-admins cannot set role to admin
      if (args.role === "admin" && !isAdmin) {
        throw new Error("Forbidden: only admins can assign admin role");
      }
    }

    const existing = await findUserByClerkId(ctx, args.clerkId);

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        role: args.role,
        avatarUrl: args.avatarUrl,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      role: args.role,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ─── Admin Mutations ────────────────────────────────────────────────

export const updateRole = mutation({
  args: {
    clerkId: v.string(),
    role: v.union(v.literal("admin"), v.literal("coach"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);

    const user = await findUserByClerkId(ctx, args.clerkId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      role: args.role,
      updatedAt: Date.now(),
    });
    return user._id;
  },
});

export const assignCoach = mutation({
  args: {
    clientClerkId: v.string(),
    coachClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);

    const client = await findUserByClerkId(ctx, args.clientClerkId);
    const coach = await findUserByClerkId(ctx, args.coachClerkId);

    if (!client) throw new Error("Client not found");
    if (!coach) throw new Error("Coach not found");
    if (coach.role !== "coach" && coach.role !== "admin") {
      throw new Error("Target user is not a coach");
    }

    await ctx.db.patch(client._id, {
      coachId: coach._id,
      updatedAt: Date.now(),
    });
    return client._id;
  },
});

export const deleteUser = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);

    const user = await findUserByClerkId(ctx, args.clerkId);
    if (!user) throw new Error("User not found");
    await ctx.db.delete(user._id);
  },
});

// NOTE: Removed `listCoaches` and `listClients` (unauthenticated coach/client
// PII enumeration — anyone with the public Convex URL could pull the full
// coach or per-coach client lists; verified leaking live on prod). Neither was
// referenced anywhere in the app or backend, so they're deleted outright
// rather than guarded — same call as the `list`/`getByDate` removals in
// sessions.ts (BUG-055/BUG-054). If admin tooling needs these, add scoped
// variants that call `requireRole(["admin"])`.

// ─── Admin Queries ──────────────────────────────────────────────────

export const listAllUsers = query({
  args: {
    role: v.optional(v.string()),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);

    let users;

    if (args.role) {
      users = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", args.role as ConvexUserRole))
        .collect();
    } else {
      users = await ctx.db.query("users").collect();
    }

    // Filter by search if provided
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower),
      );
    }

    // Filter by status if provided
    if (args.status) {
      users = users.filter((u) => (u.status ?? "active") === args.status);
    }

    // Batch fetch session and plan counts for all users
    const userIds = users.map((u) => u._id);

    // Fetch all sessions for these users in parallel
    const sessionsByUser = await Promise.all(
      userIds.map(async (userId) => {
        const sessions = await ctx.db
          .query("sessions")
          .withIndex("by_clientId", (q) => q.eq("clientId", userId))
          .collect();
        return { userId, sessions };
      }),
    );

    // Fetch all plans for these users in parallel
    const plansByUser = await Promise.all(
      userIds.map(async (userId) => {
        const plans = await ctx.db
          .query("plans")
          .withIndex("by_clientId", (q) => q.eq("clientId", userId))
          .collect();
        return { userId, plans };
      }),
    );

    // Build lookup maps
    const sessionMap = new Map(sessionsByUser.map(({ userId, sessions }) => [userId, sessions]));
    const planMap = new Map(plansByUser.map(({ userId, plans }) => [userId, plans]));

    // Batch resolve coach names
    const uniqueCoachIds = [
      ...new Set(users.map((u) => u.coachId).filter((id): id is typeof id & {} => id !== undefined)),
    ];
    const coachDocs = await Promise.all(
      uniqueCoachIds.map(async (coachId) => {
        const coach = await ctx.db.get(coachId);
        return { coachId, name: coach?.name ?? null };
      }),
    );
    const coachNameMap = new Map(coachDocs.map(({ coachId, name }) => [coachId, name]));

    // Enrich users with counts
    const enriched = users.map((user) => {
      const sessions = sessionMap.get(user._id) ?? [];
      const plans = planMap.get(user._id) ?? [];

      return {
        _id: user._id,
        clerkId: user.clerkId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status ?? "active",
        avatarUrl: user.avatarUrl,
        coachId: user.coachId,
        coachName: user.coachId ? (coachNameMap.get(user.coachId) ?? null) : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        totalSessions: sessions.length,
        completedSessions: sessions.filter((s) => s.completed).length,
        totalPlans: plans.length,
        activePlans: plans.filter((p) => p.status === "active").length,
      };
    });

    return enriched;
  },
});

export const getSystemHealth = query({
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const todayStr = new Date().toISOString().split("T")[0];

    // Batch fetch all data in parallel
    const [allUsers, recentSessions, allPlans, allSets] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("sessions").collect(),
      ctx.db.query("plans").collect(),
      ctx.db.query("sessionSets").collect(),
    ]);

    // Compute stats in memory
    const usersByRole = {
      admin: allUsers.filter((u) => u.role === "admin").length,
      coach: allUsers.filter((u) => u.role === "coach").length,
      user: allUsers.filter((u) => u.role === "user").length,
    };

    const activeSessions = recentSessions.filter(
      (s) => !s.completed && s._creationTime > oneHourAgo,
    );

    const sessionsToday = recentSessions.filter((s) => s.date === todayStr);

    const activePlans = allPlans.filter((p) => p.status === "active");

    // Total volume (last 24h)
    const recentSessionIds = new Set(
      recentSessions
        .filter((s) => s.completed && s._creationTime > oneDayAgo)
        .map((s) => s._id),
    );

    const recentSets = allSets.filter((s) => recentSessionIds.has(s.sessionId));
    const volumeLast24h = recentSets.reduce(
      (sum, s) => sum + s.actualWeight * s.actualReps,
      0,
    );

    return {
      totalUsers: allUsers.length,
      usersByRole,
      activeSessions: activeSessions.length,
      sessionsToday: sessionsToday.length,
      totalSessions: recentSessions.length,
      activePlans: activePlans.length,
      totalPlans: allPlans.length,
      volumeLast24h,
    };
  },
});

export const searchAll = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);

    const searchLower = args.query.toLowerCase();
    if (searchLower.length < 2) return { users: [], sessions: [], plans: [] };

    // Batch fetch all data in parallel
    const [allUsers, allPlans, allSessions] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("plans").collect(),
      ctx.db.query("sessions").collect(),
    ]);

    // Search users
    const users = allUsers
      .filter(
        (u) =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower),
      )
      .slice(0, 5)
      .map((u) => ({
        type: "user" as const,
        id: u._id,
        clerkId: u.clerkId,
        title: u.name,
        subtitle: u.email,
        role: u.role,
      }));

    // Search plans
    const plans = allPlans
      .filter((p) => p.title.toLowerCase().includes(searchLower))
      .slice(0, 5)
      .map((p) => ({
        type: "plan" as const,
        id: p._id,
        title: p.title,
        subtitle: p.status,
      }));

    // Search sessions (by date)
    const sessions = allSessions
      .filter((s) => s.date.includes(searchLower))
      .slice(0, 5)
      .map((s) => ({
        type: "session" as const,
        id: s._id,
        title: `Session - ${s.date}`,
        subtitle: `${s.exercises.length} exercises`,
      }));

    return { users, sessions, plans };
  },
});
