import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireIdentity } from "./auth";
import { requireActiveSubscription } from "./subscriptions";

const exerciseValidator = v.object({
  name: v.string(),
  dayOfWeek: v.string(),
  targetSets: v.number(),
  targetReps: v.number(),
  targetWeight: v.number(),
});

// NOTE: The legacy unauthenticated `list` query (full-table dump of every
// plan in the system) has been removed. Use admin-scoped tooling for that.
// Closes BUG-055.

export const getByClient = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);
    if (caller._id !== args.clientId && caller.role !== "admin") {
      if (caller.role !== "coach") {
        throw new Error("Forbidden: cannot read another user's plans");
      }
      const target = await ctx.db.get(args.clientId);
      if (!target || target.coachId !== caller._id) {
        throw new Error("Forbidden: not the assigned coach for this client");
      }
    }
    return await ctx.db
      .query("plans")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
  },
});

export const getByCoach = query({
  args: { coachId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);
    if (caller._id !== args.coachId && caller.role !== "admin") {
      throw new Error("Forbidden: cannot read another coach's plans");
    }
    return await ctx.db
      .query("plans")
      .withIndex("by_coachId", (q) => q.eq("coachId", args.coachId))
      .collect();
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
    await requireRole(ctx, ["coach", "admin"]);

    // Validate date ordering
    if (args.startDate > args.endDate) {
      throw new Error("Start date must be before end date");
    }

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
    const caller = await requireRole(ctx, ["coach", "admin"]);

    const plan = await ctx.db.get(args.id);
    if (!plan) throw new Error("Plan not found");

    // Coach-ownership check — closes BUG-027 (any coach could archive any
    // other coach's plans).
    if (caller.role === "coach" && plan.coachId !== caller._id) {
      throw new Error("Forbidden: cannot edit another coach's plan");
    }

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
    await requireRole(ctx, ["coach", "admin"]);

    // Billing gate — the coach the plan is attributed to must have an active
    // subscription. Admins bypass via the helper's admin-bypass branch.
    await requireActiveSubscription(ctx, args.coachId);

    // Validate date ordering
    if (args.startDate > args.endDate) {
      throw new Error("Start date must be before end date");
    }

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
 *
 * Identity-gated: only the client themselves, their assigned coach, or an
 * admin may read. Closes BUG-008 (was an unauthenticated PII exfiltration —
 * anyone with the public Convex URL could pull any user's full plan).
 */
export const getActivePlanWithItems = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);
    if (caller._id !== args.clientId && caller.role !== "admin") {
      if (caller.role !== "coach") {
        throw new Error("Forbidden: cannot read another user's active plan");
      }
      const target = await ctx.db.get(args.clientId);
      if (!target || target.coachId !== caller._id) {
        throw new Error("Forbidden: not the assigned coach for this client");
      }
    }

    // Use the composite index for a single seek instead of a scan+filter.
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_clientId_status", (q) =>
        q.eq("clientId", args.clientId).eq("status", "active"),
      )
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
