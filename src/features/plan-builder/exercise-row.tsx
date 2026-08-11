"use client";

import { useWatch, type Control, type FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanBuilderFormValues } from "./schema";

interface ExerciseRowProps {
  control: Control<PlanBuilderFormValues>;
  errors: FieldErrors<PlanBuilderFormValues>;
  dayIndex: number;
  exerciseIndex: number;
  onRemove: () => void;
  canRemove: boolean;
  isLast: boolean;
  onFieldChange: (path: string, value: string | number) => void;
}

export function ExerciseRow({
  control,
  errors,
  dayIndex,
  exerciseIndex,
  onRemove,
  canRemove,
  isLast,
  onFieldChange,
}: ExerciseRowProps) {
  const prefix = `days.${dayIndex}.exercises.${exerciseIndex}` as const;

  const nameError = errors.days?.[dayIndex]?.exercises?.[exerciseIndex]?.name;
  const setsError = errors.days?.[dayIndex]?.exercises?.[exerciseIndex]?.targetSets;
  const repsError = errors.days?.[dayIndex]?.exercises?.[exerciseIndex]?.targetReps;
  const weightError = errors.days?.[dayIndex]?.exercises?.[exerciseIndex]?.targetWeight;

  const name = useWatch({ control, name: `${prefix}.name` });

  return (
    <div
      className={cn(
        "group/row flex items-center gap-2 rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-2 py-2 transition-colors hover:border-zinc-700/50 hover:bg-zinc-900/50",
        isLast && "mb-0",
      )}
    >
      {/* Drag handle */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-700 transition-colors group-hover/row:text-zinc-500">
        <GripVertical className="size-4" />
      </div>

      {/* Exercise name */}
      <div className="min-w-0 flex-1">
        <input type="hidden" {...control.register(`${prefix}.name`)} />
        <Input
          placeholder="Exercise name"
          value={name ?? ""}
          onChange={(e) => {
            onFieldChange(`${prefix}.name`, e.target.value);
          }}
          className={cn(
            "h-10 border-0 bg-transparent px-2 text-sm font-medium placeholder:text-zinc-600 focus-visible:ring-0",
            nameError && "placeholder:text-red-400/50",
          )}
        />
        {nameError && (
          <p className="mt-0.5 px-2 text-[11px] text-red-400">
            {nameError.message}
          </p>
        )}
      </div>

      {/* Sets / Reps / Weight — grouped unit */}
      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-1">
        {/* Sets */}
        <div className="flex flex-col items-center">
          <Input
            type="number"
            min={1}
            max={100}
            placeholder="3"
            aria-invalid={!!setsError}
            {...control.register(`${prefix}.targetSets`, {
              valueAsNumber: true,
            })}
            className={cn(
              "h-9 w-12 border-0 bg-transparent px-0 text-center text-sm font-bold tabular-nums placeholder:text-zinc-700 focus-visible:ring-0",
              setsError && "placeholder:text-red-400/50",
            )}
          />
          <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-600">
            Sets
          </span>
        </div>

        <div className="text-zinc-700">&times;</div>

        {/* Reps */}
        <div className="flex flex-col items-center">
          <Input
            type="number"
            min={1}
            max={1000}
            placeholder="10"
            aria-invalid={!!repsError}
            {...control.register(`${prefix}.targetReps`, {
              valueAsNumber: true,
            })}
            className={cn(
              "h-9 w-12 border-0 bg-transparent px-0 text-center text-sm font-bold tabular-nums placeholder:text-zinc-700 focus-visible:ring-0",
              repsError && "placeholder:text-red-400/50",
            )}
          />
          <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-600">
            Reps
          </span>
        </div>

        <div className="text-zinc-700">@</div>

        {/* Weight */}
        <div className="flex flex-col items-center">
          <Input
            type="number"
            min={0}
            max={9999}
            step={0.5}
            placeholder="0"
            aria-invalid={!!weightError}
            {...control.register(`${prefix}.targetWeight`, {
              valueAsNumber: true,
            })}
            className={cn(
              "h-9 w-14 border-0 bg-transparent px-0 text-center text-sm font-bold tabular-nums placeholder:text-zinc-700 focus-visible:ring-0",
              weightError && "placeholder:text-red-400/50",
            )}
          />
          <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-600">
            kg
          </span>
        </div>
      </div>

      {/* Remove */}
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={`Remove ${name ?? "exercise"}`}
          className="shrink-0 text-zinc-700 opacity-0 transition-opacity hover:text-red-400 group-hover/row:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
