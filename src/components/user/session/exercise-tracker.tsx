"use client";

import { memo, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell } from "lucide-react";
import { SetInput, SetInputSkeleton } from "./set-input";
import type { Id } from "@convex/_generated/dataModel";

interface LoggedSet {
  setIndex: number;
  actualWeight: number;
  actualReps: number;
}

interface ExerciseData {
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
}

interface ExerciseTrackerProps {
  sessionId: Id<"sessions">;
  exercise: ExerciseData;
  loggedSets: LoggedSet[];
}

export const ExerciseTracker = memo(function ExerciseTracker({
  sessionId,
  exercise,
  loggedSets,
}: ExerciseTrackerProps) {
  const logSet = useMutation(api.sessions.logSet);

  const completedCount = loggedSets.length;

  const localSets = useMemo(() => {
    return Array.from({ length: exercise.targetSets }, (_, i) => {
      const logged = loggedSets.find((s) => s.setIndex === i);
      return {
        setIndex: i,
        actualWeight: logged?.actualWeight ?? exercise.targetWeight,
        actualReps: logged?.actualReps ?? exercise.targetReps,
        isCompleted: !!logged,
      };
    });
  }, [exercise.targetSets, exercise.targetWeight, exercise.targetReps, loggedSets]);

  const handleComplete = useCallback(
    async (setIndex: number, weight: number, reps: number) => {
      try {
        await logSet({
          sessionId,
          exerciseName: exercise.name,
          setIndex,
          targetWeight: exercise.targetWeight,
          targetReps: exercise.targetReps,
          actualWeight: weight,
          actualReps: reps,
        });
      } catch {
        // Optimistic UI will roll back via Convex reactivity
      }
    },
    [sessionId, exercise, logSet],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Dumbbell className="text-primary size-4.5" />
            </div>
            <CardTitle className="text-sm">{exercise.name}</CardTitle>
          </div>
          <Badge
            variant={completedCount === exercise.targetSets ? "default" : "secondary"}
          >
            {completedCount}/{exercise.targetSets}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="text-muted-foreground flex items-center gap-4 text-xs">
          <span>Target: {exercise.targetWeight}kg &times; {exercise.targetReps} reps</span>
        </div>
        {localSets.map((set) => (
          <SetInput
            key={set.setIndex}
            setIndex={set.setIndex}
            targetWeight={exercise.targetWeight}
            targetReps={exercise.targetReps}
            actualWeight={set.actualWeight}
            actualReps={set.actualReps}
            isCompleted={set.isCompleted}
            onWeightChange={() => {}}
            onRepsChange={() => {}}
            onComplete={() =>
              handleComplete(set.setIndex, set.actualWeight, set.actualReps)
            }
          />
        ))}
      </CardContent>
    </Card>
  );
});

export function ExerciseTrackerSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted size-9 animate-pulse rounded-lg" />
            <div className="bg-muted h-4 w-32 animate-pulse rounded" />
          </div>
          <div className="bg-muted h-5 w-12 animate-pulse rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <SetInputSkeleton />
        <SetInputSkeleton />
        <SetInputSkeleton />
      </CardContent>
    </Card>
  );
}
