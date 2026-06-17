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

/**
 * Creates a new session for today based on the user's active plan.
 * Returns the session ID.
 */
export const createForToday = mutation({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .first();

    if (!plan) throw new Error("No active plan found");

    const today = new Date().toISOString().split("T")[0] ?? new Date().toISOString().slice(0, 10);

    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.and(q.eq(q.field("date"), today), q.eq(q.field("completed"), false)))
      .first();

    if (existing) return existing._id;

    const items = await ctx.db
      .query("planItems")
      .withIndex("by_planId", (q) => q.eq("planId", plan._id))
      .collect();

    const dayOfWeek = [
      "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
    ][new Date().getDay()];

    const todayItems = items.filter((item) => item.dayOfWeek === dayOfWeek);

    const exercises = todayItems.map((item) => ({
      name: item.exerciseName,
      sets: Array.from({ length: item.targetSets }, () => ({
        reps: item.targetReps,
        weight: item.targetWeight,
        completed: false,
      })),
    }));

    if (exercises.length === 0) {
      throw new Error("No exercises scheduled for today");
    }

    const sessionId = await ctx.db.insert("sessions", {
      clientId: args.clientId,
      coachId: plan.coachId,
      planId: plan._id,
      date: today,
      exercises,
      completed: false,
    });

    return sessionId;
  },
});

/**
 * Logs or updates a single set for an exercise in a session.
 * Uses upsert logic — if a set with the same setIndex exists, it updates it.
 */
export const logSet = mutation({
  args: {
    sessionId: v.id("sessions"),
    exerciseName: v.string(),
    setIndex: v.number(),
    targetWeight: v.number(),
    targetReps: v.number(),
    actualWeight: v.number(),
    actualReps: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sessionSets")
      .withIndex("by_sessionId_exerciseName", (q) =>
        q.eq("sessionId", args.sessionId).eq("exerciseName", args.exerciseName),
      )
      .filter((q) => q.eq(q.field("setIndex"), args.setIndex))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        actualWeight: args.actualWeight,
        actualReps: args.actualReps,
        completedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("sessionSets", {
      sessionId: args.sessionId,
      exerciseName: args.exerciseName,
      setIndex: args.setIndex,
      targetWeight: args.targetWeight,
      targetReps: args.targetReps,
      actualWeight: args.actualWeight,
      actualReps: args.actualReps,
      completedAt: Date.now(),
    });
  },
});

/**
 * Returns a session with all its logged sets, grouped by exercise.
 */
export const getSessionWithSets = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const sets = await ctx.db
      .query("sessionSets")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return {
      ...session,
      loggedSets: sets,
    };
  },
});

/**
 * Marks a session as completed.
 */
export const finish = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { completed: true });
  },
});
