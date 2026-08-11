import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireIdentity, requireCoachOfClient } from "./auth";

// NOTE: The legacy `list` query (full-table dump) has been removed.
// It was unauthenticated and returned every user's body-measurement history.
// (Closes BUG-055.)

/** Get progress entries for a client — self, assigned coach, or admin only. */
export const getByClient = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);
    if (caller._id !== args.clientId && caller.role !== "admin") {
      if (caller.role !== "coach") {
        throw new Error("Forbidden: cannot read another user's progress");
      }
      const target = await ctx.db.get(args.clientId);
      if (!target || target.coachId !== caller._id) {
        throw new Error("Forbidden: not the assigned coach for this client");
      }
    }
    return await ctx.db
      .query("progress")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
  },
});

/** Coach view of all assigned clients' progress entries. */
export const getCoachView = query({
  args: { coachId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);
    if (caller._id !== args.coachId && caller.role !== "admin") {
      throw new Error("Forbidden: cannot read another coach's view");
    }

    const clients = await ctx.db
      .query("users")
      .withIndex("by_coachId", (q) => q.eq("coachId", args.coachId))
      .collect();

    const clientIds = new Set(clients.map((c) => c._id));

    // Per-client indexed reads instead of a full-table scan (perf hardening).
    const perClient = await Promise.all(
      Array.from(clientIds).map((clientId) =>
        ctx.db
          .query("progress")
          .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
          .collect(),
      ),
    );
    return perClient.flat();
  },
});

/**
 * Create a progress entry.
 *
 * Two valid actors:
 *   - the client themselves (creating their own progress),
 *   - the client's assigned coach (logging on the client's behalf).
 *
 * Closes BUG-035: was previously a full IDOR via `requireOwnership` short-circuit.
 */
export const create = mutation({
  args: {
    clientId: v.id("users"),
    date: v.string(),
    weight: v.optional(v.number()),
    bodyFat: v.optional(v.number()),
    measurements: v.optional(
      v.object({
        chest: v.optional(v.number()),
        waist: v.optional(v.number()),
        hips: v.optional(v.number()),
        arms: v.optional(v.number()),
        thighs: v.optional(v.number()),
      }),
    ),
    notes: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);
    if (caller._id !== args.clientId && caller.role !== "admin") {
      // Coach-on-behalf-of-client — must be the assigned coach.
      await requireCoachOfClient(ctx, args.clientId);
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    // Bounds-check measurements
    if (args.weight !== undefined && (args.weight < 0 || args.weight > 1000)) {
      throw new Error("Weight must be between 0 and 1000 kg");
    }
    if (args.bodyFat !== undefined && (args.bodyFat < 0 || args.bodyFat > 100)) {
      throw new Error("Body fat must be between 0 and 100");
    }

    return await ctx.db.insert("progress", args);
  },
});
