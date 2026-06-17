import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell } from "lucide-react";
import type { ExerciseItem } from "@/hooks/use-active-plan";

interface ExerciseCardProps {
  exercise: ExerciseItem;
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-4">
        <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Dumbbell className="text-primary size-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="truncate font-medium">{exercise.exerciseName}</h4>
          <p className="text-muted-foreground text-xs">
            {exercise.targetSets} sets &middot; {exercise.targetReps} reps
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-lg font-bold tabular-nums">
            {exercise.targetWeight}
          </span>
          <span className="text-muted-foreground block text-xs">kg</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExerciseCardSkeleton() {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-4">
        <div className="bg-muted size-10 shrink-0 animate-pulse rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="bg-muted h-4 w-32 animate-pulse rounded" />
          <div className="bg-muted h-3 w-24 animate-pulse rounded" />
        </div>
        <div className="text-right space-y-1">
          <div className="bg-muted h-6 w-10 animate-pulse rounded ml-auto" />
          <div className="bg-muted h-3 w-6 animate-pulse rounded ml-auto" />
        </div>
      </CardContent>
    </Card>
  );
}
