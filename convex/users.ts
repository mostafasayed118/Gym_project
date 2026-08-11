import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./auth";
import { api, internal } from "./_generated/api";

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0] ?? "";
}

function daysSince(dateString: string | null): number | null {
  if (!dateString) return null;
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export const getCoachClients = query({
  args: { coachId: v.id("users") },
  handler: async (ctx, args) => {
    const clients = await ctx.db
      .query("users")
      .withIndex("by_coachId", (q) => q.eq("coachId", args.coachId))
      .collect();

    const weekStart = getWeekStart();

    const enriched = await Promise.all(
      clients.map(async (client) => {
        const activePlan = await ctx.db
          .query("plans")
          .withIndex("by_clientId", (q) => q.eq("clientId", client._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .first();

        const lastSession = await ctx.db
          .query("sessions")
          .withIndex("by_clientId", (q) => q.eq("clientId", client._id))
          .order("desc")
          .first();

        const allSessions = await ctx.db
          .query("sessions")
          .withIndex("by_clientId", (q) => q.eq("clientId", client._id))
          .collect();

        const weeklySessions = allSessions.filter(
          (s) => s.date >= weekStart,
        );
        const completedThisWeek = weeklySessions.filter(
          (s) => s.completed,
        ).length;

        const daysOff = daysSince(lastSession?.date ?? null);
        const hasPlan = activePlan !== null;

        let status: "active" | "plan_pending" | "stale" = "active";
        if (!hasPlan) {
          status = "plan_pending";
        } else if (daysOff !== null && daysOff > 7) {
          status = "stale";
        }

        return {
          _id: client._id,
          name: client.name,
          email: client.email,
          avatarUrl: client.avatarUrl,
          activePlan: hasPlan ? { title: activePlan!.title } : null,
          lastWorkoutDate: lastSession?.date ?? null,
          status,
          weeklySessions: weeklySessions.length,
          completedThisWeek,
          engagementRate:
            weeklySessions.length > 0
              ? completedThisWeek / weeklySessions.length
              : 0,
        };
      }),
    );

    return enriched;
  },
});

export const getCoachMetrics = query({
  args: { coachId: v.id("users") },
  handler: async (ctx, args) => {
    const clients = await ctx.db
      .query("users")
      .withIndex("by_coachId", (q) => q.eq("coachId", args.coachId))
      .collect();

    const weekStart = getWeekStart();

    // Parallelize per-client lookups instead of a serial for-loop (closes
    // the worst case of BUG-053 — was O(N) sequential round-trips).
    const perClient = await Promise.all(
      clients.map(async (client) => {
        const [activePlan, sessions] = await Promise.all([
          ctx.db
            .query("plans")
            .withIndex("by_clientId_status", (q) =>
              q.eq("clientId", client._id).eq("status", "active"),
            )
            .first(),
          ctx.db
            .query("sessions")
            .withIndex("by_clientId_date", (q) =>
              q.eq("clientId", client._id).gte("date", weekStart),
            )
            .collect(),
        ]);

        return {
          hasPlan: activePlan !== null,
          sessionsThisWeek: sessions.length,
        };
      }),
    );

    const clientsWithoutPlans = perClient.filter((c) => !c.hasPlan).length;
    const totalSessionsThisWeek = perClient.reduce(
      (sum, c) => sum + c.sessionsThisWeek,
      0,
    );

    return {
      totalActiveClients: clients.length,
      sessionsThisWeek: totalSessionsThisWeek,
      clientsWithoutPlans,
    };
  },
});

// ─── Admin Mutations ────────────────────────────────────────────────

/** Role Management: Admin changes a target user's role */
export const updateUserRole = mutation({
  args: {
    targetUserId: v.id("users"),
    newRole: v.union(v.literal("admin"), v.literal("coach"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);

    // Prevent self-demotion of the last admin
    if (admin._id === args.targetUserId && args.newRole !== "admin") {
      const adminCount = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .collect();

      if (adminCount.length <= 1) {
        throw new Error("Cannot demote the last remaining admin");
      }
    }

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    const oldRole = targetUser.role;

    // No-op if role is already the target
    if (oldRole === args.newRole) {
      return { changed: false };
    }

    await ctx.db.patch(args.targetUserId, {
      role: args.newRole,
      updatedAt: Date.now(),
    });

    // Audit log — `actorId` derived from identity inside the mutation
    await ctx.runMutation(api.audit.logAuditEvent, {
      action: "ROLE_CHANGE",
      targetEntity: "users",
      targetId: args.targetUserId,
      metadata: { oldRole, newRole: args.newRole },
    });

    return { changed: true, oldRole, newRole: args.newRole };
  },
});

/** Coach Assignment: Admin assigns a coach to a user */
export const assignCoachToUser = mutation({
  args: {
    targetUserId: v.id("users"),
    coachId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    const coach = await ctx.db.get(args.coachId);
    if (!coach) {
      throw new Error("Coach not found");
    }

    // Verify target has the "user" role
    if (targetUser.role !== "user") {
      throw new Error("Can only assign coaches to users with the 'user' role");
    }

    // Verify assignee has the "coach" or "admin" role
    if (coach.role !== "coach" && coach.role !== "admin") {
      throw new Error("Assignee must have the 'coach' or 'admin' role");
    }

    // No-op if already assigned to this coach
    if (targetUser.coachId === args.coachId) {
      return { changed: false };
    }

    const oldCoachId = targetUser.coachId;

    await ctx.db.patch(args.targetUserId, {
      coachId: args.coachId,
      updatedAt: Date.now(),
    });

    // Audit log — `actorId` derived from identity inside the mutation
    await ctx.runMutation(api.audit.logAuditEvent, {
      action: "COACH_ASSIGN",
      targetEntity: "users",
      targetId: args.targetUserId,
      metadata: {
        oldCoachId: oldCoachId ?? null,
        newCoachId: args.coachId,
        coachName: coach.name,
      },
    });

    return { changed: true, oldCoachId, newCoachId: args.coachId };
  },
});

// ─── Internal Queries (for Clerk action lookups) ────────────────────

/** Internal query: fetch user by _id (used by clerkActions.ts) */
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// ─── Suspension Mutation ────────────────────────────────────────────

/** Suspend a user: updates DB status, logs audit, schedules Clerk ban */
export const suspendUser = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);

    // Prevent self-suspension
    if (admin._id === args.targetUserId) {
      throw new Error("Cannot suspend yourself");
    }

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    const currentStatus = targetUser.status ?? "active";

    // Already suspended
    if (currentStatus === "suspended") {
      return { changed: false, status: "suspended" };
    }

    // Update status to suspended
    await ctx.db.patch(args.targetUserId, {
      status: "suspended",
      updatedAt: Date.now(),
    });

    // Audit log — `actorId` derived from identity inside the mutation
    await ctx.runMutation(api.audit.logAuditEvent, {
      action: "USER_SUSPENDED",
      targetEntity: "users",
      targetId: args.targetUserId,
      metadata: {
        previousStatus: currentStatus,
        newStatus: "suspended",
      },
    });

    // Schedule the Clerk ban action (runs in Node.js runtime)
    if (!targetUser.clerkId) {
      throw new Error("User has no linked Clerk account");
    }
    await ctx.scheduler.runAfter(0, internal.clerkActions.banUserInClerk, {
      clerkId: targetUser.clerkId,
    });

    return { changed: true, status: "suspended" };
  },
});

/** Unsuspend a user: updates DB status, logs audit, schedules Clerk unban */
export const unsuspendUser = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    const currentStatus = targetUser.status ?? "active";

    // Not suspended
    if (currentStatus !== "suspended") {
      return { changed: false, status: currentStatus };
    }

    // Update status to active
    await ctx.db.patch(args.targetUserId, {
      status: "active",
      updatedAt: Date.now(),
    });

    // Audit log — `actorId` derived from identity inside the mutation
    await ctx.runMutation(api.audit.logAuditEvent, {
      action: "USER_UNSUSPENDED",
      targetEntity: "users",
      targetId: args.targetUserId,
      metadata: {
        previousStatus: "suspended",
        newStatus: "active",
      },
    });

    // Schedule the Clerk unban action (runs in Node.js runtime)
    if (!targetUser.clerkId) {
      throw new Error("User has no linked Clerk account");
    }
    await ctx.scheduler.runAfter(0, internal.clerkActions.unbanUserInClerk, {
      clerkId: targetUser.clerkId,
    });

    return { changed: true, status: "active" };
  },
});

// ─── Internal queries ───────────────────────────────────────────────

/**
 * Recipients for the weekly summary email blast.
 * Returns active clients (role="user") with a non-empty email.
 * Used by the cron-scheduled emailActions:sendWeeklySummariesToAll fan-out.
 */
export const listClientsForDigest = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "user"))
      .collect();

    return users
      .filter((u) => (u.status ?? "active") === "active" && u.email.length > 0)
      .map((u) => ({ _id: u._id, email: u.email, name: u.name }));
  },
});
