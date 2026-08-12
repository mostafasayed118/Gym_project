import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const roleValidator = v.union(v.literal("admin"), v.literal("coach"), v.literal("user"));
const userStatusValidator = v.union(v.literal("active"), v.literal("suspended"));

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: roleValidator,
    status: v.optional(userStatusValidator),
    avatarUrl: v.optional(v.string()),
    coachId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_role", ["role"])
    .index("by_coachId", ["coachId"]),

  plans: defineTable({
    coachId: v.id("users"),
    clientId: v.id("users"),
    title: v.string(),
    description: v.string(),
    exercises: v.array(
      v.object({
        name: v.string(),
        sets: v.number(),
        reps: v.number(),
        weight: v.optional(v.number()),
        duration: v.optional(v.number()),
        notes: v.optional(v.string()),
      }),
    ),
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("archived")),
  })
    .index("by_coachId", ["coachId"])
    .index("by_clientId", ["clientId"])
    .index("by_clientId_status", ["clientId", "status"])
    .index("by_status", ["status"]),

  planItems: defineTable({
    planId: v.id("plans"),
    dayOfWeek: v.string(),
    exerciseName: v.string(),
    // Optional ExerciseDB catalog id when the exercise was picked from the
    // synced catalog (see convex/exerciseDb.ts). Lets the UI render the GIF,
    // muscle-group, and instructions for exercises picked from the catalog.
    exerciseDbId: v.optional(v.string()),
    targetSets: v.number(),
    targetReps: v.number(),
    targetWeight: v.number(),
  })
    .index("by_planId", ["planId"])
    .index("by_planId_dayOfWeek", ["planId", "dayOfWeek"]),

  // ExerciseDB catalog, synced in bulk by an admin (convex/exerciseDb.ts).
  // The catalog is imported into Convex so reads never hit the paid RapidAPI
  // endpoint per-request — search is served entirely from this table.
  exercises: defineTable({
    exerciseDbId: v.string(),
    name: v.string(),
    bodyPart: v.string(),
    equipment: v.string(),
    target: v.string(),
    secondaryMuscles: v.array(v.string()),
    gifUrl: v.optional(v.string()),
    instructions: v.optional(v.array(v.string())),
    // Lowercased name for case-insensitive prefix search.
    searchTerms: v.string(),
  })
    .index("by_exerciseDbId", ["exerciseDbId"])
    .index("by_searchTerms", ["searchTerms"])
    .index("by_bodyPart", ["bodyPart"])
    .index("by_equipment", ["equipment"])
    .index("by_target", ["target"]),

  sessions: defineTable({
    clientId: v.id("users"),
    coachId: v.id("users"),
    planId: v.id("plans"),
    date: v.string(),
    exercises: v.array(
      v.object({
        name: v.string(),
        // ExerciseDB catalog link, carried over from the plan item when the
        // session was created. Lets getSessionWithSets join the demo GIF +
        // instructions the same way the plan view does.
        exerciseDbId: v.optional(v.string()),
        sets: v.array(
          v.object({
            reps: v.number(),
            weight: v.number(),
            completed: v.boolean(),
          }),
        ),
      }),
    ),
    completed: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_clientId", ["clientId"])
    .index("by_clientId_date", ["clientId", "date"])
    .index("by_clientId_completed", ["clientId", "completed"])
    .index("by_coachId", ["coachId"])
    .index("by_planId", ["planId"])
    .index("by_date", ["date"]),

  sessionSets: defineTable({
    sessionId: v.id("sessions"),
    exerciseName: v.string(),
    setIndex: v.number(),
    targetWeight: v.number(),
    targetReps: v.number(),
    actualWeight: v.number(),
    actualReps: v.number(),
    completedAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_sessionId_exerciseName", ["sessionId", "exerciseName"]),

  conversations: defineTable({
    participantIds: v.array(v.id("users")),
    lastMessageAt: v.number(),
    lastMessageBody: v.optional(v.string()),
    lastMessageSenderId: v.optional(v.id("users")),
  })
    .index("by_participant", ["participantIds"])
    .index("by_lastMessageAt", ["lastMessageAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(),
    readBy: v.array(v.id("users")),
  })
    .index("by_conversationId", ["conversationId"]),

  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    expiresAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_conversationId_userId", ["conversationId", "userId"]),

  userStats: defineTable({
    userId: v.id("users"),
    currentStreak: v.number(),
    maxStreak: v.number(),
    totalVolume: v.number(),
    totalSessions: v.number(),
    badges: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        unlockedAt: v.number(),
      }),
    ),
    lastWorkoutDate: v.optional(v.string()),
  })
    .index("by_userId", ["userId"]),

  checkins: defineTable({
    userId: v.id("users"),
    weekNumber: v.number(),
    weight: v.optional(v.number()),
    bodyFat: v.optional(v.number()),
    notes: v.optional(v.string()),
    photoStorageIds: v.array(v.id("_storage")),
    status: v.union(v.literal("pending"), v.literal("submitted"), v.literal("reviewed")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_weekNumber", ["userId", "weekNumber"]),

  auditLogs: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    targetEntity: v.string(),
    targetId: v.string(),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_actorId", ["actorId"])
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"]),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    enabled: v.boolean(),
  })
    .index("by_userId", ["userId"]),

  notificationPreferences: defineTable({
    userId: v.id("users"),
    workoutReminders: v.boolean(),
    checkinReminders: v.boolean(),
    messageNotifications: v.boolean(),
    reminderTime: v.string(),
  })
    .index("by_userId", ["userId"]),

  progress: defineTable({
    clientId: v.id("users"),
    date: v.string(),
    weight: v.optional(v.number()),
    bodyFat: v.optional(v.number()),
    measurements: v.optional(
      v.object({
        chest: v.optional(v.number()),
        waist: v.optional(v.number()),
        hips: v.optional(v.number()),
        arms: v.optional(v.number()),
        thighs: v.optional(v.number()),
      }),
    ),
    notes: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
  })
    .index("by_clientId", ["clientId"])
    .index("by_clientId_date", ["clientId", "date"])
    .index("by_date", ["date"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("trialing"),
    ),
    priceId: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Stripe event.created (UNIX seconds) of the most recently applied event.
    // Used by the Stripe webhook to reject out-of-order deliveries
    // (closes BUG-006).
    lastWebhookEventAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"])
    // Replaces the full-table scan in `findByStripeCustomerId` (closes BUG-030).
    .index("by_stripeCustomerId", ["stripeCustomerId"]),

  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    expiresAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_key_expiresAt", ["key", "expiresAt"]),

  // Webhook idempotency ledger. Insert-or-throw on `(provider, eventId)` so
  // Svix/Stripe retries do not re-fire downstream effects (closes BUG-022).
  processedWebhookEvents: defineTable({
    provider: v.union(v.literal("stripe"), v.literal("clerk")),
    eventId: v.string(),
    eventType: v.string(),
    eventCreated: v.optional(v.number()),
    processedAt: v.number(),
  }).index("by_provider_eventId", ["provider", "eventId"]),
});
