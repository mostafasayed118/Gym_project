import { z } from "zod";

export const exerciseSchema = z.object({
  name: z
    .string()
    .min(1, "Exercise name is required")
    .max(100, "Exercise name is too long"),
  targetSets: z
    .number({ message: "Sets must be a number" })
    .int("Sets must be a whole number")
    .min(1, "At least 1 set required")
    .max(100, "Max 100 sets"),
  targetReps: z
    .number({ message: "Reps must be a number" })
    .int("Reps must be a whole number")
    .min(1, "At least 1 rep required")
    .max(1000, "Max 1000 reps"),
  targetWeight: z
    .number({ message: "Weight must be a number" })
    .min(0, "Weight cannot be negative")
    .max(9999, "Max weight is 9999"),
});

export const daySchema = z.object({
  dayOfWeek: z.string().min(1, "Select a day"),
  exercises: z
    .array(exerciseSchema)
    .min(1, "Add at least one exercise"),
});

export const planBuilderSchema = z.object({
  title: z
    .string()
    .min(1, "Plan title is required")
    .max(100, "Title is too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description is too long"),
  clientId: z.string().min(1, "Select a client"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  days: z
    .array(daySchema)
    .min(1, "Add at least one day")
    .refine(
      (days) => {
        const dayNames = days.map((d) => d.dayOfWeek);
        return new Set(dayNames).size === dayNames.length;
      },
      { message: "Each day must be unique" },
    ),
});

export type ExerciseFormValues = z.infer<typeof exerciseSchema>;
export type DayFormValues = z.infer<typeof daySchema>;
export type PlanBuilderFormValues = z.infer<typeof planBuilderSchema>;

export const DAY_OPTIONS = [
  { value: "Monday", label: "Monday" },
  { value: "Tuesday", label: "Tuesday" },
  { value: "Wednesday", label: "Wednesday" },
  { value: "Thursday", label: "Thursday" },
  { value: "Friday", label: "Friday" },
  { value: "Saturday", label: "Saturday" },
  { value: "Sunday", label: "Sunday" },
] as const;
