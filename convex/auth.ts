import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";

// ─── Type-safe role enum ─────────────────────────────────────────────
export const ROLES = ["admin", "coach", "user"] as const;
export type ConvexUserRole = (typeof ROLES)[number];

// ─── Internal helpers (not exported) ────────────────────────────────

async function findUserByClerkId(ctx: QueryCtx | MutationCtx, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
}

// ─── Server-side guards ─────────────────────────────────────────────

export const getUserId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await findUserByClerkId(ctx, args.clerkId);
    return user?._id ?? null;
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await findUserByClerkId(ctx, args.clerkId);
  },
});

export const requireRole = query({
  args: { clerkId: v.string(), requiredRole: v.string() },
  handler: async (ctx, args) => {
    const user = await findUserByClerkId(ctx, args.clerkId);
    if (!user) return { allowed: false as const, reason: "User not found" as const };

    const hierarchy: Record<ConvexUserRole, number> = {
      admin: 3,
      coach: 2,
      user: 1,
    };

    const userLevel = hierarchy[user.role] ?? 0;
    const requiredLevel = hierarchy[args.requiredRole as ConvexUserRole] ?? 0;

    if (userLevel < requiredLevel) {
      return { allowed: false as const, reason: "Insufficient permissions" as const };
    }

    return { allowed: true as const, user };
  },
});

// ─── Mutations ──────────────────────────────────────────────────────

export const syncUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("coach"), v.literal("user")),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

export const updateRole = mutation({
  args: {
    clerkId: v.string(),
    role: v.union(v.literal("admin"), v.literal("coach"), v.literal("user")),
  },
  handler: async (ctx, args) => {
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
    const user = await findUserByClerkId(ctx, args.clerkId);
    if (!user) throw new Error("User not found");
    await ctx.db.delete(user._id);
  },
});

// ─── Queries ────────────────────────────────────────────────────────

export const listCoaches = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "coach"))
      .collect();
  },
});

export const listClients = query({
  args: { coachId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_coachId", (q) => q.eq("coachId", args.coachId))
      .collect();
  },
});
