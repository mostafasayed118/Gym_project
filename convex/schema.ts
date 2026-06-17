import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const roleValidator = v.union(v.literal("admin"), v.literal("coach"), v.literal("user"));

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: roleValidator,
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
    .index("by_status", ["status"]),

  sessions: defineTable({
    clientId: v.id("users"),
    coachId: v.id("users"),
    planId: v.id("plans"),
    date: v.string(),
    exercises: v.array(
      v.object({
        name: v.string(),
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
    .index("by_coachId", ["coachId"])
    .index("by_planId", ["planId"])
    .index("by_date", ["date"]),

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
    .index("by_date", ["date"]),
});
