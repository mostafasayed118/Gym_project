"use client";

import {
  Dumbbell,
  Flame,
  Target,
  Zap,
  Heart,
  Timer,
  Mountain,
  Footprints,
} from "lucide-react";
import type { ExerciseItem } from "@/hooks/use-active-plan";

interface ExercisePreviewCardProps {
  exercise: ExerciseItem;
  index: number;
}

const exerciseIcons = [
  Dumbbell,
  Flame,
  Target,
  Zap,
  Heart,
  Timer,
  Mountain,
  Footprints,
];

export function ExercisePreviewCard({ exercise, index }: ExercisePreviewCardProps) {
  const IconComponent = exerciseIcons[index % exerciseIcons.length] ?? Dumbbell;

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-[rgba(68,73,51,0.2)] bg-[rgba(9,9,11,0.5)] p-5 transition-all duration-300 hover:border-[#c3f400]/40 hover:-translate-y-1"
      style={{
        backdropFilter: "blur(24px)",
        animationDelay: `${index * 80}ms`,
      }}
    >
      <div className="relative flex items-center justify-between">
        {/* Exercise info */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Icon container */}
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#333627] border border-[rgba(68,73,51,0.1)]">
            <IconComponent className="size-5 text-[#abd600]" />
          </div>

          <div className="min-w-0">
            <h4 className="truncate font-headline-lg text-lg font-semibold text-[#e2e4cf]">
              {exercise.exerciseName}
            </h4>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="flex items-center gap-1 text-sm">
                <span className="font-metric-lg text-[#e2e4cf]">
                  {exercise.targetSets}
                </span>
                <span className="text-[#444933]">&times;</span>
                <span className="font-metric-lg text-[#e2e4cf]">
                  {exercise.targetReps}
                </span>
              </span>
              <span className="text-[#444933]">|</span>
              <span className="flex items-center gap-1 text-sm">
                <span className="font-metric-lg text-[#e2e4cf]">
                  {exercise.targetWeight}
                </span>
                <span className="text-[#c4c9ac]">kg</span>
              </span>
            </div>
          </div>
        </div>

        {/* Set summary */}
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-2xl font-bold tabular-nums leading-none text-[#e2e4cf]">
            {exercise.targetSets}
          </span>
          <span className="mt-1 font-label-caps text-[10px] font-medium uppercase tracking-wider text-[#c4c9ac]">
            sets
          </span>
        </div>
      </div>
    </div>
  );
}

export function ExercisePreviewCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-[rgba(68,73,51,0.2)] bg-[rgba(9,9,11,0.5)] p-5"
      style={{ backdropFilter: "blur(24px)" }}
    >
      <div className="flex items-center gap-4">
        <div className="size-12 animate-pulse rounded-lg bg-[#333627]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-[#282b1d]" />
          <div className="h-3 w-24 animate-pulse rounded bg-[#1e2113]" />
        </div>
        <div className="space-y-1">
          <div className="h-7 w-8 animate-pulse rounded bg-[#282b1d]" />
          <div className="h-2.5 w-8 animate-pulse rounded bg-[#1e2113]" />
        </div>
      </div>
    </div>
  );
}
