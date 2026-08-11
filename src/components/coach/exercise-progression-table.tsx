"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ExerciseData {
  name: string;
  lastWeight: number;
  maxWeight: number;
  estimated1RM: number;
  totalVolume: number;
  trend: "up" | "down";
}

interface ExerciseProgressionTableProps {
  exercises: ExerciseData[];
}

export function ExerciseProgressionTable({
  exercises,
}: ExerciseProgressionTableProps) {
  if (exercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No exercise data yet. Complete some workouts to see progression.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800/60 hover:bg-transparent">
            <TableHead className="font-semibold text-muted-foreground">
              Exercise
            </TableHead>
            <TableHead className="text-right font-semibold text-muted-foreground">
              Last Weight
            </TableHead>
            <TableHead className="text-right font-semibold text-muted-foreground">
              Est. 1RM
            </TableHead>
            <TableHead className="text-right font-semibold text-muted-foreground">
              Trend
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exercises.map((exercise) => (
            <TableRow
              key={exercise.name}
              className="border-zinc-800/40 transition-colors hover:bg-zinc-900/30"
            >
              <TableCell>
                <span className="font-medium">{exercise.name}</span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {exercise.lastWeight}kg
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <span className="font-bold text-[oklch(0.85_0.2_145)]">
                  {exercise.estimated1RM}
                </span>
                <span className="ml-0.5 text-xs text-muted-foreground">kg</span>
              </TableCell>
              <TableCell className="text-right">
                <Badge
                  variant="outline"
                  className={cn(
                    "border px-2 py-0.5 text-xs font-medium",
                    exercise.trend === "up"
                      ? "border-[oklch(0.85_0.2_145)/0.2] bg-[oklch(0.85_0.2_145)/0.1] text-[oklch(0.85_0.2_145)]"
                      : "border-red-500/20 bg-red-500/10 text-red-400",
                  )}
                >
                  {exercise.trend === "up" ? (
                    <TrendingUp className="mr-1 inline size-3" />
                  ) : (
                    <TrendingDown className="mr-1 inline size-3" />
                  )}
                  {exercise.trend === "up" ? "PR" : "Gap"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ExerciseProgressionTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border border-zinc-800/40 bg-zinc-900/20 p-3"
        >
          <div className="h-4 w-32 animate-pulse rounded bg-zinc-800/60" />
          <div className="flex items-center gap-4">
            <div className="h-4 w-12 animate-pulse rounded bg-zinc-800/60" />
            <div className="h-4 w-12 animate-pulse rounded bg-zinc-800/60" />
            <div className="h-5 w-14 animate-pulse rounded-full bg-zinc-800/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
