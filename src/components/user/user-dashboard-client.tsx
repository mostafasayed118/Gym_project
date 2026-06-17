"use client";

import { useActivePlan } from "@/hooks/use-active-plan";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseCardSkeleton } from "./exercise-card";
import { PlanHeader } from "./plan-header";
import { DaySection } from "./day-section";
import { Dumbbell, CalendarOff } from "lucide-react";
import Link from "next/link";

export function UserDashboardClient() {
  const { isLoading, planData, activeDayIndex, currentDayName } = useActivePlan();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!planData) {
    return <EmptyState />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold">My Workouts</h1>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6">
        <PlanHeader plan={planData.plan} coach={planData.coach} />

        {planData.days.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="bg-muted flex size-16 items-center justify-center rounded-full">
                <Dumbbell className="size-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium">No exercises yet</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Your coach hasn&apos;t added any exercises to your plan yet.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={planData.days[activeDayIndex]?.dayOfWeek}>
            <TabsList className="w-full justify-start overflow-x-auto">
              {planData.days.map((day) => (
                <TabsTrigger key={day.dayOfWeek} value={day.dayOfWeek}>
                  {day.dayOfWeek.slice(0, 3)}
                  {day.dayOfWeek === currentDayName && (
                    <span className="bg-primary ml-1 size-1.5 rounded-full" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {planData.days.map((day) => (
              <TabsContent key={day.dayOfWeek} value={day.dayOfWeek}>
                <DaySection day={day} isToday={day.dayOfWeek === currentDayName} />
              </TabsContent>
            ))}
          </Tabs>
        )}

        {planData.days.length > 0 && (
          <div className="flex justify-center pt-2">
            <Button size="lg" render={<Link href="/user/session" />}>
              <Dumbbell className="size-4" />
              Start Workout
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <Skeleton className="h-6 w-32" />
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-80" />
        </div>

        <div className="bg-muted h-9 w-full rounded-lg" />

        <div className="flex flex-col gap-3">
          <ExerciseCardSkeleton />
          <ExerciseCardSkeleton />
          <ExerciseCardSkeleton />
        </div>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold">My Workouts</h1>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="bg-muted flex size-20 items-center justify-center rounded-full">
          <CalendarOff className="size-10 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">No active plan</h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">
            You don&apos;t have an active workout plan assigned. Please contact your coach to get started.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Back to Dashboard
        </Button>
      </main>
    </div>
  );
}
