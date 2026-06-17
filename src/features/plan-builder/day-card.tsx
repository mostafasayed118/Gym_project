"use client";

import { useFieldArray, type Control, type FieldErrors } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { ExerciseRow } from "./exercise-row";
import type { PlanBuilderFormValues } from "./schema";

interface DayCardProps {
  control: Control<PlanBuilderFormValues>;
  errors: FieldErrors<PlanBuilderFormValues>;
  dayIndex: number;
  onRemoveDay: () => void;
  canRemoveDay: boolean;
}

export function DayCard({
  control,
  errors,
  dayIndex,
  onRemoveDay,
  canRemoveDay,
}: DayCardProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `days.${dayIndex}.exercises`,
  });

  const dayError = errors.days?.[dayIndex];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Day {dayIndex + 1}</CardTitle>
            {dayError?.dayOfWeek && (
              <Badge variant="destructive">{dayError.dayOfWeek.message}</Badge>
            )}
          </div>
          {canRemoveDay && (
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              onClick={onRemoveDay}
              aria-label={`Remove Day ${dayIndex + 1}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {fields.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No exercises yet. Add one below.
          </p>
        )}

        {fields.map((field, exerciseIndex) => (
          <div key={field.id}>
            {exerciseIndex > 0 && <hr className="border-border my-3" />}
            <ExerciseRow
              control={control}
              errors={errors}
              dayIndex={dayIndex}
              exerciseIndex={exerciseIndex}
              onRemove={() => remove(exerciseIndex)}
              canRemove={fields.length > 1}
            />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 self-start"
          onClick={() =>
            append({ name: "", targetSets: 3, targetReps: 10, targetWeight: 0 })
          }
        >
          <Plus className="size-3.5" />
          Add Exercise
        </Button>
      </CardContent>
    </Card>
  );
}
