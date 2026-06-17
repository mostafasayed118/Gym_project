"use client";

import { useWatch, type Control, type FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { PlanBuilderFormValues } from "./schema";

interface ExerciseRowProps {
  control: Control<PlanBuilderFormValues>;
  errors: FieldErrors<PlanBuilderFormValues>;
  dayIndex: number;
  exerciseIndex: number;
  onRemove: () => void;
  canRemove: boolean;
}

export function ExerciseRow({
  control,
  errors,
  dayIndex,
  exerciseIndex,
  onRemove,
  canRemove,
}: ExerciseRowProps) {
  const prefix = `days.${dayIndex}.exercises.${exerciseIndex}` as const;

  const nameError = errors.days?.[dayIndex]?.exercises?.[exerciseIndex]?.name;
  const setsError = errors.days?.[dayIndex]?.exercises?.[exerciseIndex]?.targetSets;
  const repsError = errors.days?.[dayIndex]?.exercises?.[exerciseIndex]?.targetReps;
  const weightError = errors.days?.[dayIndex]?.exercises?.[exerciseIndex]?.targetWeight;

  const name = useWatch({ control, name: `${prefix}.name` });

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-1 flex-wrap items-start gap-3">
        <div className="min-w-44 flex-1">
          <Label htmlFor={`${prefix}.name`} className="mb-1.5">
            Exercise
          </Label>
          <Input
            id={`${prefix}.name`}
            placeholder="e.g. Bench Press"
            aria-invalid={!!nameError}
            {...control.register(`${prefix}.name`)}
          />
          {nameError && (
            <p className="text-destructive mt-1 text-xs">{nameError.message}</p>
          )}
        </div>

        <div className="w-20">
          <Label htmlFor={`${prefix}.targetSets`} className="mb-1.5">
            Sets
          </Label>
          <Input
            id={`${prefix}.targetSets`}
            type="number"
            min={1}
            max={100}
            placeholder="3"
            aria-invalid={!!setsError}
            {...control.register(`${prefix}.targetSets`, { valueAsNumber: true })}
          />
          {setsError && (
            <p className="text-destructive mt-1 text-xs">{setsError.message}</p>
          )}
        </div>

        <div className="w-20">
          <Label htmlFor={`${prefix}.targetReps`} className="mb-1.5">
            Reps
          </Label>
          <Input
            id={`${prefix}.targetReps`}
            type="number"
            min={1}
            max={1000}
            placeholder="10"
            aria-invalid={!!repsError}
            {...control.register(`${prefix}.targetReps`, { valueAsNumber: true })}
          />
          {repsError && (
            <p className="text-destructive mt-1 text-xs">{repsError.message}</p>
          )}
        </div>

        <div className="w-24">
          <Label htmlFor={`${prefix}.targetWeight`} className="mb-1.5">
            Weight (kg)
          </Label>
          <Input
            id={`${prefix}.targetWeight`}
            type="number"
            min={0}
            max={9999}
            step={0.5}
            placeholder="60"
            aria-invalid={!!weightError}
            {...control.register(`${prefix}.targetWeight`, { valueAsNumber: true })}
          />
          {weightError && (
            <p className="text-destructive mt-1 text-xs">{weightError.message}</p>
          )}
        </div>
      </div>

      {canRemove && (
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          className="mt-6"
          onClick={onRemove}
          aria-label={`Remove ${name ?? "exercise"}`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
