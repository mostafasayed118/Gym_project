"use client";

import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetInputProps {
  setIndex: number;
  targetWeight: number;
  targetReps: number;
  actualWeight: number;
  actualReps: number;
  isCompleted: boolean;
  onWeightChange: (value: number) => void;
  onRepsChange: (value: number) => void;
  onComplete: () => void;
}

export const SetInput = memo(function SetInput({
  setIndex,
  targetWeight,
  targetReps,
  actualWeight,
  actualReps,
  isCompleted,
  onWeightChange,
  onRepsChange,
  onComplete,
}: SetInputProps) {
  const handleWeightStep = useCallback(
    (delta: number) => {
      const next = Math.max(0, Math.round((actualWeight + delta) * 10) / 10);
      onWeightChange(next);
    },
    [actualWeight, onWeightChange],
  );

  const handleRepsStep = useCallback(
    (delta: number) => {
      const next = Math.max(0, actualReps + delta);
      onRepsChange(next);
    },
    [actualReps, onRepsChange],
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border p-2 transition-colors",
        isCompleted
          ? "border-green-500/30 bg-green-500/5"
          : "border-border",
      )}
    >
      <span className="text-muted-foreground w-6 text-center text-xs font-medium">
        {setIndex + 1}
      </span>

      <div className="flex flex-1 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleWeightStep(-2.5)}
          aria-label="Decrease weight"
        >
          <Minus className="size-3" />
        </Button>
        <div className="relative flex-1">
          <Input
            type="number"
            min={0}
            step={0.5}
            value={actualWeight || ""}
            onChange={(e) => onWeightChange(Number(e.target.value) || 0)}
            placeholder={`${targetWeight}`}
            className="h-9 w-full text-center text-sm tabular-nums"
            aria-label={`Weight for set ${setIndex + 1}`}
          />
          <span className="text-muted-foreground pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs">
            kg
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleWeightStep(2.5)}
          aria-label="Increase weight"
        >
          <Plus className="size-3" />
        </Button>
      </div>

      <span className="text-muted-foreground text-xs">&times;</span>

      <div className="flex flex-1 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleRepsStep(-1)}
          aria-label="Decrease reps"
        >
          <Minus className="size-3" />
        </Button>
        <div className="relative flex-1">
          <Input
            type="number"
            min={0}
            value={actualReps || ""}
            onChange={(e) => onRepsChange(Number(e.target.value) || 0)}
            placeholder={`${targetReps}`}
            className="h-9 w-full text-center text-sm tabular-nums"
            aria-label={`Reps for set ${setIndex + 1}`}
          />
          <span className="text-muted-foreground pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs">
            reps
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleRepsStep(1)}
          aria-label="Increase reps"
        >
          <Plus className="size-3" />
        </Button>
      </div>

      <Button
        variant={isCompleted ? "default" : "outline"}
        size="icon-sm"
        onClick={onComplete}
        disabled={actualWeight === 0 && actualReps === 0}
        className={cn(
          "shrink-0 transition-colors",
          isCompleted && "bg-green-600 hover:bg-green-700",
        )}
        aria-label={isCompleted ? `Set ${setIndex + 1} completed` : `Complete set ${setIndex + 1}`}
      >
        <Check className="size-4" />
      </Button>
    </div>
  );
});

export function SetInputSkeleton() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-2">
      <div className="bg-muted size-6 animate-pulse rounded" />
      <div className="flex flex-1 items-center gap-1">
        <div className="bg-muted size-7 animate-pulse rounded" />
        <div className="bg-muted h-9 flex-1 animate-pulse rounded" />
        <div className="bg-muted size-7 animate-pulse rounded" />
      </div>
      <div className="bg-muted size-4 animate-pulse rounded" />
      <div className="flex flex-1 items-center gap-1">
        <div className="bg-muted size-7 animate-pulse rounded" />
        <div className="bg-muted h-9 flex-1 animate-pulse rounded" />
        <div className="bg-muted size-7 animate-pulse rounded" />
      </div>
      <div className="bg-muted size-7 animate-pulse rounded" />
    </div>
  );
}
