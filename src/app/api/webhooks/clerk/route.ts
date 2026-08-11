import { Webhook } from "svix";
import { headers } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { z } from "zod";

// ─── Env ────────────────────────────────────────────────────────────
function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "");

// ─── Zod schemas for idempotent payload validation ──────────────────

const userCreatedSchema = z.object({
  id: z.string(),
  email_addresses: z.array(
    z.object({
      email_address: z.string().email(),
      id: z.string(),
    }),
  ),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  image_url: z.string().url().optional(),
  public_metadata: z.record(z.string(), z.unknown()).optional(),
});

const userUpdatedSchema = z.object({
  id: z.string(),
  email_addresses: z.array(
    z.object({
      email_address: z.string().email(),
      id: z.string(),
    }),
  ),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  image_url: z.string().url().optional(),
  public_metadata: z.record(z.string(), z.unknown()).optional(),
});

const userDeletedSchema = z.object({
  id: z.string(),
});

// ─── Role mapping from Clerk metadata ───────────────────────────────

const ROLES = ["admin", "coach", "user"] as const;
type ConvexUserRole = (typeof ROLES)[number];

function resolveRole(metadata?: Record<string, unknown>): ConvexUserRole {
  const raw = metadata?.role;
  if (typeof raw === "string" && (ROLES as readonly string[]).includes(raw)) {
    return raw as ConvexUserRole;
  }
  return "user";
}

function buildName(first?: string | null, last?: string | null): string {
  const parts = [first, last].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Unknown User";
}

// ─── Convex mutation helpers ────────────────────────────────────────

async function syncUser(args: {
  clerkId: string;
  email: string;
  name: string;
  role: ConvexUserRole;
  avatarUrl?: string;
}): Promise<string> {
  return await convex.mutation(api.auth.syncUser, args);
}

async function deleteUser(args: { clerkId: string }): Promise<void> {
  try {
    await convex.mutation(api.auth.deleteUser, args);
  } catch {
    // User already deleted — idempotent
  }
}

async function sendWelcomeEmail(args: { email: string; name: string }): Promise<void> {
  if (!args.email) return;
  try {
    await convex.action(api.emailActions.sendWelcomeEmail, args);
  } catch (err) {
    // Email failure must NOT 500 the webhook (would trigger Svix retries
    // and re-run syncUser unnecessarily). Log and move on.
    console.error("Welcome email failed:", err);
  }
}

/**
 * Webhook idempotency — closes BUG-022 (Clerk variant). Svix retries the same
 * `svix-id`; without dedupe, every retry re-fires `sendWelcomeEmail`,
 * `syncUser`, and `deleteUser`.
 */
async function isEventProcessed(svixId: string): Promise<boolean> {
  try {
    const result = await convex.query(api.subscriptions.isWebhookEventProcessed, {
      provider: "clerk",
      eventId: svixId,
    });
    return result === true;
  } catch {
    return false; // Fail-open — better to risk double-apply than drop.
  }
}

async function markEventProcessed(
  svixId: string,
  eventType: string,
): Promise<void> {
  const billingSecret = process.env.CONVEX_BILLING_WEBHOOK_SECRET;
  if (!billingSecret) return;
  try {
    await convex.mutation(api.subscriptions.markWebhookEventProcessed, {
      provider: "clerk",
      eventId: svixId,
      eventType,
      secret: billingSecret,
    });
  } catch (err) {
    console.error("Failed to mark Clerk event processed:", err);
  }
}

// ─── Handler ────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const headerStore = await headers();
  const svixId = headerStore.get("svix-id");
  const svixTimestamp = headerStore.get("svix-timestamp");
  const svixSignature = headerStore.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await request.text();

  const wh = new Webhook(getEnvOrThrow("CLERK_WEBHOOK_SECRET"));
  let evt: { type: string; data: unknown };

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type: string; data: unknown };
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const eventType = evt.type;
  const data = evt.data;

  // Idempotency — skip if Svix has already retried this event.
  if (await isEventProcessed(svixId)) {
    return new Response("OK (deduped)", { status: 200 });
  }

  try {
    switch (eventType) {
      case "user.created": {
        const parsed = userCreatedSchema.safeParse(data);
        if (!parsed.success) {
          return new Response("Invalid payload", { status: 422 });
        }

        const u = parsed.data;
        const email = u.email_addresses[0]?.email_address ?? "";
        const name = buildName(u.first_name, u.last_name);
        const role = resolveRole(u.public_metadata);

        await syncUser({
          clerkId: u.id,
          email,
          name,
          role,
          avatarUrl: u.image_url,
        });

        await sendWelcomeEmail({ email, name });

        break;
      }

      case "user.updated": {
        const parsed = userUpdatedSchema.safeParse(data);
        if (!parsed.success) {
          return new Response("Invalid payload", { status: 422 });
        }

        const u = parsed.data;
        const email = u.email_addresses[0]?.email_address ?? "";
        const role = resolveRole(u.public_metadata);

        await syncUser({
          clerkId: u.id,
          email,
          name: buildName(u.first_name, u.last_name),
          role,
          avatarUrl: u.image_url,
        });

        break;
      }

      case "user.deleted": {
        const parsed = userDeletedSchema.safeParse(data);
        if (!parsed.success) {
          return new Response("Invalid payload", { status: 422 });
        }

        await deleteUser({ clerkId: parsed.data.id });

        break;
      }

      default:
        // Idempotent: unhandled events return 200
        break;
    }
  } catch (err) {
    console.error(`Error processing webhook event ${eventType}:`, err);
    return new Response("Internal server error", { status: 500 });
  }

  // Mark processed last so mid-handler failures retry safely.
  await markEventProcessed(svixId, eventType);

  return new Response("OK", { status: 200 });
}
