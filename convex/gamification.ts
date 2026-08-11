import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireIdentity, requireSelf } from "./auth";

// ─── Validation helpers ─────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate a YYYY-MM-DD string and return the UTC midnight timestamp.
 * Throws on malformed input — prevents BUG-015 (Date.UTC(NaN) corruption
 * of userStats).
 */
function parseIsoDateToUtc(s: string): number {
  if (!ISO_DATE_RE.test(s)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }
  const [yearStr, monthStr, dayStr] = s.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const ts = Date.UTC(year, month - 1, day);
  if (Number.isNaN(ts)) {
    throw new Error("Invalid date: parse produced NaN.");
  }
  return ts;
}

function todayUtcDateString(): string {
  return new Date().toISOString().split("T")[0]!;
}

// ─── Badge Definitions ──────────────────────────────────────────────

const BADGE_DEFINITIONS = [
  { id: "first_session", name: "First Session", description: "Complete your first workout session" },
  { id: "7_day_streak", name: "7-Day Streak", description: "Work out 7 days in a row" },
  { id: "14_day_streak", name: "14-Day Streak", description: "Work out 14 days in a row" },
  { id: "30_day_streak", name: "30-Day Streak", description: "Work out 30 days in a row" },
  { id: "100k_club", name: "100K Club", description: "Lift 100,000 kg total volume" },
  { id: "500k_club", name: "500K Club", description: "Lift 500,000 kg total volume" },
  { id: "1m_club", name: "1M Club", description: "Lift 1,000,000 kg total volume" },
  { id: "first_pr", name: "First PR", description: "Hit your first personal record" },
  { id: "pr_machine", name: "PR Machine", description: "Hit 10 personal records" },
  { id: "pr_legend", name: "PR Legend", description: "Hit 50 personal records" },
] as const;

// ─── Queries ────────────────────────────────────────────────────────

export const getUserStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);

    // Identity binding — closes BUG-013. Permitted callers:
    //   - the user themselves,
    //   - an admin,
    //   - the user's assigned coach (read-only).
    if (caller._id !== args.userId && caller.role !== "admin") {
      if (caller.role !== "coach") {
        throw new Error("Forbidden: cannot read another user's stats");
      }
      const target = await ctx.db.get(args.userId);
      if (!target || target.coachId !== caller._id) {
        throw new Error("Forbidden: not the assigned coach for this client");
      }
    }

    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!stats) {
      return {
        currentStreak: 0,
        maxStreak: 0,
        totalVolume: 0,
        totalSessions: 0,
        badges: [],
        lastWorkoutDate: null,
      };
    }

    return stats;
  },
});

// ─── Mutations ──────────────────────────────────────────────────────

/** Check for PRs when a set is logged and update user stats. */
export const checkForPR = mutation({
  args: {
    userId: v.id("users"),
    exerciseName: v.string(),
    weight: v.number(),
    reps: v.number(),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    // Strict identity binding — closes BUG-002 (coach short-circuit allowed
    // cross-user gamification injection).
    await requireSelf(ctx, args.userId);

    // Bounds validation — closes BUG-017. Negative or absurd values are not
    // physically meaningful and were trivially exploitable for PR farming.
    if (args.weight <= 0 || args.weight > 1000) {
      throw new Error("Weight must be between 0 (exclusive) and 1000 kg");
    }
    if (args.reps <= 0 || args.reps > 100) {
      throw new Error("Reps must be between 0 (exclusive) and 100");
    }
    if (!args.exerciseName.trim()) {
      throw new Error("Exercise name cannot be empty");
    }

    // Calculate 1RM using Epley formula: weight * (1 + reps/30)
    const estimated1RM = args.weight * (1 + args.reps / 30);

    // Get all previous sets for this exercise by this user
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.userId))
      .collect();

    let isPR = false;
    let previousBest1RM = 0;
    let previousBestWeight = 0;

    for (const session of sessions) {
      if (session._id === args.sessionId) continue;

      const sessionSets = await ctx.db
        .query("sessionSets")
        .withIndex("by_sessionId_exerciseName", (q) =>
          q.eq("sessionId", session._id).eq("exerciseName", args.exerciseName),
        )
        .collect();

      for (const set of sessionSets) {
        const prev1RM = set.actualWeight * (1 + set.actualReps / 30);
        if (prev1RM > previousBest1RM) {
          previousBest1RM = prev1RM;
          previousBestWeight = set.actualWeight;
        }
      }
    }

    // Check if current set is a PR
    if (estimated1RM > previousBest1RM || (previousBest1RM === 0 && args.weight > 0)) {
      isPR = true;
    }

    // Update user stats
    const existingStats = await ctx.db
      .query("userStats")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existingStats) {
      const newBadges = [...existingStats.badges];

      // Add first PR badge if not already earned
      if (isPR && !newBadges.find((b) => b.id === "first_pr")) {
        newBadges.push({
          id: "first_pr",
          name: "First PR",
          unlockedAt: Date.now(),
        });
      }

      await ctx.db.patch(existingStats._id, {
        badges: newBadges,
      });
    }

    return {
      isPR,
      previousBest1RM,
      newBest1RM: estimated1RM,
      previousBestWeight,
      newBestWeight: args.weight,
    };
  },
});

/** Initialize or update user stats after a session */
export const updateUserStats = mutation({
  args: {
    userId: v.id("users"),
    sessionVolume: v.number(),
    sessionDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Strict identity binding — closes BUG-002.
    await requireSelf(ctx, args.userId);

    // Validate date format and reject backdated streaks (closes BUG-015, BUG-018).
    // sessionDate must be exactly today (UTC) — clients can't farm streaks by
    // submitting a series of past dates.
    parseIsoDateToUtc(args.sessionDate); // throws on bad format
    const today = todayUtcDateString();
    if (args.sessionDate !== today) {
      throw new Error("sessionDate must be today (UTC)");
    }

    // Bounds-check session volume (closes BUG-017 propagation to totalVolume).
    if (args.sessionVolume < 0 || args.sessionVolume > 1_000_000) {
      throw new Error("sessionVolume out of bounds");
    }

    const existing = await ctx.db
      .query("userStats")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    const newTotalVolume = (existing?.totalVolume ?? 0) + args.sessionVolume;
    const newTotalSessions = (existing?.totalSessions ?? 0) + 1;

    const todayUTC = parseIsoDateToUtc(args.sessionDate);
    const lastDateUTC = existing?.lastWorkoutDate
      ? parseIsoDateToUtc(existing.lastWorkoutDate)
      : null;

    let newStreak = existing?.currentStreak ?? 0;

    if (lastDateUTC !== null) {
      // Calculate difference in days (UTC)
      const diffDays = Math.floor((todayUTC - lastDateUTC) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        newStreak += 1;
      } else if (diffDays === 0) {
        // Same day, don't change streak
      } else {
        // Streak broken
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    const newMaxStreak = Math.max(existing?.maxStreak ?? 0, newStreak);

    // Check for new badges
    const newBadges = [...(existing?.badges ?? [])];
    const badgeChecks = [
      { id: "first_session", condition: newTotalSessions >= 1 },
      { id: "7_day_streak", condition: newStreak >= 7 },
      { id: "14_day_streak", condition: newStreak >= 14 },
      { id: "30_day_streak", condition: newStreak >= 30 },
      { id: "100k_club", condition: newTotalVolume >= 100000 },
      { id: "500k_club", condition: newTotalVolume >= 500000 },
      { id: "1m_club", condition: newTotalVolume >= 1000000 },
    ];

    for (const check of badgeChecks) {
      if (check.condition && !newBadges.find((b) => b.id === check.id)) {
        const def = BADGE_DEFINITIONS.find((d) => d.id === check.id);
        if (def) {
          newBadges.push({
            id: def.id,
            name: def.name,
            unlockedAt: Date.now(),
          });
        }
      }
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        totalVolume: newTotalVolume,
        totalSessions: newTotalSessions,
        badges: newBadges,
        lastWorkoutDate: args.sessionDate,
      });
    } else {
      await ctx.db.insert("userStats", {
        userId: args.userId,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        totalVolume: newTotalVolume,
        totalSessions: newTotalSessions,
        badges: newBadges,
        lastWorkoutDate: args.sessionDate,
      });
    }

    return {
      currentStreak: newStreak,
      maxStreak: newMaxStreak,
      totalVolume: newTotalVolume,
      totalSessions: newTotalSessions,
      newBadges: newBadges.filter(
        (b) => !existing?.badges.find((eb) => eb.id === b.id),
      ),
    };
  },
});

/**
 * Internal variant of `getUserStats` for server-side callers (cron jobs,
 * fan-out actions) that have no authenticated identity. Skips the auth gate.
 * Must NOT be exposed as `query`.
 */
export const getUserStatsInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!stats) {
      return {
        currentStreak: 0,
        maxStreak: 0,
        totalVolume: 0,
        totalSessions: 0,
        badges: [] as { id: string; name: string; unlockedAt: number }[],
        lastWorkoutDate: null as string | null,
      };
    }
    return stats;
  },
});

/** Get badge definitions for display */
export const getBadgeDefinitions = query({
  handler: async () => {
    return BADGE_DEFINITIONS;
  },
});
