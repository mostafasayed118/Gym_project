import {
  query,
  mutation,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./auth";
import type { Id } from "./_generated/dataModel";

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Server-side billing guard: throws unless `userId` has an active billing
 * relationship. Admins bypass unconditionally.
 *
 * Allowed subscription statuses: `"active"` and `"trialing"` (trial periods
 * are still paid plans). `"past_due"`, `"canceled"`, and the absence of any
 * subscription row all throw.
 *
 * @returns the subscription document on success, or `null` for admins.
 */
export async function requireActiveSubscription(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Admins are never billed — they always pass.
  if (user.role === "admin") {
    return null;
  }

  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  if (!subscription) {
    throw new Error("Forbidden: Active subscription required");
  }

  const isLive =
    subscription.status === "active" || subscription.status === "trialing";

  if (!isLive) {
    throw new Error("Forbidden: Active subscription required");
  }

  return subscription;
}

// ─── Queries ────────────────────────────────────────────────────────

/** Get subscription for a user */
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

/** Get subscription by Stripe subscription ID */
export const getByStripeSubscriptionId = query({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .unique();
  },
});

/**
 * Find subscriptions by Stripe customer ID using the dedicated composite
 * index. Closes BUG-030 (full-table scan per webhook event).
 */
export const findByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId),
      )
      .collect();
  },
});

/**
 * Webhook idempotency: returns true if `(provider, eventId)` has already been
 * recorded as processed. Used by the Stripe and Clerk webhook handlers to
 * short-circuit retries. (Closes BUG-022.)
 */
export const isWebhookEventProcessed = query({
  args: {
    provider: v.union(v.literal("stripe"), v.literal("clerk")),
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("processedWebhookEvents")
      .withIndex("by_provider_eventId", (q) =>
        q.eq("provider", args.provider).eq("eventId", args.eventId),
      )
      .unique();
    return existing !== null;
  },
});

/**
 * Mark a webhook event as processed. Must be called from inside the same
 * transaction (or at least before any retry would land).
 *
 * Like `promoteToCoachFromBilling`, this is webhook-only — requires the
 * shared secret. (Defense in depth — the table is benign if ever spammed,
 * but we don't want clients writing into it.)
 */
export const markWebhookEventProcessed = mutation({
  args: {
    provider: v.union(v.literal("stripe"), v.literal("clerk")),
    eventId: v.string(),
    eventType: v.string(),
    eventCreated: v.optional(v.number()),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      throw new Error("Forbidden: webhook ledger is server-only");
    }
    const expected = process.env.CONVEX_BILLING_WEBHOOK_SECRET;
    if (!expected || args.secret !== expected) {
      throw new Error("Forbidden: invalid billing secret");
    }
    // Idempotent insert — if the row already exists, return without throwing.
    const existing = await ctx.db
      .query("processedWebhookEvents")
      .withIndex("by_provider_eventId", (q) =>
        q.eq("provider", args.provider).eq("eventId", args.eventId),
      )
      .unique();
    if (existing) {
      return { alreadyProcessed: true };
    }
    await ctx.db.insert("processedWebhookEvents", {
      provider: args.provider,
      eventId: args.eventId,
      eventType: args.eventType,
      eventCreated: args.eventCreated,
      processedAt: Date.now(),
    });
    return { alreadyProcessed: false };
  },
});

/**
 * Combined edge-proxy lookup: returns the user's role and an
 * `hasActiveSubscription` flag in a single round-trip.
 *
 * Used by `src/proxy.ts` to enforce role-based + billing-based access on
 * `/admin/*` and `/coach/*` routes without making two Convex queries per
 * request.
 *
 * - Admins always report `hasActiveSubscription: true` (no billing requirement).
 * - Coaches/users report based on their active `subscriptions` row.
 * - Returns `null` if the user does not exist in Convex.
 */
export const getAuthContextByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) return null;

    if (user.role === "admin") {
      return {
        _id: user._id,
        role: user.role,
        status: user.status ?? "active",
        hasActiveSubscription: true,
      };
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const hasActiveSubscription =
      subscription !== null &&
      (subscription.status === "active" || subscription.status === "trialing");

    return {
      _id: user._id,
      role: user.role,
      status: user.status ?? "active",
      hasActiveSubscription,
    };
  },
});

// ─── Mutations ──────────────────────────────────────────────────────

/**
 * Upsert subscription (used by webhook handlers).
 *
 * If `eventCreated` is supplied (Stripe `event.created`, UNIX seconds), the
 * mutation refuses to apply an update older than the persisted
 * `lastWebhookEventAt`. This closes BUG-006 (canceled subs resurrected by
 * out-of-order `invoice.payment_succeeded`).
 *
 * Returns `{ id, skipped: false }` on apply, `{ id, skipped: true }` if the
 * update was older than the last applied event.
 */
export const upsert = mutation({
  args: {
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
    eventCreated: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .unique();

    const now = Date.now();

    if (existing) {
      // Ordering guard — reject updates older than the most recent applied.
      if (
        args.eventCreated !== undefined &&
        existing.lastWebhookEventAt !== undefined &&
        args.eventCreated < existing.lastWebhookEventAt
      ) {
        return { id: existing._id, skipped: true as const };
      }

      await ctx.db.patch(existing._id, {
        status: args.status,
        priceId: args.priceId,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        updatedAt: now,
        ...(args.eventCreated !== undefined
          ? { lastWebhookEventAt: args.eventCreated }
          : {}),
      });
      return { id: existing._id, skipped: false as const };
    }

    const newId = await ctx.db.insert("subscriptions", {
      userId: args.userId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      status: args.status,
      priceId: args.priceId,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      createdAt: now,
      updatedAt: now,
      lastWebhookEventAt: args.eventCreated,
    });
    return { id: newId, skipped: false as const };
  },
});

/**
 * Promote a user to `"coach"` after a successful checkout.
 *
 * TRUST MODEL — hardened (closes BUG-001):
 *
 * 1. The caller MUST present `secret` matching `CONVEX_BILLING_WEBHOOK_SECRET`
 *    (set in the Convex dashboard env). Without this, the mutation throws.
 * 2. The caller MUST NOT have an authenticated identity. Web clients always
 *    authenticate via Clerk → `ctx.auth.getUserIdentity()` returns a value.
 *    Webhooks have no identity. This double-check makes the surface
 *    unreachable from the browser even if `CONVEX_BILLING_WEBHOOK_SECRET`
 *    leaks into a client bundle.
 *
 * Future hardening: migrate to a Convex `httpAction` that verifies the Stripe
 * signature inside Convex, then promotes via an `internalMutation`. That
 * eliminates the shared-secret entirely.
 *
 * Idempotent: if the user is already `"coach"` or `"admin"`, this is a no-op.
 */
export const promoteToCoachFromBilling = mutation({
  args: {
    userId: v.id("users"),
    source: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    // Defense layer 1: a Clerk-authenticated client must not be able to call
    // this even with a leaked secret.
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      throw new Error("Forbidden: billing mutations are server-only");
    }

    // Defense layer 2: shared-secret check.
    const expected = process.env.CONVEX_BILLING_WEBHOOK_SECRET;
    if (!expected) {
      throw new Error(
        "CONVEX_BILLING_WEBHOOK_SECRET is not configured in the Convex deployment",
      );
    }
    if (args.secret !== expected) {
      throw new Error("Forbidden: invalid billing secret");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.role === "coach" || user.role === "admin") {
      return { changed: false, role: user.role };
    }

    await ctx.db.patch(args.userId, {
      role: "coach",
      updatedAt: Date.now(),
    });

    // Direct insert — we cannot call api.audit.logAuditEvent here because that
    // function admin-gates the inner identity, and a webhook has no identity.
    await ctx.db.insert("auditLogs", {
      actorId: args.userId,
      action: "COACH_PROMOTION_VIA_BILLING",
      targetEntity: "users",
      targetId: args.userId,
      metadata: {
        oldRole: user.role,
        newRole: "coach",
        source: args.source,
      },
      timestamp: Date.now(),
    });

    return { changed: true, role: "coach" as const };
  },
});

/** Cancel subscription (admin only) */
export const cancel = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    await ctx.db.patch(args.subscriptionId, {
      status: "canceled",
      updatedAt: Date.now(),
    });

    return true;
  },
});
