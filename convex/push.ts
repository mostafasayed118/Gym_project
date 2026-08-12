import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireIdentity, requireSelf } from "./auth";
import { checkMutationRateLimit } from "./rateLimit";

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Validate that a push endpoint is HTTPS and hosted by a recognized push
 * service. Prevents SSRF via attacker-controlled endpoints (BUG-036).
 *
 * NOTE: this is an allowlist. New push service hosts must be added here.
 */
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "wns2-",                              // Windows Notification Service prefix
  "web.push.apple.com",
  "push.services.mozilla.com",
];

function validateEndpoint(endpoint: string): void {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Invalid push endpoint: not a URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("Invalid push endpoint: must be HTTPS");
  }
  const allowed = ALLOWED_PUSH_HOSTS.some(
    (h) => url.hostname === h || url.hostname.endsWith("." + h) || url.hostname.startsWith(h),
  );
  if (!allowed) {
    throw new Error("Invalid push endpoint: host not on allowlist");
  }
}

// ─── Queries ────────────────────────────────────────────────────────

export const getSubscription = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);
    if (caller._id !== args.userId && caller.role !== "admin") {
      throw new Error("Forbidden: cannot read another user's push subscription");
    }
    const sub = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    return sub;
  },
});

export const getPreferences = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);
    if (caller._id !== args.userId && caller.role !== "admin") {
      throw new Error("Forbidden: cannot read another user's notification preferences");
    }
    const prefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!prefs) {
      return {
        workoutReminders: true,
        checkinReminders: true,
        messageNotifications: true,
        reminderTime: "17:00",
      };
    }

    return prefs;
  },
});

// ─── Mutations ──────────────────────────────────────────────────────

export const saveSubscription = mutation({
  args: {
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, args) => {
    // Identity binding — closes BUG-012 (coach push-notification hijack).
    const caller = await requireSelf(ctx, args.userId);

    // Endpoint allowlist — closes BUG-036 (SSRF via attacker-controlled URL).
    validateEndpoint(args.endpoint);

    // Rate limit: 5 requests per minute (keyed by authenticated caller, not arg).
    await checkMutationRateLimit(ctx, "push:saveSubscription", caller._id);

    // Upsert subscription
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        endpoint: args.endpoint,
        p256dh: args.p256dh,
        auth: args.auth,
        enabled: true,
      });
      return existing._id;
    }

    return await ctx.db.insert("pushSubscriptions", {
      userId: args.userId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      enabled: true,
    });
  },
});

export const updatePreferences = mutation({
  args: {
    userId: v.id("users"),
    workoutReminders: v.optional(v.boolean()),
    checkinReminders: v.optional(v.boolean()),
    messageNotifications: v.optional(v.boolean()),
    reminderTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);

    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    const updates: {
      workoutReminders?: boolean;
      checkinReminders?: boolean;
      messageNotifications?: boolean;
      reminderTime?: string;
    } = {};
    if (args.workoutReminders !== undefined) updates.workoutReminders = args.workoutReminders;
    if (args.checkinReminders !== undefined) updates.checkinReminders = args.checkinReminders;
    if (args.messageNotifications !== undefined) updates.messageNotifications = args.messageNotifications;
    if (args.reminderTime !== undefined) updates.reminderTime = args.reminderTime;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    return await ctx.db.insert("notificationPreferences", {
      userId: args.userId,
      workoutReminders: updates.workoutReminders ?? true,
      checkinReminders: updates.checkinReminders ?? true,
      messageNotifications: updates.messageNotifications ?? true,
      reminderTime: updates.reminderTime ?? "17:00",
    });
  },
});

export const unsubscribe = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { enabled: false });
    }
  },
});

// ─── Internal Queries (for cron jobs) ───────────────────────────────

export const getSubscriptionInternal = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const getPreferencesInternal = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    return prefs ?? {
      workoutReminders: true,
      checkinReminders: true,
      messageNotifications: true,
      reminderTime: "17:00",
    };
  },
});

// Internal: listed every active-plan client's internal IDs to anyone with the
// public Convex URL. Cron-only (used by sendWorkoutReminders via the internal
// API), so it's now internalQuery — not reachable over HTTP.
export const getUsersWithActivePlans = internalQuery({
  handler: async (ctx) => {
    const plans = await ctx.db
      .query("plans")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return plans.map((p) => ({
      userId: p.clientId,
      planId: p._id,
    }));
  },
});

// Internal: answered schedule questions about arbitrary users' plans to
// unauthenticated callers. Cron-only, so it's now internalQuery.
export const checkWorkoutScheduledToday = internalQuery({
  args: {
    userId: v.id("users"),
    planId: v.id("plans"),
  },
  handler: async (ctx, args) => {
    // Use explicit locale to ensure consistent English day names
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC",
    });
    const plan = await ctx.db.get(args.planId);
    if (!plan) return false;

    // Check if any plan items are scheduled for today
    const items = await ctx.db
      .query("planItems")
      .withIndex("by_planId", (q) => q.eq("planId", args.planId))
      .collect();

    return items.some((item) => item.dayOfWeek === today);
  },
});

// Internal: exposed whether arbitrary users had sessions today. Cron-only,
// so it's now internalQuery.
export const checkSessionToday = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Use UTC date to avoid timezone issues
    const today = new Date().toISOString().split("T")[0];
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.userId))
      .collect();

    return sessions.some((s) => s.date === today);
  },
});
