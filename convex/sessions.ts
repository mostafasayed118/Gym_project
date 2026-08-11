import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  requireRole,
  requireIdentity,
  requireSelf,
  requireCoachOfClient,
} from "./auth";
import { requireActiveSubscription } from "./subscriptions";

/**
 * Internal variant of `getByClient` for server-side callers (cron fan-out
 * actions) that have no authenticated identity. Must NOT be exposed publicly.
 */
export const getByClientInternal = internalQuery({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
  },
});

// NOTE: Removed `list` (unauthenticated full-table dump — BUG-055) and
// `getByDate` (mass session enumeration by date — BUG-054). If admin tooling
// needs these, add scoped variants that call `requireRole(["admin"])`.

export const getByClient = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);
    if (caller._id !== args.clientId && caller.role !== "admin") {
      if (caller.role !== "coach") {
        throw new Error("Forbidden: cannot read another user's sessions");
      }
      const target = await ctx.db.get(args.clientId);
      if (!target || target.coachId !== caller._id) {
        throw new Error("Forbidden: not the assigned coach for this client");
      }
    }
    return await ctx.db
      .query("sessions")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
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
    // Coach must be assigned to the client AND have an active subscription.
    // Closes BUG-028 (cross-coach session creation + billing gate bypass).
    const caller = await requireRole(ctx, ["coach", "admin"]);
    if (caller.role === "coach") {
      await requireCoachOfClient(ctx, args.clientId);
      await requireActiveSubscription(ctx, caller._id);
    }

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
    const session = await ctx.db.get(args.id);
    if (!session) throw new Error("Session not found");

    // Either the client owns the session, or the caller is its coach/admin.
    // Closes BUG-028's complete-side variant.
    const caller = await requireIdentity(ctx);
    if (caller._id !== session.clientId && caller.role !== "admin") {
      if (caller.role !== "coach" || session.coachId !== caller._id) {
        throw new Error("Forbidden: cannot complete another coach's session");
      }
    }

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
/**
 * Creates a new session for today based on the user's active plan.
 * Returns the session ID, or null if no exercises are scheduled for today.
 */
export const createForToday = mutation({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    // Strict identity binding — only the user themselves (or an admin) can
    // start their own session.
    await requireSelf(ctx, args.clientId);

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

    // No exercises today — return null instead of throwing
    if (todayItems.length === 0) {
      return null;
    }

    const exercises = todayItems.map((item) => ({
      name: item.exerciseName,
      sets: Array.from({ length: item.targetSets }, () => ({
        reps: item.targetReps,
        weight: item.targetWeight,
        completed: false,
      })),
    }));

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
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Only the session's client (or admin) may log sets. Coaches cannot
    // log sets on a client's behalf — closes the IDOR variant where any
    // coach could write into any client's session.
    await requireSelf(ctx, session.clientId);

    // Validate setIndex bounds
    if (args.setIndex < 0 || args.setIndex > 20) {
      throw new Error("Invalid set index");
    }

    // Bounds-check weight & reps — closes BUG-017. Negative or massive values
    // are not physically meaningful and were trivially exploitable for PR
    // farming via the underlying `gamification.checkForPR` formula.
    if (args.actualWeight < 0 || args.actualWeight > 1000) {
      throw new Error("actualWeight must be between 0 and 1000 kg");
    }
    if (args.actualReps < 0 || args.actualReps > 100) {
      throw new Error("actualReps must be between 0 and 100");
    }
    if (args.targetWeight < 0 || args.targetWeight > 1000) {
      throw new Error("targetWeight out of bounds");
    }
    if (args.targetReps < 0 || args.targetReps > 100) {
      throw new Error("targetReps out of bounds");
    }

    // Prevent logging for completed sessions
    if (session.completed) {
      throw new Error("Cannot log sets for a completed session");
    }

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

    // Identity gate — only the client, their coach, or an admin may read.
    const caller = await requireIdentity(ctx);
    if (caller._id !== session.clientId && caller.role !== "admin") {
      if (caller.role !== "coach" || session.coachId !== caller._id) {
        throw new Error("Forbidden: cannot read another user's session");
      }
    }

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
 * This is a simplified version of complete() for when you don't need to update exercises.
 */
export const finish = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    // Only the session's owner (or admin) can finish it.
    await requireSelf(ctx, session.clientId);

    await ctx.db.patch(args.sessionId, { completed: true });
  },
});

/**
 * Returns aggregated progress dashboard data for a client.
 * Optimized single query for the coach's client progress view.
 */
export const getClientProgressDashboard = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    // Identity gate — self / assigned coach / admin only.
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

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0] ?? "";
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0] ?? "";

    // Fetch all sessions for this client
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();

    const completedSessions = sessions.filter((s) => s.completed);

    // Fetch all session sets for completed sessions
    const completedSessionIds = completedSessions.map((s) => s._id);
    const allSets = await ctx.db.query("sessionSets").collect();
    const clientSets = allSets.filter((s) =>
      completedSessionIds.includes(s.sessionId),
    );

    // --- Volume Chart Data (last 30 days) ---
    const volumeByDate = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0] ?? "";
      volumeByDate.set(dateStr, 0);
    }

    for (const session of completedSessions) {
      if (session.date < thirtyDaysAgoStr) continue;
      const sessionSets = clientSets.filter(
        (s) => s.sessionId === session._id,
      );
      const sessionVolume = sessionSets.reduce(
        (sum, s) => sum + s.actualWeight * s.actualReps,
        0,
      );
      const current = volumeByDate.get(session.date) ?? 0;
      volumeByDate.set(session.date, current + sessionVolume);
    }

    const volumeData = Array.from(volumeByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, volume]) => ({
        date,
        volume,
        label: new Date(date + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      }));

    // --- Total Volume This Month ---
    let totalVolumeThisMonth = 0;
    for (const session of completedSessions) {
      if (session.date < monthStart) continue;
      const sessionSets = clientSets.filter(
        (s) => s.sessionId === session._id,
      );
      totalVolumeThisMonth += sessionSets.reduce(
        (sum, s) => sum + s.actualWeight * s.actualReps,
        0,
      );
    }

    // --- Workout Streak ---
    const completedDates = [...new Set(completedSessions.map((s) => s.date))]
      .sort()
      .reverse();
    let streak = 0;
    const checkDate = new Date(now);
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split("T")[0] ?? "";
      if (completedDates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Today might not be completed yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      } else {
        break;
      }
    }

    // --- PRs Hit (personal records) ---
    // Sort sets chronologically so the "running max" walk produces a
    // deterministic, time-ordered PR count. (Closes BUG-039.)
    const exerciseBestWeight = new Map<string, number>();
    let prCount = 0;
    const sortedSets = [...clientSets].sort(
      (a, b) => a.completedAt - b.completedAt,
    );
    for (const set of sortedSets) {
      const current = exerciseBestWeight.get(set.exerciseName) ?? 0;
      if (set.actualWeight > current) {
        exerciseBestWeight.set(set.exerciseName, set.actualWeight);
        prCount++;
      }
    }

    // --- Top 5 Exercises by Volume ---
    // Track repsAtMaxWeight alongside maxWeight so Brzycki uses the actual
    // reps from the record-setting set. (Closes BUG-040 — was hardcoded to 10.)
    const exerciseStats = new Map<
      string,
      {
        totalVolume: number;
        maxWeight: number;
        repsAtMaxWeight: number;
        sessions: number;
        lastWeight: number;
        lastSetCompletedAt: number;
      }
    >();
    for (const set of sortedSets) {
      const existing = exerciseStats.get(set.exerciseName) ?? {
        totalVolume: 0,
        maxWeight: 0,
        repsAtMaxWeight: 0,
        sessions: 0,
        lastWeight: 0,
        lastSetCompletedAt: 0,
      };
      existing.totalVolume += set.actualWeight * set.actualReps;
      if (set.actualWeight > existing.maxWeight) {
        existing.maxWeight = set.actualWeight;
        existing.repsAtMaxWeight = set.actualReps;
      }
      if (set.completedAt >= existing.lastSetCompletedAt) {
        existing.lastSetCompletedAt = set.completedAt;
        existing.lastWeight = set.actualWeight;
      }
      exerciseStats.set(set.exerciseName, existing);
    }

    const topExercises = Array.from(exerciseStats.entries())
      .sort(([, a], [, b]) => b.totalVolume - a.totalVolume)
      .slice(0, 5)
      .map(([name, stats]) => {
        // Brzycki 1RM: weight × (36 / (37 − reps)). Bounds-checked to avoid
        // div-by-zero when reps === 37 (impossible in practice given the
        // 100-rep cap, but defensive).
        const reps = Math.max(1, Math.min(36, stats.repsAtMaxWeight || 1));
        const estimated1RM = Math.round(stats.maxWeight * (36 / (37 - reps)));
        const trend: "up" | "down" =
          stats.lastWeight >= stats.maxWeight ? "up" : "down";
        return {
          name,
          lastWeight: stats.lastWeight,
          maxWeight: stats.maxWeight,
          estimated1RM,
          totalVolume: stats.totalVolume,
          trend,
        };
      });

    // --- Recent Sessions (last 5) ---
    const recentSessions = completedSessions
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
      .map((session) => {
        const sessionSets = clientSets.filter(
          (s) => s.sessionId === session._id,
        );
        const totalSets = session.exercises.reduce(
          (sum, ex) => sum + ex.sets.length,
          0,
        );
        const completedSets = sessionSets.length;
        const totalVolume = sessionSets.reduce(
          (sum, s) => sum + s.actualWeight * s.actualReps,
          0,
        );
        return {
          _id: session._id,
          date: session.date,
          exerciseCount: session.exercises.length,
          totalSets,
          completedSets,
          completionRate: totalSets > 0 ? completedSets / totalSets : 0,
          totalVolume,
        };
      });

    return {
      totalVolumeThisMonth,
      workoutStreak: streak,
      prsHit: prCount,
      volumeData,
      topExercises,
      recentSessions,
      totalCompletedSessions: completedSessions.length,
    };
  },
});
