"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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

export function PlanBuilderForm() {
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
    formState: { errors },
  } = useForm<PlanBuilderFormValues>({
    resolver: zodResolver(planBuilderSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { fields: dayFields, append: appendDay, remove: removeDay } = useFieldArray({
    control,
    name: "days",
  });

  async function onSubmit(data: PlanBuilderFormValues) {
    if (!convexUser) return;

    setIsSubmitting(true);
    try {
      const exercises = data.days.flatMap((day) =>
        day.exercises.map((ex) => ({
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

      toast.success("Workout plan created successfully!");
      router.push("/coach/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create plan",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedDays = dayFields.map((_, i) => {
    const val = control._formValues.days?.[i]?.dayOfWeek;
    return val as string | undefined;
  });

  const usedDays = new Set(selectedDays.filter(Boolean));

  function handleAddDay() {
    const nextDay = DAY_OPTIONS.find((d) => !usedDays.has(d.value))?.value;
    appendDay({
      dayOfWeek: nextDay ?? "Monday",
      exercises: [{ name: "", targetSets: 3, targetReps: 10, targetWeight: 0 }],
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href="/coach/dashboard" />}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Workout Plan</h1>
          <p className="text-muted-foreground text-sm">
            Design a custom workout plan for your client.
          </p>
        </div>
      </div>

      {/* Plan Details */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Plan Details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title" className="mb-1.5">
                Plan Title
              </Label>
              <Input
                id="title"
                placeholder="e.g. 8-Week Strength Program"
                aria-invalid={!!errors.title}
                {...register("title")}
              />
              {errors.title && (
                <p className="text-destructive mt-1 text-xs">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description" className="mb-1.5">
                Description
              </Label>
              <Input
                id="description"
                placeholder="Brief description of the plan goals"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-destructive mt-1 text-xs">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="clientId" className="mb-1.5">
                Assign to Client
              </Label>
              <Select
                value={(control._formValues.clientId as string) ?? ""}
                onValueChange={(val) => {
                  if (val) setValue("clientId", val, { shouldValidate: true });
                }}
              >
                <SelectTrigger
                  id="clientId"
                  className="w-full"
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
                <p className="text-destructive mt-1 text-xs">
                  {errors.clientId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startDate" className="mb-1.5">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  aria-invalid={!!errors.startDate}
                  {...register("startDate")}
                />
                {errors.startDate && (
                  <p className="text-destructive mt-1 text-xs">
                    {errors.startDate.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="endDate" className="mb-1.5">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  aria-invalid={!!errors.endDate}
                  {...register("endDate")}
                />
                {errors.endDate && (
                  <p className="text-destructive mt-1 text-xs">
                    {errors.endDate.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Days */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Workout Days</h2>
          {errors.days?.message && (
            <p className="text-destructive text-xs">{errors.days.message}</p>
          )}
        </div>

        {dayFields.map((field, dayIndex) => (
          <DayCard
            key={field.id}
            control={control}
            errors={errors}
            dayIndex={dayIndex}
            onRemoveDay={() => removeDay(dayIndex)}
            canRemoveDay={dayFields.length > 1}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={handleAddDay}
          disabled={usedDays.size >= 7}
        >
          <Plus className="size-4" />
          Add Day
        </Button>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 border-t pt-6">
        <Button
          type="button"
          variant="outline"
          render={<Link href="/coach/dashboard" />}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Plan"}
        </Button>
      </div>
    </form>
  );
}
