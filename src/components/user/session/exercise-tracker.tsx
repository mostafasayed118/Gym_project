"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell } from "lucide-react";
import { SetInput, SetInputSkeleton } from "./set-input";
import { usePRDetection } from "@/hooks/use-pr-detection";
import { PRCelebration } from "@/components/gamification/pr-celebration";
import { ExerciseMedia } from "@/components/exercise-media";
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
  // ExerciseDB catalog link — present when the exercise was picked from the
  // synced catalog. getSessionWithSets joins the demo GIF + instructions.
  gifUrl?: string;
  instructions?: string[];
}

interface ExerciseTrackerProps {
  sessionId: Id<"sessions">;
  userId: Id<"users">;
  exercise: ExerciseData;
  loggedSets: LoggedSet[];
}

type InputDraft = { weight: number; reps: number };

export const ExerciseTracker = memo(function ExerciseTracker({
  sessionId,
  userId,
  exercise,
  loggedSets,
}: ExerciseTrackerProps) {
  const logSet = useMutation(api.sessions.logSet);
  const { detectPR, lastPR, clearPR } = usePRDetection({ userId });

  const completedCount = loggedSets.length;

  /**
   * `drafts` owns the *editable* per-set weight/reps state. We seed each draft
   * from either the server's last-logged value or the plan target. The reactive
   * `loggedSets` prop drives re-seeding only when a server update lands AND the
   * user hasn't touched that set's draft yet — otherwise typing would be
   * clobbered by the round-trip.
   *
   * Closes BUG-024: previously the parent passed `() => {}` callbacks so
   * +/- buttons and number-input edits never reached the mutation, and every
   * set was logged at the target weight regardless of what the user entered.
   */
  const [drafts, setDrafts] = useState<Record<number, InputDraft>>({});
  const [touched, setTouched] = useState<Record<number, boolean>>({});

  const loggedByIndex = useMemo(() => {
    const map = new Map<number, LoggedSet>();
    for (const s of loggedSets) map.set(s.setIndex, s);
    return map;
  }, [loggedSets]);

  // Seed / re-seed drafts from server state for untouched sets. Keyed off a
  // snapshot of the seeding inputs, adjusted during render (React's "storing
  // information from previous renders" pattern) instead of in an effect, so we
  // never call setState synchronously inside an effect body.
  const [seedSnapshot, setSeedSnapshot] = useState<{
    targetSets: number;
    targetReps: number;
    targetWeight: number;
    loggedByIndex: Map<number, LoggedSet>;
  } | null>(null);

  const currentSnapshot = {
    targetSets: exercise.targetSets,
    targetReps: exercise.targetReps,
    targetWeight: exercise.targetWeight,
    loggedByIndex,
  };

  if (
    seedSnapshot === null ||
    seedSnapshot.targetSets !== currentSnapshot.targetSets ||
    seedSnapshot.targetReps !== currentSnapshot.targetReps ||
    seedSnapshot.targetWeight !== currentSnapshot.targetWeight ||
    seedSnapshot.loggedByIndex !== currentSnapshot.loggedByIndex
  ) {
    setSeedSnapshot(currentSnapshot);
    setDrafts((prev) => {
      const next = { ...prev };
      let changed = false;
      for (let i = 0; i < exercise.targetSets; i++) {
        if (touched[i]) continue;
        const logged = loggedByIndex.get(i);
        const seedWeight = logged?.actualWeight ?? exercise.targetWeight;
        const seedReps = logged?.actualReps ?? exercise.targetReps;
        const existing = next[i];
        if (!existing || existing.weight !== seedWeight || existing.reps !== seedReps) {
          next[i] = { weight: seedWeight, reps: seedReps };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }

  const setWeight = useCallback((idx: number, weight: number) => {
    setDrafts((d) => ({
      ...d,
      [idx]: { weight, reps: d[idx]?.reps ?? 0 },
    }));
    setTouched((t) => (t[idx] ? t : { ...t, [idx]: true }));
  }, []);

  const setReps = useCallback((idx: number, reps: number) => {
    setDrafts((d) => ({
      ...d,
      [idx]: { weight: d[idx]?.weight ?? 0, reps },
    }));
    setTouched((t) => (t[idx] ? t : { ...t, [idx]: true }));
  }, []);

  const handleComplete = useCallback(
    async (setIndex: number) => {
      const draft = drafts[setIndex];
      if (!draft) return;
      const { weight, reps } = draft;

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
        // Convex reactivity will reconcile failed/queued mutations
        return;
      }

      // Once the server has accepted the value, allow re-seeding from the
      // canonical server state if the user opens the row again later.
      setTouched((t) => {
        if (!t[setIndex]) return t;
        const next = { ...t };
        delete next[setIndex];
        return next;
      });

      if (weight > 0 && reps > 0) {
        await detectPR(exercise.name, weight, reps, sessionId);
      }
    },
    [drafts, sessionId, exercise, logSet, detectPR],
  );

  const rows = Array.from({ length: exercise.targetSets }, (_, i) => {
    const logged = loggedByIndex.get(i);
    const draft = drafts[i] ?? {
      weight: logged?.actualWeight ?? exercise.targetWeight,
      reps: logged?.actualReps ?? exercise.targetReps,
    };
    return {
      setIndex: i,
      actualWeight: draft.weight,
      actualReps: draft.reps,
      isCompleted: !!logged,
    };
  });

  return (
    <>
      <Card className="relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#c3f400]/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />

        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#abd600]/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Dumbbell className="text-[#abd600] size-4.5" />
              </div>
              <CardTitle className="text-sm text-[#e2e4cf]">{exercise.name}</CardTitle>
            </div>
            <Badge
              variant={completedCount === exercise.targetSets ? "neon" : "secondary"}
            >
              {completedCount}/{exercise.targetSets}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="text-[#c4c9ac] flex items-center gap-4 text-xs font-label-caps">
            <span>Target: {exercise.targetWeight}kg &times; {exercise.targetReps} reps</span>
          </div>
          {/* Demo GIF + instructions for catalog-picked exercises */}
          <ExerciseMedia
            exerciseName={exercise.name}
            gifUrl={exercise.gifUrl}
            instructions={exercise.instructions}
          />
          {rows.map((row) => (
            <SetInput
              key={row.setIndex}
              setIndex={row.setIndex}
              targetWeight={exercise.targetWeight}
              targetReps={exercise.targetReps}
              actualWeight={row.actualWeight}
              actualReps={row.actualReps}
              isCompleted={row.isCompleted}
              onWeightChange={(w) => setWeight(row.setIndex, w)}
              onRepsChange={(r) => setReps(row.setIndex, r)}
              onComplete={() => handleComplete(row.setIndex)}
            />
          ))}
        </CardContent>
      </Card>

      <PRCelebration
        show={lastPR !== null}
        exerciseName={lastPR?.exerciseName ?? ""}
        newWeight={lastPR?.result.newBestWeight ?? 0}
        previousWeight={lastPR?.result.previousBestWeight ?? 0}
        onAnimationEnd={clearPR}
      />
    </>
  );
});

export function ExerciseTrackerSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#282b1d] size-9 animate-pulse rounded-lg" />
            <div className="bg-[#282b1d] h-4 w-32 animate-pulse rounded" />
          </div>
          <div className="bg-[#282b1d] h-5 w-12 animate-pulse rounded-full" />
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
