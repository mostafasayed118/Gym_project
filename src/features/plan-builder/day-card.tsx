"use client";

import { useState } from "react";
import { useFieldArray, useWatch, type Control, type FieldErrors } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  ChevronDown,
  Dumbbell,
} from "lucide-react";
import { ExerciseRow } from "./exercise-row";
import { DAY_OPTIONS, type PlanBuilderFormValues } from "./schema";
import { cn } from "@/lib/utils";

interface DayCardProps {
  control: Control<PlanBuilderFormValues>;
  errors: FieldErrors<PlanBuilderFormValues>;
  dayIndex: number;
  onRemoveDay: () => void;
  canRemoveDay: boolean;
  usedDays: Set<string>;
  onFieldChange: (path: string, value: string | number) => void;
}

export function DayCard({
  control,
  errors,
  dayIndex,
  onRemoveDay,
  canRemoveDay,
  usedDays,
  onFieldChange,
}: DayCardProps) {
  const [isOpen, setIsOpen] = useState(dayIndex === 0);
  const { fields, append, remove } = useFieldArray({
    control,
    name: `days.${dayIndex}.exercises`,
  });

  const prefix = `days.${dayIndex}` as const;
  const dayOfWeek = useWatch({ control, name: `${prefix}.dayOfWeek` });
  const exercises = useWatch({ control, name: `${prefix}.exercises` });

  const dayError = errors.days?.[dayIndex];
  const totalSets = (exercises ?? []).reduce(
    (sum, ex) => sum + (ex?.targetSets ?? 0),
    0,
  );
  const exerciseCount = fields.length;

  const availableDays = DAY_OPTIONS.filter(
    (d) => !usedDays.has(d.value) || d.value === dayOfWeek,
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border transition-all duration-200",
        isOpen
          ? "border-zinc-700/60 bg-zinc-900/40"
          : "border-zinc-800/50 bg-zinc-900/20 hover:border-zinc-700/50",
      )}
    >
      {/* Header — always visible, clickable to toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-900/30"
      >
        {/* Day icon */}
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
            isOpen
              ? "bg-[oklch(0.85_0.2_145/0.15)] text-[oklch(0.85_0.2_145)]"
              : "bg-zinc-800/60 text-muted-foreground",
          )}
        >
          <Dumbbell className="size-4.5" />
        </div>

        {/* Day name + summary */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight">
              {dayOfWeek}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
            {" · "}
            {totalSets} total sets
          </p>
        </div>

        {/* Remove day */}
        {canRemoveDay && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveDay();
            }}
            aria-label={`Remove ${dayOfWeek}`}
            className="shrink-0 text-zinc-600 hover:text-red-400"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}

        {/* Chevron */}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="border-t border-zinc-800/40 px-4 pb-4 pt-3">
          {/* Day selector */}
          <div className="mb-3">
            <Select
              value={dayOfWeek}
              onValueChange={(val) => {
                if (val) {
                  onFieldChange(`${prefix}.dayOfWeek`, val);
                }
              }}
            >
              <SelectTrigger className="h-10 w-full max-w-[200px] border-zinc-800/50 bg-zinc-950/50 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableDays.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dayError?.dayOfWeek && (
              <p className="mt-1 text-[11px] text-red-400">
                {dayError.dayOfWeek.message}
              </p>
            )}
          </div>

          {/* Exercise list */}
          <div className="flex flex-col gap-2">
            {fields.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/60 py-8 text-center">
                <Dumbbell className="mb-2 size-6 text-zinc-700" />
                <p className="text-xs text-muted-foreground">
                  No exercises yet
                </p>
              </div>
            )}

            {fields.map((field, exerciseIndex) => (
              <ExerciseRow
                key={field.id}
                control={control}
                errors={errors}
                dayIndex={dayIndex}
                exerciseIndex={exerciseIndex}
                onRemove={() => remove(exerciseIndex)}
                canRemove={fields.length > 1}
                isLast={exerciseIndex === fields.length - 1}
                onFieldChange={onFieldChange}
              />
            ))}
          </div>

          {/* Add exercise — dashed drop zone */}
          <button
            type="button"
            onClick={() =>
              append({
                name: "",
                targetSets: 3,
                targetReps: 10,
                targetWeight: 0,
              })
            }
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-800/60 py-3 text-sm text-muted-foreground transition-all hover:border-[oklch(0.85_0.2_145)/0.3] hover:bg-[oklch(0.85_0.2_145)/0.03] hover:text-[oklch(0.85_0.2_145)]"
          >
            <Plus className="size-4" />
            Add Exercise
          </button>
        </div>
      )}
    </div>
  );
}
