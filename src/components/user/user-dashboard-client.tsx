"use client";

import { useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Dumbbell,
  CalendarOff,
  MessageSquare,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressRing } from "@/components/animations/progress-ring";
import { DaySelector } from "./day-selector";
import {
  ExercisePreviewCard,
  ExercisePreviewCardSkeleton,
} from "./exercise-preview-card";
import { useActivePlan } from "@/hooks/use-active-plan";
import { Stagger } from "@/components/animations/stagger";
import { ChatPanel } from "@/components/messaging";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function UserDashboardClient() {
  const { user: clerkUser } = useUser();
  const { isLoading, planData, activeDayIndex, currentDayName, weeklyProgress } =
    useActivePlan();

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const activeDay = useMemo(() => {
    if (selectedDay) {
      return planData?.days.find((d) => d.dayOfWeek === selectedDay);
    }
    return planData?.days[activeDayIndex];
  }, [selectedDay, planData, activeDayIndex]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!planData) {
    return <EmptyState />;
  }

  const firstName = clerkUser?.firstName ?? "Athlete";

  return (
    <div className="flex min-h-screen flex-col bg-[#111508] pb-28">
      {/* Header */}
      <header
        className="sticky top-0 z-40 h-[56px] w-full flex items-center"
        style={{
          background: "rgba(17, 21, 8, 0.5)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(68, 73, 51, 0.1)",
        }}
      >
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight text-[#e2e4cf]">My Week</h1>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-4">
        {/* Greeting + Progress Ring */}
        <section className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#c4c9ac]" suppressHydrationWarning>{getGreeting()}</p>
            <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-[#e2e4cf]">
              {firstName}
            </h2>
            {planData.plan.description && (
              <p className="mt-1 max-w-xs text-xs text-[#c4c9ac] line-clamp-1">
                {planData.plan.description}
              </p>
            )}
          </div>

          <ProgressRing
            value={weeklyProgress.completed}
            max={weeklyProgress.total}
            size={72}
            strokeWidth={5}
            color="neon"
            showLabel
            label="this week"
          />
        </section>

        {/* Weekly summary pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-[rgba(68,73,51,0.2)] bg-[rgba(9,9,11,0.3)] px-3 py-1.5">
            <Dumbbell className="size-3 text-[#c4c9ac]" />
            <span className="text-xs font-medium text-[#c4c9ac]">
              {weeklyProgress.total} workout days
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[#abd600]/20 bg-[#abd600]/5 px-3 py-1.5">
            <Sparkles className="size-3 text-[#abd600]" />
            <span className="text-xs font-medium text-[#abd600]">
              {weeklyProgress.completed} completed
            </span>
          </div>
        </div>

        {/* Day Selector */}
        <section>
          <DaySelector
            days={planData.days.map((d) => d.dayOfWeek)}
            selectedDay={activeDay?.dayOfWeek ?? planData.days[0]?.dayOfWeek ?? ""}
            currentDay={currentDayName}
            completedDays={weeklyProgress.completedDayNames}
            onDaySelect={setSelectedDay}
          />
        </section>

        {/* Exercise List */}
        <section>
          {activeDay ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#c4c9ac] border-l-2 border-[#abd600] pl-4">
                  {activeDay.dayOfWeek}
                  {activeDay.dayOfWeek === currentDayName && (
                    <span className="ml-2 text-[#abd600]">
                      &middot; Today
                    </span>
                  )}
                </h3>
                <span className="text-xs text-[#c4c9ac]">
                  {activeDay.exercises.length} exercises
                </span>
              </div>
              <Stagger className="flex flex-col gap-3">
                {activeDay.exercises.map((exercise, i) => (
                  <ExercisePreviewCard
                    key={exercise._id}
                    exercise={exercise}
                    index={i}
                  />
                ))}
              </Stagger>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(68,73,51,0.2)] py-12 text-center">
              <Dumbbell className="mb-3 size-8 text-[#444933]" />
              <p className="text-sm text-[#c4c9ac]">
                No exercises for this day
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Sticky CTA */}
      {planData.days.length > 0 && (
        <div
          className="fixed inset-x-0 bottom-16 md:bottom-0 z-40 pointer-events-none"
          style={{
            background: "linear-gradient(to top, #111508, rgba(17, 21, 8, 0.9) 60%, transparent)",
          }}
        >
          <div className="p-4">
            <Button
              variant="gradient"
              size="xl"
              className="w-full h-14 rounded-full font-black uppercase tracking-widest pointer-events-auto"
              nativeButton={false}
              render={<Link href="/user/session" />}
            >
              <Dumbbell className="size-5" />
              Start Workout
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[#111508]">
      <header
        className="sticky top-0 z-40 h-[56px] w-full flex items-center justify-between"
        style={{
          background: "rgba(17, 21, 8, 0.5)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(68, 73, 51, 0.1)",
        }}
      >
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight text-[#e2e4cf]">My Week</h1>
        </div>
        <div className="px-4">
          <ChatPanel />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-4">
        {/* Greeting skeleton */}
        <section className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded bg-[#282b1d]" />
            <Skeleton className="h-7 w-48 rounded bg-[#282b1d]" />
            <Skeleton className="h-3 w-40 rounded bg-[#1e2113]" />
          </div>
          <Skeleton className="size-[72px] rounded-full bg-[#282b1d]" />
        </section>

        {/* Pills skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32 rounded-full bg-[#282b1d]" />
          <Skeleton className="h-8 w-28 rounded-full bg-[#282b1d]" />
        </div>

        {/* Day selector skeleton */}
        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-20 rounded-lg bg-[#282b1d]"
            />
          ))}
        </div>

        {/* Exercise cards skeleton */}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32 rounded bg-[#282b1d]" />
          <ExercisePreviewCardSkeleton />
          <ExercisePreviewCardSkeleton />
          <ExercisePreviewCardSkeleton />
        </div>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-screen flex-col bg-[#111508]">
      <header
        className="sticky top-0 z-40 h-[56px] w-full flex items-center"
        style={{
          background: "rgba(17, 21, 8, 0.5)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(68, 73, 51, 0.1)",
        }}
      >
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight text-[#e2e4cf]">My Week</h1>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-[#abd600]/8 blur-2xl" />
          <div className="relative flex size-24 items-center justify-center rounded-2xl border border-[rgba(68,73,51,0.2)] bg-[rgba(9,9,11,0.5)] backdrop-blur-xl">
            <CalendarOff className="size-10 text-[#c4c9ac]" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[#e2e4cf]">No active plan</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#c4c9ac]">
            You don&apos;t have a workout plan assigned yet. Reach out to your
            coach to get your first program.
          </p>
        </div>

        <Button
          variant="gradient"
          size="lg"
          className="press-scale"
          nativeButton={false}
          render={<Link href="/user/dashboard" />}
        >
          <MessageSquare className="size-4" />
          Contact Coach
        </Button>

        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          Back to Dashboard
        </Button>
      </main>
    </div>
  );
}
