"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"

interface PRResult {
  isPR: boolean
  previousBest1RM: number
  newBest1RM: number
  previousBestWeight: number
  newBestWeight: number
}

interface UsePRDetectionOptions {
  userId: Id<"users">
  onPR?: (result: PRResult, exerciseName: string) => void
}

export function usePRDetection({ userId, onPR }: UsePRDetectionOptions) {
  const [lastPR, setLastPR] = React.useState<{
    exerciseName: string
    result: PRResult
  } | null>(null)

  const checkForPR = useMutation(api.gamification.checkForPR)

  const detectPR = React.useCallback(
    async (
      exerciseName: string,
      weight: number,
      reps: number,
      sessionId: Id<"sessions">
    ): Promise<PRResult | null> => {
      try {
        const result = await checkForPR({
          userId,
          exerciseName,
          weight,
          reps,
          sessionId,
        })

        if (result.isPR) {
          // Trigger haptic feedback on mobile
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 200])
          }

          setLastPR({ exerciseName, result })
          onPR?.(result, exerciseName)
        }

        return result
      } catch (error) {
        console.error("PR detection failed:", error)
        return null
      }
    },
    [userId, checkForPR, onPR]
  )

  const clearPR = React.useCallback(() => {
    setLastPR(null)
  }, [])

  return {
    detectPR,
    lastPR,
    clearPR,
  }
}

export function triggerHapticFeedback() {
  if (navigator.vibrate) {
    navigator.vibrate(200)
  }
}
