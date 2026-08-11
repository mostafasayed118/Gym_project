"use client";

import { CheckCircle, Clock } from "lucide-react";

interface SessionData {
  _id: string;
  date: string;
  exerciseCount: number;
  totalSets: number;
  completedSets: number;
  completionRate: number;
  totalVolume: number;
}

interface RecentSessionsFeedProps {
  sessions: SessionData[];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString + "T00:00:00");
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function RecentSessionsFeed({ sessions }: RecentSessionsFeedProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No completed sessions yet.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-0">
      {sessions.map((session, i) => {
        const isLast = i === sessions.length - 1;
        const completionPct = Math.round(session.completionRate * 100);

        return (
          <div
            key={session._id}
            className="group relative flex gap-4"
          >
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[11px] top-8 h-[calc(100%-16px)] w-px bg-zinc-800/60" />
            )}

            {/* Timeline dot */}
            <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-900">
              {completionPct === 100 ? (
                <CheckCircle className="size-5 text-[oklch(0.85_0.2_145)]" />
              ) : (
                <Clock className="size-5 text-amber-400" />
              )}
            </div>

            {/* Session info */}
            <div className="flex flex-1 items-start justify-between gap-3 pb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatDate(session.date)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {getRelativeTime(session.date)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {session.exerciseCount} exercises &middot;{" "}
                  {session.completedSets}/{session.totalSets} sets
                </p>
              </div>

              <div className="text-right">
                <span className="text-sm font-bold tabular-nums">
                  {(session.totalVolume / 1000).toFixed(1)}k
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  kg vol
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RecentSessionsFeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="size-6 animate-pulse rounded-full bg-zinc-800/60" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-800/60" />
            <div className="h-3 w-48 animate-pulse rounded bg-zinc-800/40" />
          </div>
          <div className="space-y-1">
            <div className="h-4 w-10 animate-pulse rounded bg-zinc-800/60" />
            <div className="h-2.5 w-8 animate-pulse rounded bg-zinc-800/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
