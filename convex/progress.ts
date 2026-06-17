import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const progress = await ctx.db.query("progress").collect();
    return progress;
  },
});

export const getByClient = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    const progress = await ctx.db
      .query("progress")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
    return progress;
  },
});

export const getCoachView = query({
  args: { coachId: v.id("users") },
  handler: async (ctx, args) => {
    const clients = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "client"))
      .collect();

    const clientIds = clients.map((c) => c._id);

    const progress = await ctx.db.query("progress").collect();
    return progress.filter((p) => clientIds.includes(p.clientId));
  },
});

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
    const progressId = await ctx.db.insert("progress", args);
    return progressId;
  },
});
