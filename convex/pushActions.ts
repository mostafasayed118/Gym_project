"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import webPush from "web-push";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InternalApi = any;

async function getInternal(): Promise<InternalApi> {
  const mod = await import("./_generated/api");
  return mod.internal;
}

/**
 * Maximum users a single chunk action processes. Each chunk runs as an
 * independent scheduled action with its own time budget, so the platform-wide
 * fan-out scales horizontally instead of being capped by one action's
 * wall-clock limit. (Closes BUG-019.)
 */
const REMINDER_CHUNK_SIZE = 25;

/** Send a push notification to a single user */
export const sendPushNotification = action({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const internal: InternalApi = await getInternal();
    const sub = await ctx.runQuery(internal.push.getSubscriptionInternal, {
      userId: args.userId,
    });

    if (!sub || !sub.enabled) return false;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      console.error("VAPID keys not configured");
      return false;
    }

    webPush.setVapidDetails("mailto:admin@gympro.app", publicKey, privateKey);

    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: args.title,
          body: args.body,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/badge-72x72.png",
          data: { url: args.url ?? "/user/dashboard" },
        }),
      );
      return true;
    } catch {
      return false;
    }
  },
});

/**
 * Cron job: Send daily workout reminders at 5 PM.
 *
 * This is the *coordinator* — it deduplicates users (BUG-064: a user with two
 * active plans previously got two pushes), splits them into chunks, and
 * schedules each chunk as an independent `sendWorkoutReminderChunk` action.
 * Per-user push work happens in the chunk action so we don't burn the
 * coordinator's wall-clock budget on web-push round-trips.
 */
export const sendWorkoutReminders = action({
  args: {},
  handler: async (ctx) => {
    const internal: InternalApi = await getInternal();
    const planRows = await ctx.runQuery(internal.push.getUsersWithActivePlans);

    // Per-plan "is a workout scheduled today" filter, in parallel.
    const filtered = await Promise.all(
      planRows.map(async (p: { userId: string; planId: string }) => {
        const hasWorkoutToday = await ctx.runQuery(
          internal.push.checkWorkoutScheduledToday,
          { userId: p.userId, planId: p.planId },
        );
        return hasWorkoutToday ? p.userId : null;
      }),
    );

    // Dedupe: one user can have multiple active plans (closes BUG-064).
    const userIds = Array.from(
      new Set(filtered.filter((u): u is string => u !== null)),
    );

    // Schedule chunks staggered by 2s each so we never burst the upstream push
    // services. Each chunk runs as a separate action with its own time budget.
    for (let i = 0; i < userIds.length; i += REMINDER_CHUNK_SIZE) {
      const chunk = userIds.slice(i, i + REMINDER_CHUNK_SIZE);
      await ctx.scheduler.runAfter(
        (i / REMINDER_CHUNK_SIZE) * 2000,
        internal.pushActions.sendWorkoutReminderChunk,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { userIds: chunk } as any,
      );
    }

    return { scheduledChunks: Math.ceil(userIds.length / REMINDER_CHUNK_SIZE) };
  },
});

/**
 * Process a chunk of users for the daily workout reminder cron.
 * Internal — only invoked by `sendWorkoutReminders`.
 */
export const sendWorkoutReminderChunk = internalAction({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const internal: InternalApi = await getInternal();
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      console.error("VAPID keys not configured");
      return { sent: 0, skipped: args.userIds.length };
    }
    webPush.setVapidDetails("mailto:admin@gympro.app", publicKey, privateKey);

    let sent = 0;
    let skipped = 0;

    // Per-user lookups for this chunk in parallel.
    const work = await Promise.all(
      args.userIds.map(async (userId) => {
        const [hasSession, prefs, sub] = await Promise.all([
          ctx.runQuery(internal.push.checkSessionToday, { userId }),
          ctx.runQuery(internal.push.getPreferencesInternal, { userId }),
          ctx.runQuery(internal.push.getSubscriptionInternal, { userId }),
        ]);
        return { userId, hasSession, prefs, sub };
      }),
    );

    for (const w of work) {
      if (w.hasSession || !w.prefs.workoutReminders || !w.sub || !w.sub.enabled) {
        skipped++;
        continue;
      }
      try {
        await webPush.sendNotification(
          {
            endpoint: w.sub.endpoint,
            keys: { p256dh: w.sub.p256dh, auth: w.sub.auth },
          },
          JSON.stringify({
            title: "Time to crush your workout! 💪",
            body: "Your coach is waiting. Let's make today count!",
            icon: "/icons/icon-192x192.png",
            badge: "/icons/badge-72x72.png",
            data: { url: "/user/session" },
          }),
        );
        sent++;
      } catch {
        skipped++;
      }
    }

    return { sent, skipped };
  },
});
