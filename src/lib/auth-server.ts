import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "next/navigation";
import { api } from "@convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "");

type AuthContext = {
  role: string | null;
  status: string;
  hasActiveSubscription: boolean;
  /**
   * `true` when the Convex query failed. Resource gates fail closed on this
   * state (they can't prove a role), but they never redirect to the billing
   * prompt while Convex is unreachable. Closes BUG-021.
   */
  unavailable: boolean;
};

async function getAuthContext(clerkId: string): Promise<AuthContext> {
  try {
    const result = await convex.query(
      api.subscriptions.getAuthContextByClerkId,
      {
        clerkId,
        secret: process.env.CONVEX_BILLING_WEBHOOK_SECRET ?? "",
      },
    );
    if (!result) {
      return {
        role: null,
        status: "active",
        hasActiveSubscription: false,
        unavailable: false,
      };
    }
    return {
      role: result.role ?? null,
      status: result.status ?? "active",
      hasActiveSubscription: result.hasActiveSubscription ?? false,
      unavailable: false,
    };
  } catch {
    return {
      role: null,
      status: "active",
      hasActiveSubscription: false,
      unavailable: true,
    };
  }
}

/**
 * Resource-based auth gate (replaces the middleware-level checks that were
 * removed from `proxy.ts`). For document requests, `auth.protect()` redirects
 * signed-out users to the sign-in page; for Server Actions it returns 401, and
 * for Route Handlers 404.
 */
export async function requireAuth() {
  const session = await auth.protect();

  const ctx = await getAuthContext(session.userId);
  if (!ctx.unavailable && ctx.status === "suspended") {
    redirect("/unauthorized?reason=suspended");
  }

  return { session, ctx };
}

/**
 * Role gate for Server Components and layouts. Redirects to `/unauthorized`
 * when the caller's role isn't in `allowedRoles` (or can't be verified).
 */
export async function requireRole(allowedRoles: string[]) {
  const { session, ctx } = await requireAuth();
  const role = ctx.role ?? null;

  // Fail closed: if Convex is unreachable we can't prove the role, so treat
  // the request as unauthorized rather than letting it through.
  if (ctx.unavailable || !role || !allowedRoles.includes(role)) {
    redirect("/unauthorized");
  }

  return { session, role, ctx };
}

/**
 * Coach gate: requires coach or admin, and paying coaches only (admins
 * bypass billing). Lapsed/canceled coaches are redirected to `/dashboard`
 * with a query flag so the dashboard can surface a renewal prompt. When
 * Convex is unreachable, the role gate already failed closed above — so we
 * never redirect to `/dashboard?reason=billing` during an outage (BUG-021).
 */
export async function requireCoachAccess() {
  const result = await requireRole(["coach", "admin"]);

  if (
    result.role === "coach" &&
    !result.ctx.unavailable &&
    !result.ctx.hasActiveSubscription
  ) {
    redirect("/dashboard?reason=billing");
  }

  return result;
}

/**
 * Fetch a user's profile document by Clerk ID (used by layouts that render
 * the user's name/avatar in navigation).
 */
export function getUserProfile(clerkId: string) {
  return convex.query(api.auth.getUserByClerkId, { clerkId });
}
