import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const exerciseValidator = v.object({
  name: v.string(),
  dayOfWeek: v.string(),
  targetSets: v.number(),
  targetReps: v.number(),
  targetWeight: v.number(),
});

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

/**
 * Creates a plan and batch-inserts all exercise items in one transaction.
 * The `exercises` array is flattened from the nested day→exercise structure
 * the form produces, each carrying its `dayOfWeek` label.
 */
export const createPlanWithItems = mutation({
  args: {
    coachId: v.id("users"),
    clientId: v.id("users"),
    title: v.string(),
    description: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    exercises: v.array(exerciseValidator),
  },
  handler: async (ctx, args) => {
    const planId = await ctx.db.insert("plans", {
      coachId: args.coachId,
      clientId: args.clientId,
      title: args.title,
      description: args.description,
      exercises: [],
      startDate: args.startDate,
      endDate: args.endDate,
      status: "active",
    });

    for (const ex of args.exercises) {
      await ctx.db.insert("planItems", {
        planId,
        dayOfWeek: ex.dayOfWeek,
        exerciseName: ex.name,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        targetWeight: ex.targetWeight,
      });
    }

    return planId;
  },
});

/**
 * Returns the client's most recent active plan with all its items grouped by day.
 * Used by the User Dashboard for real-time plan display.
 */
export const getActivePlanWithItems = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .first();

    if (!plan) return null;

    const items = await ctx.db
      .query("planItems")
      .withIndex("by_planId", (q) => q.eq("planId", plan._id))
      .collect();

    const coach = await ctx.db.get(plan.coachId);

    const dayMap = new Map<string, typeof items>();
    for (const item of items) {
      const existing = dayMap.get(item.dayOfWeek) ?? [];
      existing.push(item);
      dayMap.set(item.dayOfWeek, existing);
    }

    const days = Array.from(dayMap.entries()).map(([dayOfWeek, exercises]) => ({
      dayOfWeek,
      exercises: exercises.map((ex) => ({
        _id: ex._id,
        exerciseName: ex.exerciseName,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        targetWeight: ex.targetWeight,
      })),
    }));

    return {
      plan: {
        _id: plan._id,
        title: plan.title,
        description: plan.description,
        startDate: plan.startDate,
        endDate: plan.endDate,
      },
      coach: coach ? { name: coach.name } : null,
      days,
    };
  },
});
