import { internalMutation, type MutationCtx } from "./_generated/server";

/**
 * Rate limit configuration for different mutation types.
 */
export const RATE_LIMITS = {
  "messages:send": { limit: 20, windowMs: 60_000 }, // 20 messages per minute
  "push:saveSubscription": { limit: 5, windowMs: 60_000 }, // 5 requests per minute
  "auth:syncUser": { limit: 10, windowMs: 60_000 }, // 10 per minute
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;

/**
 * Check and enforce rate limiting for a given key.
 * Uses atomic operations to prevent race conditions.
 *
 * @param ctx - The Convex mutation context
 * @param key - The rate limit key (e.g., "userId:mutationName")
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @throws Error if rate limit is exceeded
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  key: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const now = Date.now();
  const expiresAt = now + windowMs;

  // Read with `take(2)` so the first-ever-request race (BUG-050) can be
  // healed defensively: if two concurrent inserts both committed (Convex OCC
  // does not detect insert/insert conflicts on disjoint documents within an
  // index range), we collapse the duplicates here instead of letting a future
  // `.unique()` throw "expected at most one" forever.
  const rows = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .take(2);

  let existing = rows[0];

  if (rows.length > 1) {
    // Merge duplicate(s): keep the row with the highest count, delete the rest.
    const [primary, ...extras] = [...rows].sort((a, b) => b.count - a.count);
    existing = primary;
    let mergedCount = primary!.count;
    let mergedExpiresAt = primary!.expiresAt;
    for (const dup of extras) {
      mergedCount += dup.count;
      mergedExpiresAt = Math.max(mergedExpiresAt, dup.expiresAt);
      await ctx.db.delete(dup._id);
    }
    await ctx.db.patch(primary!._id, {
      count: mergedCount,
      expiresAt: mergedExpiresAt,
    });
  }

  if (existing) {
    // Check if the window has expired
    if (existing.expiresAt <= now) {
      // Window expired, reset the counter
      await ctx.db.patch(existing._id, {
        count: 1,
        expiresAt,
      });
      return;
    }

    // Check if limit is exceeded
    if (existing.count >= limit) {
      const retryAfter = Math.ceil((existing.expiresAt - now) / 1000);
      throw new Error(
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      );
    }

    // Increment the counter
    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
    });
  } else {
    // No existing entry, create one
    await ctx.db.insert("rateLimits", {
      key,
      count: 1,
      expiresAt,
    });
  }
}

/**
 * Convenience function to check rate limit for a predefined mutation type.
 * Automatically looks up the limit configuration.
 */
export async function checkMutationRateLimit(
  ctx: MutationCtx,
  rateLimitKey: RateLimitKey,
  userId: string,
): Promise<void> {
  const config = RATE_LIMITS[rateLimitKey];
  if (!config) {
    throw new Error(`Unknown rate limit key: ${rateLimitKey}`);
  }

  const key = `${userId}:${rateLimitKey}`;
  await checkRateLimit(ctx, key, config.limit, config.windowMs);
}

/**
 * Cleanup expired rate limit entries.
 * This can be called periodically via a cron job.
 */
export async function cleanupExpiredRateLimits(ctx: MutationCtx): Promise<number> {
  const now = Date.now();
  const expired = await ctx.db
    .query("rateLimits")
    .filter((q) => q.lt(q.field("expiresAt"), now))
    .take(100);

  let deleted = 0;
  for (const entry of expired) {
    await ctx.db.delete(entry._id);
    deleted++;
  }

  return deleted;
}

/**
 * Cron-scheduled cleanup of expired rate-limit rows.
 *
 * Closes BUG-058: previously a public `mutation` reachable by anyone, now an
 * `internalMutation` callable only from the scheduler / cron / other Convex
 * functions.
 */
export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await cleanupExpiredRateLimits(ctx);
  },
});
