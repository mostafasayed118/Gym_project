"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  ArrowLeft,
  Flame,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressRing } from "@/components/animations/progress-ring";
import { VolumeChart, VolumeChartSkeleton } from "@/components/coach/volume-chart";
import {
  ExerciseProgressionTable,
  ExerciseProgressionTableSkeleton,
} from "@/components/coach/exercise-progression-table";
import {
  RecentSessionsFeed,
  RecentSessionsFeedSkeleton,
} from "@/components/coach/recent-sessions-feed";
import { Stagger } from "@/components/animations/stagger";
import type { Id } from "@convex/_generated/dataModel";

interface ClientProgressViewProps {
  clientId: Id<"users">;
}

export function ClientProgressView({ clientId }: ClientProgressViewProps) {
  const dashboard = useQuery(
    api.sessions.getClientProgressDashboard,
    { clientId },
  );

  const isLoading = dashboard === undefined;

  if (isLoading) {
    return <ProgressDashboardSkeleton />;
  }

  if (!dashboard) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href="/coach/dashboard" />}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Client Progress</h1>
            <p className="text-sm text-muted-foreground">
              No data available yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href="/coach/dashboard" />}
            className="size-11"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Client Progress
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Last 30 days overview
            </p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-4">
        {/* Metric Cards */}
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.85_0.2_145/0.1)]">
                <Zap className="size-5 text-[oklch(0.85_0.2_145)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold tabular-nums tracking-tight">
                  {(dashboard.totalVolumeThisMonth / 1000).toFixed(1)}k
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Volume This Month (kg)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                <Flame className="size-5 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold tabular-nums tracking-tight">
                  {dashboard.workoutStreak}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Day Workout Streak
                </p>
              </div>
              {dashboard.workoutStreak > 0 && (
                <ProgressRing
                  value={dashboard.workoutStreak}
                  max={Math.max(dashboard.workoutStreak, 7)}
                  size={48}
                  strokeWidth={4}
                  color="amber"
                  showLabel={false}
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
                <Trophy className="size-5 text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold tabular-nums tracking-tight">
                  {dashboard.prsHit}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  PRs Hit This Month
                </p>
              </div>
            </CardContent>
          </Card>
        </Stagger>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Volume Chart — spans 2 cols */}
          <Card className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Volume Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VolumeChart data={dashboard.volumeData} />
            </CardContent>
          </Card>

          {/* Recent Sessions — spans 1 col */}
          <Card className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentSessionsFeed sessions={dashboard.recentSessions} />
            </CardContent>
          </Card>

          {/* Exercise Progression — spans full width */}
          <Card className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Top Exercises
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExerciseProgressionTable exercises={dashboard.topExercises} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function ProgressDashboardSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-11 rounded-xl bg-zinc-800/60" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32 rounded bg-zinc-800/60" />
            <Skeleton className="h-3 w-24 rounded bg-zinc-800/40" />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-4">
        {/* Metric cards skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card
              key={i}
              className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl"
            >
              <CardContent className="flex items-center gap-4 py-5">
                <div className="size-12 animate-pulse rounded-xl bg-zinc-800/60" />
                <div className="space-y-2">
                  <div className="h-7 w-16 animate-pulse rounded bg-zinc-800/60" />
                  <div className="h-3 w-28 animate-pulse rounded bg-zinc-800/40" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bento grid skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-4 w-24 rounded bg-zinc-800/60" />
            </CardHeader>
            <CardContent>
              <VolumeChartSkeleton />
            </CardContent>
          </Card>

          <Card className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl">
            <CardHeader>
              <Skeleton className="h-4 w-32 rounded bg-zinc-800/60" />
            </CardHeader>
            <CardContent>
              <RecentSessionsFeedSkeleton />
            </CardContent>
          </Card>

          <Card className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl lg:col-span-3">
            <CardHeader>
              <Skeleton className="h-4 w-28 rounded bg-zinc-800/60" />
            </CardHeader>
            <CardContent>
              <ExerciseProgressionTableSkeleton />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
