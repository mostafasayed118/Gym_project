import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./auth";

// ─── Queries ────────────────────────────────────────────────────────

/** Get audit logs by actor */
export const getAuditLogsByActor = query({
  args: {
    actorId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);

    const limit = args.limit ?? 50;
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_actorId", (q) => q.eq("actorId", args.actorId))
      .order("desc")
      .take(limit);

    return Promise.all(
      logs.map(async (log) => {
        const actor = await ctx.db.get(log.actorId);
        return { ...log, actorName: actor?.name ?? "Unknown" };
      }),
    );
  },
});

/** Get audit logs by action */
export const getAuditLogsByAction = query({
  args: {
    action: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);

    const limit = args.limit ?? 50;
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_action", (q) => q.eq("action", args.action))
      .order("desc")
      .take(limit);

    return Promise.all(
      logs.map(async (log) => {
        const actor = await ctx.db.get(log.actorId);
        return { ...log, actorName: actor?.name ?? "Unknown" };
      }),
    );
  },
});

/** Get recent audit logs */
export const getRecentAuditLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);

    const limit = args.limit ?? 50;
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    return Promise.all(
      logs.map(async (log) => {
        const actor = await ctx.db.get(log.actorId);
        return {
          ...log,
          actorName: actor?.name ?? "Unknown",
          actorEmail: actor?.email ?? "Unknown",
        };
      }),
    );
  },
});

/**
 * Get audit log stats over a bounded recent window.
 *
 * Previously this called `.collect()` over the entire `auditLogs` table and
 * would exceed Convex's per-query row limit (~16k) after a few months of
 * normal usage. (Closes BUG-052.) The window is configurable via the
 * `lookbackDays` arg (default 30, max 365); the response carries a `truncated`
 * flag if the underlying scan hit the read cap.
 */
const STATS_ROW_CAP = 8_000;

export const getAuditLogStats = query({
  args: { lookbackDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);

    const lookbackDays = Math.min(Math.max(args.lookbackDays ?? 30, 1), 365);
    const sinceTs = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", sinceTs))
      .order("desc")
      .take(STATS_ROW_CAP);

    const actionCounts: Record<string, number> = {};
    for (const log of logs) {
      actionCounts[log.action] = (actionCounts[log.action] ?? 0) + 1;
    }

    const actorCounts: Record<string, number> = {};
    for (const log of logs) {
      actorCounts[log.actorId] = (actorCounts[log.actorId] ?? 0) + 1;
    }

    return {
      totalLogs: logs.length,
      actionCounts,
      actorCounts,
      windowDays: lookbackDays,
      truncated: logs.length === STATS_ROW_CAP,
    };
  },
});

// ─── Mutations ──────────────────────────────────────────────────────

/**
 * Log an audit event (append-only).
 *
 * The `actorId` is ALWAYS derived from the authenticated admin identity —
 * never from an argument. This closes the BUG-014 forgery vector where any
 * admin could blame any other admin.
 */
export const logAuditEvent = mutation({
  args: {
    action: v.string(),
    targetEntity: v.string(),
    targetId: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);

    return await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      action: args.action,
      targetEntity: args.targetEntity,
      targetId: args.targetId,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

/** Delete user with audit logging */
export const deleteUserWithAudit = mutation({
  args: {
    targetUserId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);

    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      action: "deleteUser",
      targetEntity: "users",
      targetId: args.targetUserId,
      metadata: { reason: args.reason },
      timestamp: Date.now(),
    });

    await ctx.db.delete(args.targetUserId);
    return true;
  },
});

/** Update role with audit logging */
export const updateRoleWithAudit = mutation({
  args: {
    targetUserId: v.id("users"),
    newRole: v.union(v.literal("admin"), v.literal("coach"), v.literal("user")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) throw new Error("User not found");

    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      action: "updateRole",
      targetEntity: "users",
      targetId: args.targetUserId,
      metadata: { oldRole: targetUser.role, newRole: args.newRole, reason: args.reason },
      timestamp: Date.now(),
    });

    await ctx.db.patch(args.targetUserId, { role: args.newRole, updatedAt: Date.now() });
    return true;
  },
});

/** Assign coach with audit logging */
export const assignCoachWithAudit = mutation({
  args: {
    clientUserId: v.id("users"),
    coachUserId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);

    const client = await ctx.db.get(args.clientUserId);
    if (!client) throw new Error("Client not found");

    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      action: "assignCoach",
      targetEntity: "users",
      targetId: args.clientUserId,
      metadata: { oldCoachId: client.coachId, newCoachId: args.coachUserId, reason: args.reason },
      timestamp: Date.now(),
    });

    await ctx.db.patch(args.clientUserId, { coachId: args.coachUserId, updatedAt: Date.now() });
    return true;
  },
});

/**
 * Archive audit logs older than 1 year.
 *
 * Converted from public `mutation` to `internalMutation` so it can be scheduled
 * by the nightly cron (which has no admin identity). Closes BUG-052.
 */
export const archiveOldLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const oldLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", oneYearAgo))
      .take(100);

    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
    }
    return { deleted: oldLogs.length };
  },
});
