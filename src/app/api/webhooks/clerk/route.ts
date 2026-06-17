import { Webhook } from "svix";
import { headers } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

// ─── Env ────────────────────────────────────────────────────────────
const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!CLERK_WEBHOOK_SECRET) {
  throw new Error("CLERK_WEBHOOK_SECRET is not set");
}

if (!CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

const convex = new ConvexHttpClient(CONVEX_URL);

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

// ─── Convex mutation helpers (string-based, no generated types) ──────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncUser(args: {
  clerkId: string;
  email: string;
  name: string;
  role: ConvexUserRole;
  avatarUrl?: string;
}): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await convex.mutation("auth:syncUser" as any, args as any);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deleteUser(args: { clerkId: string }): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await convex.mutation("auth:deleteUser" as any, args as any);
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

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
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

  try {
    switch (eventType) {
      case "user.created": {
        const parsed = userCreatedSchema.safeParse(data);
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

  return new Response("OK", { status: 200 });
}
