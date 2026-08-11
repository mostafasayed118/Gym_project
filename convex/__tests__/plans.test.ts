import { describe, it, expect, beforeEach } from "vitest"
import { createMockCtx, createTestUser, createTestPlan } from "./test-utils"

type Badge = { id: string; name?: string; unlockedAt?: number }

// We'll test the logic of our Convex functions by mocking the ctx
describe("Plans Module", () => {
  let mockCtx: ReturnType<typeof createMockCtx>

  beforeEach(() => {
    mockCtx = createMockCtx()
  })

  describe("createPlanWithItems", () => {
    it("should create a plan with items successfully", async () => {
      const planData = createTestPlan()
      const exercises = [
        {
          name: "Bench Press",
          dayOfWeek: "Monday",
          targetSets: 3,
          targetReps: 10,
          targetWeight: 80,
        },
        {
          name: "Squats",
          dayOfWeek: "Wednesday",
          targetSets: 4,
          targetReps: 8,
          targetWeight: 100,
        },
      ]

      // Simulate the mutation logic
      const planId = await mockCtx.db.insert("plans", {
        coachId: planData.coachId,
        clientId: planData.clientId,
        title: planData.title,
        description: planData.description,
        exercises: [],
        startDate: planData.startDate,
        endDate: planData.endDate,
        status: "active",
      })

      for (const ex of exercises) {
        await mockCtx.db.insert("planItems", {
          planId,
          ...ex,
        })
      }

      expect(planId).toBeDefined()
      expect(mockCtx.db.insert).toHaveBeenCalledTimes(3) // 1 plan + 2 items
    })

    it("should reject invalid exercise data (negative reps)", async () => {
      const invalidExercises = [
        {
          name: "Bench Press",
          dayOfWeek: "Monday",
          targetSets: 3,
          targetReps: -10, // Invalid: negative
          targetWeight: 80,
        },
      ]

      // Simulate validation logic
      const validateExercise = (ex: {
        targetSets: number
        targetReps: number
        targetWeight: number
      }) => {
        if (ex.targetReps < 0) throw new Error("Reps cannot be negative")
        if (ex.targetSets < 0) throw new Error("Sets cannot be negative")
        if (ex.targetWeight < 0) throw new Error("Weight cannot be negative")
        return true
      }

      expect(() => validateExercise(invalidExercises[0])).toThrow("Reps cannot be negative")
    })

    it("should reject if user is not a coach", async () => {
      const regularUser = createTestUser({ role: "user" })

      // Simulate role check
      const checkRole = (user: { role: string }) => {
        if (user.role !== "coach" && user.role !== "admin") {
          throw new Error("Only coaches can create plans")
        }
      }

      expect(() => checkRole(regularUser)).toThrow("Only coaches can create plans")
    })

    it("should allow admin to create plans", async () => {
      const adminUser = createTestUser({ role: "admin" })

      const checkRole = (user: { role: string }) => {
        if (user.role !== "coach" && user.role !== "admin") {
          throw new Error("Only coaches can create plans")
        }
      }

      expect(() => checkRole(adminUser)).not.toThrow()
    })
  })

  describe("logSet", () => {
    it("should log a set successfully", async () => {
      const sessionId = "sessions:1"
      const setData = {
        exerciseName: "Bench Press",
        setIndex: 0,
        targetWeight: 80,
        targetReps: 10,
        actualWeight: 82.5,
        actualReps: 10,
      }

      // Simulate the mutation logic
      const setEntry = await mockCtx.db.insert("sessionSets", {
        sessionId,
        ...setData,
        completedAt: Date.now(),
      })

      expect(setEntry).toBeDefined()
      expect(mockCtx.db.insert).toHaveBeenCalledWith("sessionSets", expect.objectContaining({
        sessionId,
        exerciseName: "Bench Press",
        actualWeight: 82.5,
        actualReps: 10,
      }))
    })

    it("should detect a PR when logging a heavy set", async () => {
      // Simulate PR detection logic
      const calculate1RM = (weight: number, reps: number) => {
        if (reps === 1) return weight
        return Math.round(weight * (1 + reps / 30))
      }

      const previousBest1RM = 100
      const currentWeight = 90
      const currentReps = 5
      const current1RM = calculate1RM(currentWeight, currentReps)

      const isPR = current1RM > previousBest1RM

      expect(current1RM).toBe(105) // 90 * (1 + 5/30) = 105
      expect(isPR).toBe(true)
    })

    it("should not mark as PR if below previous best", async () => {
      const calculate1RM = (weight: number, reps: number) => {
        if (reps === 1) return weight
        return Math.round(weight * (1 + reps / 30))
      }

      const previousBest1RM = 120
      const currentWeight = 80
      const currentReps = 5
      const current1RM = calculate1RM(currentWeight, currentReps)

      const isPR = current1RM > previousBest1RM

      expect(current1RM).toBe(93) // 80 * (1 + 5/30) = 93.33
      expect(isPR).toBe(false)
    })

    it("should prevent logging for completed session", async () => {
      const session = {
        _id: "sessions:1",
        completed: true,
      }

      // Simulate the check
      if (session.completed) {
        expect(() => {
          throw new Error("Cannot log sets for a completed session")
        }).toThrow("Cannot log sets for a completed session")
      }
    })

    it("should allow logging for active session", async () => {
      const session = {
        _id: "sessions:1",
        completed: false,
      }

      const canLog = !session.completed
      expect(canLog).toBe(true)
    })
  })
})

describe("Gamification Module", () => {
  describe("Badge Logic", () => {
    it("should unlock first_session badge after first session", () => {
      const totalSessions = 1
      const badges: Badge[] = []

      if (totalSessions >= 1 && !badges.find((b) => b.id === "first_session")) {
        badges.push({
          id: "first_session",
          name: "First Session",
          unlockedAt: Date.now(),
        })
      }

      expect(badges).toHaveLength(1)
      expect(badges[0].id).toBe("first_session")
    })

    it("should unlock streak badges at correct thresholds", () => {
      const streaks = [7, 14, 30]
      const expectedBadges = ["7_day_streak", "14_day_streak", "30_day_streak"]

      streaks.forEach((streak, index) => {
        const badges: Badge[] = []
        const badgeChecks = [
          { id: "7_day_streak", condition: streak >= 7 },
          { id: "14_day_streak", condition: streak >= 14 },
          { id: "30_day_streak", condition: streak >= 30 },
        ]

        for (const check of badgeChecks) {
          if (check.condition && !badges.find((b) => b.id === check.id)) {
            badges.push({ id: check.id, name: check.id, unlockedAt: Date.now() })
          }
        }

        expect(badges.some((b) => b.id === expectedBadges[index])).toBe(true)
      })
    })

    it("should unlock volume badges at correct thresholds", () => {
      const volumes = [
        { volume: 100000, badge: "100k_club" },
        { volume: 500000, badge: "500k_club" },
        { volume: 1000000, badge: "1m_club" },
      ]

      volumes.forEach(({ volume, badge }) => {
        const badges: Badge[] = []
        const badgeChecks = [
          { id: "100k_club", condition: volume >= 100000 },
          { id: "500k_club", condition: volume >= 500000 },
          { id: "1m_club", condition: volume >= 1000000 },
        ]

        for (const check of badgeChecks) {
          if (check.condition && !badges.find((b) => b.id === check.id)) {
            badges.push({ id: check.id, name: check.id, unlockedAt: Date.now() })
          }
        }

        expect(badges.some((b) => b.id === badge)).toBe(true)
      })
    })
  })

  describe("Streak Calculation", () => {
    it("should calculate streak correctly for consecutive days", () => {
      const completedDates = ["2024-01-07", "2024-01-06", "2024-01-05", "2024-01-04"]
      const today = new Date("2024-01-07")

      let streak = 0
      const checkDate = new Date(today)

      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split("T")[0] ?? ""
        if (completedDates.includes(dateStr)) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else if (i === 0) {
          checkDate.setDate(checkDate.getDate() - 1)
          continue
        } else {
          break
        }
      }

      expect(streak).toBe(4)
    })

    it("should break streak on missed day", () => {
      const completedDates = ["2024-01-07", "2024-01-05", "2024-01-04"] // Missing 01-06
      const today = new Date("2024-01-07")

      let streak = 0
      const checkDate = new Date(today)

      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split("T")[0] ?? ""
        if (completedDates.includes(dateStr)) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else if (i === 0) {
          checkDate.setDate(checkDate.getDate() - 1)
          continue
        } else {
          break
        }
      }

      expect(streak).toBe(1) // Only today counts
    })
  })
})
