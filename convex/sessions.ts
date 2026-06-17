import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();
    return sessions;
  },
});

export const getByClient = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
    return sessions;
  },
});

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
    return sessions;
  },
});

export const create = mutation({
  args: {
    clientId: v.id("users"),
    coachId: v.id("users"),
    planId: v.id("plans"),
    date: v.string(),
    exercises: v.array(
      v.object({
        name: v.string(),
        sets: v.array(
          v.object({
            reps: v.number(),
            weight: v.number(),
            completed: v.boolean(),
          }),
        ),
      }),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("sessions", {
      ...args,
      completed: false,
    });
    return sessionId;
  },
});

export const complete = mutation({
  args: {
    id: v.id("sessions"),
    exercises: v.array(
      v.object({
        name: v.string(),
        sets: v.array(
          v.object({
            reps: v.number(),
            weight: v.number(),
            completed: v.boolean(),
          }),
        ),
      }),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      exercises: args.exercises,
      completed: true,
      notes: args.notes,
    });
  },
});
