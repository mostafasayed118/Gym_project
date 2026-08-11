"use client";

import { useState, useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  ArrowLeft,
  Calendar,
  FileText,
  Save,
  Eye,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DayCard } from "./day-card";
import {
  DAY_OPTIONS,
  planBuilderSchema,
  type PlanBuilderFormValues,
} from "./schema";
import { cn } from "@/lib/utils";

const DEFAULT_VALUES: PlanBuilderFormValues = {
  title: "",
  description: "",
  clientId: "",
  startDate: "",
  endDate: "",
  days: [
    {
      dayOfWeek: "Monday",
      exercises: [{ name: "", targetSets: 3, targetReps: 10, targetWeight: 0 }],
    },
  ],
};

function PlanPreview({
  formValues,
}: {
  formValues: {
    title: string;
    description: string;
    days: {
      dayOfWeek: string;
      exercises: {
        name: string;
        targetSets: number;
        targetReps: number;
        targetWeight: number;
      }[];
    }[];
  };
}) {
  const daysWithExercises = formValues.days.filter(
    (d) => d.exercises.some((e) => e.name.trim() !== ""),
  );

  const totalExercises = daysWithExercises.reduce(
    (sum, d) => sum + d.exercises.filter((e) => e.name.trim() !== "").length,
    0,
  );
  const totalSets = daysWithExercises.reduce(
    (sum, d) =>
      sum +
      d.exercises
        .filter((e) => e.name.trim() !== "")
        .reduce((s, e) => s + e.targetSets, 0),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Plan title */}
      <div>
        <h3 className="text-lg font-bold tracking-tight">
          {formValues.title || "Untitled Plan"}
        </h3>
        {formValues.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {formValues.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-3 text-center">
          <p className="text-xl font-bold tabular-nums">
            {daysWithExercises.length}
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Days
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-3 text-center">
          <p className="text-xl font-bold tabular-nums">{totalExercises}</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Exercises
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-3 text-center">
          <p className="text-xl font-bold tabular-nums">{totalSets}</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Total Sets
          </p>
        </div>
      </div>

      {/* Day breakdown */}
      {daysWithExercises.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Preview
          </p>
          {daysWithExercises.map((day, i) => {
            const validExercises = day.exercises.filter(
              (e) => e.name.trim() !== "",
            );
            return (
              <div
                key={i}
                className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{day.dayOfWeek}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {validExercises.length} exercises
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  {validExercises.map((ex, j) => (
                    <div
                      key={j}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="truncate text-muted-foreground">
                        {ex.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-zinc-500">
                        {ex.targetSets}&times;{ex.targetReps} @ {ex.targetWeight}kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {daysWithExercises.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/60 py-8 text-center">
          <Eye className="mb-2 size-5 text-zinc-700" />
          <p className="text-xs text-muted-foreground">
            Start building to see a live preview
          </p>
        </div>
      )}
    </div>
  );
}

export function PlanBuilderForm({
  preselectedClientId,
}: {
  preselectedClientId?: string;
}) {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const createPlan = useMutation(api.plans.createPlanWithItems);

  const convexUser = useQuery(
    api.auth.getUserByClerkId,
    clerkUser ? { clerkId: clerkUser.id } : "skip",
  );

  const clients = useQuery(
    api.users.getCoachClients,
    convexUser ? { coachId: convexUser._id } : "skip",
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<PlanBuilderFormValues>({
    resolver: zodResolver(planBuilderSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      clientId: preselectedClientId ?? "",
    },
  });

  const { fields: dayFields, append: appendDay, remove: removeDay } =
    useFieldArray({
      control,
      name: "days",
    });

  const formValues = useWatch({ control }) as PlanBuilderFormValues;

  const previewData = useMemo(
    () => ({
      title: formValues?.title ?? "",
      description: formValues?.description ?? "",
      days: (formValues?.days ?? []).map((d) => ({
        dayOfWeek: d?.dayOfWeek ?? "",
        exercises: (d?.exercises ?? []).map((e) => ({
          name: e?.name ?? "",
          targetSets: e?.targetSets ?? 0,
          targetReps: e?.targetReps ?? 0,
          targetWeight: e?.targetWeight ?? 0,
        })),
      })),
    }),
    [formValues],
  );

  // Path-driven controlled field updates from <DayCard>. Goes through the
  // public `setValue` API only. Closes BUG-038: prior implementation reached
  // into `control._formValues` (RHF's private state), which silently breaks
  // across minor releases and bypasses RHF's change tracking.
  function handleFieldChange(path: string, value: string | number) {
    // path format: "days.0.dayOfWeek" or "days.0.exercises.0.name"
    const match = path.match(/^days\.(\d+)\.dayOfWeek$/);
    if (match?.[1] !== undefined) {
      const idx = parseInt(match[1], 10);
      setValue(`days.${idx}.dayOfWeek`, String(value), { shouldValidate: true });
      return;
    }

    const exMatch = path.match(/^days\.(\d+)\.exercises\.(\d+)\.(\w+)$/);
    if (exMatch?.[1] !== undefined && exMatch?.[2] !== undefined && exMatch?.[3] !== undefined) {
      const idx = parseInt(exMatch[1], 10);
      const eIdx = parseInt(exMatch[2], 10);
      const field = exMatch[3];
      const numericFields = ["targetSets", "targetReps", "targetWeight"];
      const val = numericFields.includes(field) ? Number(value) : String(value);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue(`days.${idx}.exercises.${eIdx}.${field}` as any, val, {
        shouldValidate: true,
      });
    }
  }

  async function onSubmit(data: PlanBuilderFormValues) {
    if (!convexUser) return;

    setIsSubmitting(true);
    try {
      const exercises = data.days.flatMap((day) =>
        day.exercises
          .filter((ex) => ex.name.trim() !== "")
          .map((ex) => ({
            name: ex.name,
            dayOfWeek: day.dayOfWeek,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            targetWeight: ex.targetWeight,
          })),
      );

      await createPlan({
        coachId: convexUser._id,
        clientId: data.clientId as never,
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        exercises,
      });

      toast.success("Workout plan created!");
      router.push("/coach/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create plan",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Read selected day values through the public API. Closes BUG-038.
  const selectedDays = dayFields
    .map((_, i) => getValues(`days.${i}.dayOfWeek`))
    .filter((d): d is string => typeof d === "string" && d.length > 0);
  const usedDays = new Set(selectedDays);

  function handleAddDay() {
    const nextDay = DAY_OPTIONS.find((d) => !usedDays.has(d.value))?.value;
    appendDay({
      dayOfWeek: nextDay ?? "Monday",
      exercises: [
        { name: "", targetSets: 3, targetReps: 10, targetWeight: 0 },
      ],
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex min-h-screen flex-col bg-zinc-950 pb-24"
    >
      {/* Sticky header */}
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
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold tracking-tight">
              Create Plan
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Design a workout program
            </p>
          </div>
        </div>
      </header>

      {/* Main content — responsive split */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Form inputs */}
        <div className="flex flex-1 flex-col gap-4 p-4 lg:max-w-2xl lg:p-6">
          {/* Plan Details */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Plan Details
              </h2>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-4">
              <div>
                <Label htmlFor="title" className="mb-1.5 text-xs">
                  Title
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. 8-Week Strength Block"
                  aria-invalid={!!errors.title}
                  {...register("title")}
                  className="h-11"
                />
                {errors.title && (
                  <p className="mt-1 text-[11px] text-red-400">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description" className="mb-1.5 text-xs">
                  Description
                </Label>
                <Input
                  id="description"
                  placeholder="Brief description of goals"
                  aria-invalid={!!errors.description}
                  {...register("description")}
                  className="h-11"
                />
                {errors.description && (
                  <p className="mt-1 text-[11px] text-red-400">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="clientId" className="mb-1.5 text-xs">
                  Assign to Client
                </Label>
                <Select
                  value={(formValues?.clientId as string) ?? ""}
                  onValueChange={(val) => {
                    if (val)
                      setValue("clientId", val, { shouldValidate: true });
                  }}
                >
                  <SelectTrigger
                    className="h-11 w-full"
                    aria-invalid={!!errors.clientId}
                  >
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client._id} value={client._id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && (
                  <p className="mt-1 text-[11px] text-red-400">
                    {errors.clientId.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startDate" className="mb-1.5 text-xs">
                    Start Date
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    aria-invalid={!!errors.startDate}
                    {...register("startDate")}
                    className="h-11"
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-[11px] text-red-400">
                      {errors.startDate.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="endDate" className="mb-1.5 text-xs">
                    End Date
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    aria-invalid={!!errors.endDate}
                    {...register("endDate")}
                    className="h-11"
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-[11px] text-red-400">
                      {errors.endDate.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Workout Days */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Workout Days
                </h2>
              </div>
              {errors.days?.message && (
                <p className="text-[11px] text-red-400">
                  {errors.days.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {dayFields.map((field, dayIndex) => (
                <DayCard
                  key={field.id}
                  control={control}
                  errors={errors}
                  dayIndex={dayIndex}
                  onRemoveDay={() => removeDay(dayIndex)}
                  canRemoveDay={dayFields.length > 1}
                  usedDays={usedDays}
                  onFieldChange={handleFieldChange}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddDay}
              disabled={usedDays.size >= 7}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-4 text-sm font-medium transition-all",
                usedDays.size >= 7
                  ? "cursor-not-allowed border-zinc-800/30 text-zinc-700"
                  : "border-zinc-800/60 text-muted-foreground hover:border-[oklch(0.85_0.2_145)/0.3] hover:bg-[oklch(0.85_0.2_145)/0.03] hover:text-[oklch(0.85_0.2_145)]",
              )}
            >
              <Plus className="size-4" />
              Add Day
            </button>
          </section>
        </div>

        {/* Live preview — desktop sidebar */}
        <div className="hidden border-l border-zinc-800/50 bg-zinc-900/20 lg:block lg:w-80 lg:flex-shrink-0">
          <div className="sticky top-[57px] p-6">
            <div className="mb-4 flex items-center gap-2">
              <Eye className="size-4 text-muted-foreground" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Live Preview
              </h2>
            </div>
            <PlanPreview formValues={previewData} />
          </div>
        </div>

        {/* Mobile preview — collapsible section */}
        <div className="border-t border-zinc-800/50 bg-zinc-900/20 p-4 lg:hidden">
          <div className="mb-3 flex items-center gap-2">
            <Eye className="size-4 text-muted-foreground" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Live Preview
            </h2>
          </div>
          <PlanPreview formValues={previewData} />
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/60 bg-zinc-950/90 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/coach/dashboard" />}
            className="h-12 px-4"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            disabled={isSubmitting}
            className="h-12 min-w-[140px]"
          >
            {isSubmitting ? (
              "Creating..."
            ) : (
              <>
                <Save className="size-4" />
                Save Plan
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
