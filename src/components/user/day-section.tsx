import { ExerciseCard } from "./exercise-card";
import type { DayPlan } from "@/hooks/use-active-plan";

interface DaySectionProps {
  day: DayPlan;
  isToday: boolean;
}

export function DaySection({ day, isToday }: DaySectionProps) {
  return (
    <div className="flex flex-col gap-3">
      {isToday && (
        <p className="text-primary text-xs font-medium uppercase tracking-wider">
          Today&apos;s Workout
        </p>
      )}
      {day.exercises.map((exercise) => (
        <ExerciseCard key={exercise._id} exercise={exercise} />
      ))}
    </div>
  );
}
