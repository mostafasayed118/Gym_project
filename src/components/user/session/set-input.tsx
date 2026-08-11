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
          ? "border-[#abd600]/30 bg-[#abd600]/5"
          : "border-[rgba(68,73,51,0.2)] bg-[rgba(9,9,11,0.3)]",
      )}
    >
      <span className="text-[#c4c9ac] w-6 text-center text-xs font-medium font-label-caps">
        {setIndex + 1}
      </span>

      <div className="flex flex-1 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleWeightStep(-2.5)}
          aria-label="Decrease weight"
          className="bg-[#282b1d] hover:bg-[#333627] border border-[rgba(68,73,51,0.2)]"
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
            className="h-9 w-full text-center text-sm tabular-nums font-metric-lg bg-[#09090b] border-[#444933]/40 focus:border-[#abd600]"
            aria-label={`Weight for set ${setIndex + 1}`}
          />
          <span className="text-[#c4c9ac] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-label-caps">
            kg
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleWeightStep(2.5)}
          aria-label="Increase weight"
          className="bg-[#282b1d] hover:bg-[#333627] border border-[rgba(68,73,51,0.2)]"
        >
          <Plus className="size-3" />
        </Button>
      </div>

      <span className="text-[#444933] text-xs">&times;</span>

      <div className="flex flex-1 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleRepsStep(-1)}
          aria-label="Decrease reps"
          className="bg-[#282b1d] hover:bg-[#333627] border border-[rgba(68,73,51,0.2)]"
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
            className="h-9 w-full text-center text-sm tabular-nums font-metric-lg bg-[#09090b] border-[#444933]/40 focus:border-[#abd600]"
            aria-label={`Reps for set ${setIndex + 1}`}
          />
          <span className="text-[#c4c9ac] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-label-caps">
            reps
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleRepsStep(1)}
          aria-label="Increase reps"
          className="bg-[#282b1d] hover:bg-[#333627] border border-[rgba(68,73,51,0.2)]"
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
          isCompleted && "bg-[#abd600] hover:bg-[#abd600]/90 text-[#09090b]",
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
    <div className="flex items-center gap-2 rounded-lg border border-[rgba(68,73,51,0.2)] bg-[rgba(9,9,11,0.3)] p-2">
      <div className="bg-[#282b1d] size-6 animate-pulse rounded" />
      <div className="flex flex-1 items-center gap-1">
        <div className="bg-[#282b1d] size-7 animate-pulse rounded" />
        <div className="bg-[#282b1d] h-9 flex-1 animate-pulse rounded" />
        <div className="bg-[#282b1d] size-7 animate-pulse rounded" />
      </div>
      <div className="bg-[#444933] size-4 animate-pulse rounded" />
      <div className="flex flex-1 items-center gap-1">
        <div className="bg-[#282b1d] size-7 animate-pulse rounded" />
        <div className="bg-[#282b1d] h-9 flex-1 animate-pulse rounded" />
        <div className="bg-[#282b1d] size-7 animate-pulse rounded" />
      </div>
      <div className="bg-[#282b1d] size-7 animate-pulse rounded" />
    </div>
  );
}
