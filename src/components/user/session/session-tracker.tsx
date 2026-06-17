"use client";

import { useCallback, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { ExerciseTracker, ExerciseTrackerSkeleton } from "./exercise-tracker";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import type { Id } from "@convex/_generated/dataModel";

interface SessionTrackerProps {
  sessionId: Id<"sessions"> | null;
}

export function SessionTracker({ sessionId }: SessionTrackerProps) {
  const router = useRouter();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const createForToday = useMutation(api.sessions.createForToday);
  const finishSession = useMutation(api.sessions.finish);

  const [activeSessionId, setActiveSessionId] = useState(sessionId);
  const [isFinishing, setIsFinishing] = useState(false);

  const convexUser = useQuery(
    api.auth.getUserByClerkId,
    clerkLoaded && clerkUser ? { clerkId: clerkUser.id } : "skip",
  );

  const session = useQuery(
    api.sessions.getSessionWithSets,
    activeSessionId ? { sessionId: activeSessionId } : "skip",
  );

  const ensureSession = useCallback(async () => {
    if (activeSessionId) return activeSessionId;
    if (!convexUser) throw new Error("User not loaded");

    try {
      const id = await createForToday({ clientId: convexUser._id });
      setActiveSessionId(id);
      return id;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start session");
      throw error;
    }
  }, [activeSessionId, convexUser, createForToday]);

  const handleFinish = useCallback(async () => {
    if (!activeSessionId) return;

    setIsFinishing(true);
    try {
      await finishSession({ sessionId: activeSessionId });
      toast.success("Workout completed!");
      router.push("/user/dashboard");
    } catch {
      toast.error("Failed to finish workout");
    } finally {
      setIsFinishing(false);
    }
  }, [activeSessionId, finishSession, router]);

  const isLoading = !clerkLoaded || convexUser === undefined;

  if (isLoading) {
    return <SessionSkeleton />;
  }

  if (!activeSessionId) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-border flex items-center gap-4 border-b px-6 py-4">
          <Button variant="ghost" size="icon" render={<Link href="/user/dashboard" />}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-lg font-semibold">Start Workout</h1>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <p className="text-muted-foreground text-sm">
            Ready to begin today&apos;s workout?
          </p>
          <Button size="lg" onClick={ensureSession}>
            Start Session
          </Button>
        </main>
      </div>
    );
  }

  if (session === undefined) {
    return <SessionSkeleton />;
  }

  if (session === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Session not found</p>
        <Button render={<Link href="/user/dashboard" />}>Back to Dashboard</Button>
      </div>
    );
  }

  if (session.completed) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-border flex items-center gap-4 border-b px-6 py-4">
          <Button variant="ghost" size="icon" render={<Link href="/user/dashboard" />}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-lg font-semibold">Workout Complete</h1>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <CheckCircle className="text-green-500 size-16" />
          <h2 className="text-xl font-bold">Great workout!</h2>
          <p className="text-muted-foreground text-sm">
            You&apos;ve completed today&apos;s session. Keep up the great work!
          </p>
          <Button render={<Link href="/user/dashboard" />}>Back to Dashboard</Button>
        </main>
      </div>
    );
  }

  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = session.loggedSets.length;
  const progress = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  return (
    <div className="flex min-h-screen flex-col pb-24">
      <header className="border-border flex items-center gap-4 border-b px-6 py-4">
        <Button variant="ghost" size="icon" render={<Link href="/user/dashboard" />}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex flex-1 items-center gap-3">
          <h1 className="text-lg font-semibold">Active Session</h1>
          <span className="text-muted-foreground text-xs">
            {completedSets}/{totalSets} sets
          </span>
        </div>
      </header>

      <div className="border-border h-1 border-b">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="flex flex-1 flex-col gap-4 p-4">
        {session.exercises.map((exercise) => {
          const exerciseLoggedSets = session.loggedSets
            .filter((s) => s.exerciseName === exercise.name)
            .map((s) => ({
              setIndex: s.setIndex,
              actualWeight: s.actualWeight,
              actualReps: s.actualReps,
            }));

          return (
            <ExerciseTracker
              key={exercise.name}
              sessionId={activeSessionId!}
              exercise={{
                name: exercise.name,
                targetSets: exercise.sets.length,
                targetReps: exercise.sets[0]?.reps ?? 10,
                targetWeight: exercise.sets[0]?.weight ?? 0,
              }}
              loggedSets={exerciseLoggedSets}
            />
          );
        })}
      </main>

      <div className="border-border fixed right-0 bottom-0 left-0 border-t bg-background p-4">
        <Button
          size="lg"
          className="w-full"
          onClick={handleFinish}
          disabled={isFinishing}
        >
          {isFinishing ? "Finishing..." : "Finish Workout"}
        </Button>
      </div>
    </div>
  );
}

function SessionSkeleton() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border flex items-center gap-4 border-b px-6 py-4">
        <Skeleton className="size-8" />
        <Skeleton className="h-6 w-32" />
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <ExerciseTrackerSkeleton />
        <ExerciseTrackerSkeleton />
      </main>
    </div>
  );
}
