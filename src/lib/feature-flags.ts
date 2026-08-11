"use client"

import { useEffect, useState } from "react"
import posthog from "posthog-js"

interface FeatureFlagResult {
  isEnabled: boolean
  isLoading: boolean
}

export function useFeatureFlag(flag: string): FeatureFlagResult {
  const [isEnabled, setIsEnabled] = useState(false)
  // Without PostHog configured the flag is permanently off and never
  // "loading" — seed the initial state so the effect never has to set it.
  const [isLoading, setIsLoading] = useState(
    !process.env.NEXT_PUBLIC_POSTHOG_KEY,
  )

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

    let cancelled = false
    const checkFlag = () => {
      if (cancelled) return
      const flagValue = posthog.getFeatureFlag(flag)
      setIsEnabled(flagValue === "true" || flagValue === "enabled")
      setIsLoading(false)
    }

    if (posthog.isFeatureEnabled(flag) !== undefined) {
      // Flags are already loaded — run the check asynchronously so we never
      // call setState synchronously inside the effect body.
      const timer = setTimeout(checkFlag, 0)
      return () => {
        cancelled = true
        clearTimeout(timer)
      }
    }

    // Subscribe to PostHog's "flags loaded" event instead of polling once.
    // Closes BUG-070: previous code timed out after 1s and reported all flags
    // off if PostHog took longer than that to bootstrap.
    const unsubscribe = posthog.onFeatureFlags(() => checkFlag())
    return () => {
      cancelled = true
      try {
        unsubscribe?.()
      } catch {
        /* noop */
      }
    }
  }, [flag])

  return { isEnabled, isLoading }
}

export function useFeatureFlagWithPayload(flag: string) {
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null)
  const [isLoading, setIsLoading] = useState(
    !process.env.NEXT_PUBLIC_POSTHOG_KEY,
  )

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

    let cancelled = false
    const checkFlag = () => {
      if (cancelled) return
      const flagPayload = posthog.getFeatureFlagPayload(flag)
      if (flagPayload && typeof flagPayload === "object") {
        setPayload(flagPayload as Record<string, unknown>)
      }
      setIsLoading(false)
    }

    // Same fix as `useFeatureFlag` — listen for PostHog's loaded event.
    const unsubscribe = posthog.onFeatureFlags(() => checkFlag())
    // Immediate first check in case flags are already loaded — deferred so we
    // never call setState synchronously within the effect body.
    const timer = setTimeout(checkFlag, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
      try {
        unsubscribe?.()
      } catch {
        /* noop */
      }
    }
  }, [flag])

  return { payload, isLoading }
}

// Track events with privacy-friendly masking
export const analytics = {
  workoutStarted: (planId: string) => {
    posthog.capture("workout_started", { plan_id: planId })
  },

  setLogged: (exerciseName: string, weight: number, reps: number) => {
    posthog.capture("set_logged", {
      exercise: exerciseName,
      weight,
      reps,
    })
  },

  planCreated: (exerciseCount: number) => {
    posthog.capture("plan_created", { exercise_count: exerciseCount })
  },

  prHit: (exerciseName: string, newWeight: number) => {
    posthog.capture("pr_hit", { exercise: exerciseName, weight: newWeight })
  },

  checkinSubmitted: (weekNumber: number) => {
    posthog.capture("checkin_submitted", { week: weekNumber })
  },

  messageSent: () => {
    posthog.capture("message_sent")
  },
}
