import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db.query("plans").collect();
    return plans;
  },
});

export const getByClient = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("plans")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
    return plans;
  },
});

export const getByCoach = query({
  args: { coachId: v.id("users") },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("plans")
      .withIndex("by_coachId", (q) => q.eq("coachId", args.coachId))
      .collect();
    return plans;
  },
});

export const create = mutation({
  args: {
    coachId: v.id("users"),
    clientId: v.id("users"),
    title: v.string(),
    description: v.string(),
    exercises: v.array(
      v.object({
        name: v.string(),
        sets: v.number(),
        reps: v.number(),
        weight: v.optional(v.number()),
        duration: v.optional(v.number()),
        notes: v.optional(v.string()),
      }),
    ),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const planId = await ctx.db.insert("plans", {
      ...args,
      status: "active",
    });
    return planId;
  },
});

export const update = mutation({
  args: {
    id: v.id("plans"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("completed"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = {};
    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.status !== undefined) updates.status = fields.status;
    await ctx.db.patch(id, updates);
  },
});
