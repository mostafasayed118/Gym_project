import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import Stripe from "stripe"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"

// Initialize Stripe only if the secret key is available
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-05-27.dahlia",
    })
  : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
const convex = new ConvexHttpClient(convexUrl)

type ConvexStatus = "active" | "past_due" | "canceled" | "trialing"

// `current_period_start` / `current_period_end` are documented Stripe
// Subscription fields but are missing from the SDK types for the pinned API
// version, so the runtime object is narrowed to the shape the webhook needs.
type StripePeriodFields = {
  current_period_start: number
  current_period_end: number
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Resolve a Convex userId from Stripe event data. Tries (in order):
 *   1. session.client_reference_id  (Checkout Session metadata)
 *   2. subscription.metadata.userId (set at subscription_data.metadata on checkout)
 *   3. existing subscriptions row keyed by stripeCustomerId
 *
 * The first two paths close BUG-005 (new-customer onboarding silently dropped
 * because no subscription row existed yet). The third is back-compat for
 * accounts created before the metadata flow was wired.
 *
 * IMPORTANT: when creating a Stripe Checkout session, ALWAYS pass
 *   client_reference_id: <convex userId>
 *   subscription_data: { metadata: { userId: <convex userId> } }
 * Otherwise this webhook cannot identify new customers.
 */
async function resolveUserId(opts: {
  clientReferenceId?: string | null
  metadataUserId?: string | null
  stripeCustomerId: string | null
}): Promise<string | null> {
  if (opts.clientReferenceId) return opts.clientReferenceId
  if (opts.metadataUserId) return opts.metadataUserId
  if (!opts.stripeCustomerId) return null

  const subscriptions = await convex.query(
    api.subscriptions.findByStripeCustomerId,
    {
      stripeCustomerId: opts.stripeCustomerId,
      secret: process.env.CONVEX_BILLING_WEBHOOK_SECRET ?? "",
    },
  )
  const first = subscriptions[0] ?? null
  return first?.userId ?? null
}

async function upsertSubscription(data: {
  userId: string
  stripeSubscriptionId: string
  stripeCustomerId: string
  status: ConvexStatus
  priceId: string
  currentPeriodStart: number
  currentPeriodEnd: number
  eventCreated?: number
}) {
  const billingSecret = process.env.CONVEX_BILLING_WEBHOOK_SECRET
  return await convex.mutation(api.subscriptions.upsert, {
    ...data,
    userId: data.userId as Id<"users">,
    secret: billingSecret ?? "",
  })
}

async function promoteToCoach(userId: string, source: string): Promise<void> {
  const billingSecret = process.env.CONVEX_BILLING_WEBHOOK_SECRET
  if (!billingSecret) {
    console.error(
      "CONVEX_BILLING_WEBHOOK_SECRET is not set; skipping coach promotion",
    )
    return
  }
  try {
    await convex.mutation(api.subscriptions.promoteToCoachFromBilling, {
      userId: userId as Id<"users">,
      source,
      secret: billingSecret,
    })
  } catch (err) {
    console.error(
      `Coach promotion failed for userId=${userId} (source=${source}):`,
      err,
    )
  }
}

/**
 * Webhook idempotency. Returns true if the event has already been recorded as
 * processed. Closes BUG-022.
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  try {
    const result = await convex.query(api.subscriptions.isWebhookEventProcessed, {
      provider: "stripe",
      eventId,
      secret: process.env.CONVEX_BILLING_WEBHOOK_SECRET ?? "",
    })
    return result === true
  } catch (err) {
    // Fail-open on dedupe check — better to risk a double-apply (mutations
    // are mostly idempotent) than to drop a real event.
    console.error("Failed to check webhook event idempotency:", err)
    return false
  }
}

async function markEventProcessed(
  eventId: string,
  eventType: string,
  eventCreated: number,
): Promise<void> {
  const billingSecret = process.env.CONVEX_BILLING_WEBHOOK_SECRET
  if (!billingSecret) return // already logged above
  try {
    await convex.mutation(api.subscriptions.markWebhookEventProcessed, {
      provider: "stripe",
      eventId,
      eventType,
      eventCreated,
      secret: billingSecret,
    })
  } catch (err) {
    // Non-fatal: if marking fails, the next retry will re-apply the event
    // but the underlying mutations are designed to be idempotent.
    console.error("Failed to mark webhook event processed:", err)
  }
}

// ─── Handler ────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  if (!stripe || !webhookSecret) {
    console.warn("Stripe webhook received but Stripe is not configured")
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    )
  }

  const headerStore = await headers()
  const sig = headerStore.get("stripe-signature")
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    )
  }

  const body = await request.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Idempotency check — skip if we've already processed this event.id.
  if (await isEventProcessed(event.id)) {
    return NextResponse.json({ received: true, deduped: true }, { status: 200 })
  }

  const eventCreated = event.created // UNIX seconds

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        // Try the metadata fast paths before falling back to a subscription
        // lookup. Closes BUG-005.
        const userId = await resolveUserId({
          clientReferenceId: session.client_reference_id,
          metadataUserId:
            (session.metadata?.userId as string | undefined) ?? null,
          stripeCustomerId: (session.customer as string | null) ?? null,
        })

        if (!userId) {
          console.error(
            "checkout.session.completed: could not resolve userId for session",
            session.id,
          )
          break
        }

        if (session.subscription) {
          const stripeSub = await stripe.subscriptions.retrieve(
            session.subscription as string,
          )
          // retrieve() returns Stripe.Response<Subscription> (Subscription &
          // lastResponse); hop through `unknown` to add the period fields the
          // SDK types omit for the pinned API version.
          const subData = stripeSub as unknown as Stripe.Subscription &
            StripePeriodFields
          const mappedStatus = mapStripeStatus(stripeSub.status)

          await upsertSubscription({
            userId,
            stripeSubscriptionId: stripeSub.id,
            stripeCustomerId: stripeSub.customer as string,
            status: mappedStatus,
            priceId: stripeSub.items.data[0]?.price?.id ?? "",
            currentPeriodStart: subData.current_period_start,
            currentPeriodEnd: subData.current_period_end,
            eventCreated,
          })

          // Auto-promote only after the subscription has actually landed in
          // a paying state.
          if (mappedStatus === "active" || mappedStatus === "trialing") {
            await promoteToCoach(userId, "stripe.checkout.session.completed")
          }
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const subData = subscription as Stripe.Subscription & StripePeriodFields

        const userId = await resolveUserId({
          clientReferenceId: null,
          metadataUserId:
            (subscription.metadata?.userId as string | undefined) ?? null,
          stripeCustomerId: subscription.customer as string,
        })

        if (!userId) {
          console.error(
            `${event.type}: could not resolve userId for sub`,
            subscription.id,
          )
          break
        }

        const mappedStatus = mapStripeStatus(subscription.status)
        await upsertSubscription({
          userId,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          status: mappedStatus,
          priceId: subscription.items.data[0]?.price?.id ?? "",
          currentPeriodStart: subData.current_period_start,
          currentPeriodEnd: subData.current_period_end,
          eventCreated,
        })

        // Auto-promote on `created` if the new subscription is active/trialing
        // and the user is still on the `user` role. (Idempotent — promotion
        // mutation no-ops if already coach.)
        if (
          event.type === "customer.subscription.created" &&
          (mappedStatus === "active" || mappedStatus === "trialing")
        ) {
          await promoteToCoach(userId, event.type)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        const existingList = await convex.query(
          api.subscriptions.findByStripeCustomerId,
          {
            stripeCustomerId: subscription.customer as string,
            secret: process.env.CONVEX_BILLING_WEBHOOK_SECRET ?? "",
          },
        )
        const existingSub = existingList[0] ?? null
        if (!existingSub) break

        await upsertSubscription({
          userId: existingSub.userId,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          status: "canceled",
          priceId: existingSub.priceId,
          currentPeriodStart: existingSub.currentPeriodStart,
          currentPeriodEnd: existingSub.currentPeriodEnd,
          eventCreated,
        })
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice

        // `parent.subscription_details.subscription` is the typed
        // (non-deprecated) invoice→subscription link in Stripe SDK 22. On
        // finalized invoices it is the subscription ID; full objects only
        // appear in `upcoming` previews, which never fire as webhook events.
        const subscriptionRef = invoice.parent?.subscription_details?.subscription
        if (typeof subscriptionRef === "string") {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionRef,
          )
          // Same `unknown` hop as above: retrieve() wraps in Response<>.
          const subData = subscription as unknown as Stripe.Subscription &
            StripePeriodFields

          const userId = await resolveUserId({
            clientReferenceId: null,
            metadataUserId:
              (subscription.metadata?.userId as string | undefined) ?? null,
            stripeCustomerId: subscription.customer as string,
          })

          if (!userId) {
            console.error(
              "invoice.payment_succeeded: could not resolve userId",
              invoice.id,
            )
            break
          }

          await upsertSubscription({
            userId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            status: "active",
            priceId: subscription.items.data[0]?.price?.id ?? "",
            currentPeriodStart: subData.current_period_start,
            currentPeriodEnd: subData.current_period_end,
            eventCreated,
          })
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice

        // `parent.subscription_details.subscription` is the typed
        // (non-deprecated) invoice→subscription link in Stripe SDK 22. On
        // finalized invoices it is the subscription ID; full objects only
        // appear in `upcoming` previews, which never fire as webhook events.
        const subscriptionRef = invoice.parent?.subscription_details?.subscription
        if (typeof subscriptionRef === "string") {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionRef,
          )
          // Same `unknown` hop as above: retrieve() wraps in Response<>.
          const subData = subscription as unknown as Stripe.Subscription &
            StripePeriodFields

          const userId = await resolveUserId({
            clientReferenceId: null,
            metadataUserId:
              (subscription.metadata?.userId as string | undefined) ?? null,
            stripeCustomerId: subscription.customer as string,
          })

          if (!userId) {
            console.error(
              "invoice.payment_failed: could not resolve userId",
              invoice.id,
            )
            break
          }

          await upsertSubscription({
            userId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            status: "past_due",
            priceId: subscription.items.data[0]?.price?.id ?? "",
            currentPeriodStart: subData.current_period_start,
            currentPeriodEnd: subData.current_period_end,
            eventCreated,
          })
        }
        break
      }

      default:
        // Unhandled events still get marked processed so retries don't loop.
        break
    }
  } catch (err) {
    console.error(`Error processing Stripe event ${event.type}:`, err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }

  // Mark as processed last so a mid-handler failure leaves the row absent and
  // Stripe's retry will re-attempt the work.
  await markEventProcessed(event.id, event.type, eventCreated)

  return NextResponse.json({ received: true }, { status: 200 })
}

/**
 * Map Stripe subscription status to our internal enum.
 *
 * Closes BUG-007: the default branch is now `"canceled"` (fail-safe) rather
 * than `"active"`. Unknown Stripe states must not grant access.
 *
 * Explicit mappings cover every documented Stripe subscription status as of
 * the pinned `2026-05-27.dahlia` API version.
 */
function mapStripeStatus(stripeStatus: string): ConvexStatus {
  switch (stripeStatus) {
    case "active":
      return "active"
    case "past_due":
      return "past_due"
    case "trialing":
      return "trialing"
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "canceled"
    default:
      // Fail-safe — unknown states must not grant access.
      console.warn(`Unknown Stripe subscription status: ${stripeStatus}`)
      return "canceled"
  }
}
