"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export interface ExerciseItem {
  _id: string;
  exerciseName: string;
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

  const isLoading = !clerkLoaded || convexUser === undefined || planData === undefined;

  const sortedDays: DayPlan[] = planData?.days
    ? [...planData.days].sort((a, b) => {
        const aIdx = DAYS_ORDER.indexOf(a.dayOfWeek as (typeof DAYS_ORDER)[number]);
        const bIdx = DAYS_ORDER.indexOf(b.dayOfWeek as (typeof DAYS_ORDER)[number]);
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      })
    : [];

  const currentDayName = DAYS_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const todayIndex = sortedDays.findIndex((d) => d.dayOfWeek === currentDayName);
  const activeDayIndex = todayIndex >= 0 ? todayIndex : 0;

  return {
    isLoading,
    planData: planData ? { ...planData, days: sortedDays } : null,
    activeDayIndex,
    currentDayName,
  };
}
