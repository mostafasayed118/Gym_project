"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const DAYS_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export interface ExerciseItem {
  _id: string;
  exerciseName: string;
  // ExerciseDB catalog link — present only when the exercise was picked from
  // the synced catalog. Carries the demo GIF + instructions (best-effort: the
  // API rotates gifUrl periodically).
  exerciseDbId?: string;
  gifUrl?: string;
  instructions?: string[];
  targetSets: number;
  targetReps: number;
  targetWeight: number;
}

export interface DayPlan {
  dayOfWeek: string;
  exercises: ExerciseItem[];
}

export interface ActivePlanData {
  plan: {
    _id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
  };
  coach: { name: string } | null;
  days: DayPlan[];
}

export function useActivePlan() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();

  const convexUser = useQuery(
    api.auth.getUserByClerkId,
    clerkLoaded && clerkUser ? { clerkId: clerkUser.id } : "skip",
  );

  const planData = useQuery(
    api.plans.getActivePlanWithItems,
    convexUser ? { clientId: convexUser._id } : "skip",
  );

  const sessions = useQuery(
    api.sessions.getByClient,
    convexUser ? { clientId: convexUser._id } : "skip",
  );

  const isLoading =
    !clerkLoaded ||
    convexUser === undefined ||
    planData === undefined ||
    sessions === undefined;

  const sortedDays: DayPlan[] = planData?.days
    ? [...planData.days].sort((a, b) => {
        const aIdx = DAYS_ORDER.indexOf(
          a.dayOfWeek as (typeof DAYS_ORDER)[number],
        );
        const bIdx = DAYS_ORDER.indexOf(
          b.dayOfWeek as (typeof DAYS_ORDER)[number],
        );
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      })
    : [];

  // Seed the highlighted day from the client's local weekday once, at mount,
  // via a lazy initializer — setting it in an effect would trip
  // react-hooks/set-state-in-effect and cause a cascading render.
  const [currentDayName] = React.useState<string>(() => {
    const dayIdx = new Date().getDay();
    return DAYS_ORDER[dayIdx === 0 ? 6 : dayIdx - 1] ?? "Monday";
  });

  const todayIndex = sortedDays.findIndex(
    (d) => d.dayOfWeek === currentDayName,
  );
  const activeDayIndex = todayIndex >= 0 ? todayIndex : 0;

  // Calculate completed workouts this week
  const weekStart = getWeekStart();
  const completedSessions =
    sessions?.filter(
      (s) => s.completed && s.date >= weekStart,
    ) ?? [];
  const completedDays = new Set(completedSessions.map((s) => s.date));
  const totalWorkoutDays = sortedDays.length;
  // Clamp to totalWorkoutDays so the progress ring can never overflow when a
  // client logs sessions on days outside their plan. Closes BUG-076.
  const completedWorkoutDays = Math.min(completedDays.size, totalWorkoutDays);

  // Map of completed day-of-week names for this week
  const completedDayNames = new Set(
    completedSessions
      .map((s) => {
        const date = new Date(s.date + "T00:00:00");
        const dayIdx = date.getDay();
        return DAYS_ORDER[dayIdx === 0 ? 6 : dayIdx - 1];
      })
      .filter((d): d is (typeof DAYS_ORDER)[number] => !!d),
  );

  return {
    isLoading,
    planData: planData ? { ...planData, days: sortedDays } : null,
    activeDayIndex,
    currentDayName,
    weeklyProgress: {
      completed: completedWorkoutDays,
      total: totalWorkoutDays,
      completedDayNames,
    },
  };
}

/**
 * Local-time Monday-of-this-week as YYYY-MM-DD.
 *
 * Closes BUG-077: the prior implementation mutated `now` via `setDate` AND used
 * `toISOString()` which converts to UTC. For users east of UTC late at night,
 * the "week start" returned was one day off, causing `weeklyProgress.completed`
 * to under-count.
 */
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
