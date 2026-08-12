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

  // Closes BUG-073: Clerk says we have a user but Convex has no row. This
  // happens during the webhook propagation window for brand-new sign-ups.
  // Don't spin forever — show a recovery affordance.
  if (!convexUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 bg-[#111508] text-center">
        <p className="text-base font-medium text-[#e2e4cf]">
          Setting up your account…
        </p>
        <p className="max-w-sm text-sm text-[#c4c9ac]">
          We&apos;re syncing your profile from Clerk. This usually takes a few
          seconds — if it persists, try refreshing.
        </p>
        <Button variant="outline" onClick={() => router.refresh()}>
          Refresh
        </Button>
      </div>
    );
  }

  if (!activeSessionId) {
    return (
      <div className="flex min-h-screen flex-col bg-[#111508]">
        <header
          className="sticky top-0 z-40 flex items-center gap-4 border-b border-[rgba(68,73,51,0.1)] px-6 h-[72px]"
          style={{ background: "rgba(17,21,8,0.5)", backdropFilter: "blur(24px)" }}
        >
          <Button variant="ghost" size="icon" render={<Link href="/user/dashboard" />}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-[20px] font-bold tracking-tight text-[#e2e4cf]">Start Workout</h1>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <p className="text-[#c4c9ac] text-sm">
            Ready to begin today&apos;s workout?
          </p>
          <Button size="lg" variant="gradient" onClick={ensureSession}>
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 bg-[#111508]">
        <p className="text-[#c4c9ac]">Session not found</p>
        <Button render={<Link href="/user/dashboard" />}>Back to Dashboard</Button>
      </div>
    );
  }

  if (session.completed) {
    return (
      <div className="flex min-h-screen flex-col bg-[#111508]">
        <header
          className="sticky top-0 z-40 flex items-center gap-4 border-b border-[rgba(68,73,51,0.1)] px-6 h-[72px]"
          style={{ background: "rgba(17,21,8,0.5)", backdropFilter: "blur(24px)" }}
        >
          <Button variant="ghost" size="icon" render={<Link href="/user/dashboard" />}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-[20px] font-bold tracking-tight text-[#e2e4cf]">Workout Complete</h1>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <CheckCircle className="text-[#abd600] size-16" />
          <h2 className="text-xl font-bold text-[#e2e4cf]">Great workout!</h2>
          <p className="text-[#c4c9ac] text-sm">
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
    <div className="flex min-h-screen flex-col pb-24 bg-[#111508]">
      <header
        className="sticky top-0 z-40 flex items-center gap-4 border-b border-[rgba(68,73,51,0.1)] px-6 h-[72px]"
        style={{ background: "rgba(17,21,8,0.5)", backdropFilter: "blur(24px)" }}
      >
        <Button variant="ghost" size="icon" render={<Link href="/user/dashboard" />}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex flex-1 items-center gap-3">
          <h1 className="text-[20px] font-bold tracking-tight text-[#e2e4cf]">Active Session</h1>
          <span className="font-metric-lg text-[#abd600] text-[28px] font-bold tabular-nums">
            {completedSets}/{totalSets}
          </span>
        </div>
      </header>

      <div className="h-1 border-b border-[rgba(68,73,51,0.1)] bg-[#282b1d]">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #abd600, #00dce5)",
          }}
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
              userId={convexUser._id}
              exercise={{
                name: exercise.name,
                targetSets: exercise.sets.length,
                targetReps: exercise.sets[0]?.reps ?? 10,
                targetWeight: exercise.sets[0]?.weight ?? 0,
                gifUrl: exercise.gifUrl,
                instructions: exercise.instructions,
              }}
              loggedSets={exerciseLoggedSets}
            />
          );
        })}
      </main>

      {/* Sticky CTA sits above the mobile bottom nav (h-16) on small screens.
          Closes BUG-046 (CTA was overlapped by nav). */}
      <div className="fixed right-0 bottom-16 md:bottom-0 left-0 border-t border-[rgba(68,73,51,0.1)] p-4 bg-[#111508]/90 backdrop-blur-xl z-40 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button
          size="lg"
          variant="gradient"
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
    <div className="flex min-h-screen flex-col bg-[#111508]">
      <header
        className="sticky top-0 z-40 flex items-center gap-4 border-b border-[rgba(68,73,51,0.1)] px-6 h-[72px]"
        style={{ background: "rgba(17,21,8,0.5)", backdropFilter: "blur(24px)" }}
      >
        <Skeleton className="size-8 rounded-lg bg-[#282b1d]" />
        <Skeleton className="h-6 w-32 rounded bg-[#282b1d]" />
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <ExerciseTrackerSkeleton />
        <ExerciseTrackerSkeleton />
      </main>
    </div>
  );
}
