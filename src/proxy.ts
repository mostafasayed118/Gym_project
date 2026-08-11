import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "@convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "");

// ─── Route matchers ─────────────────────────────────────────────────

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/(.*)",
  "/api/health(.*)",
]);

const isCoachRoute = createRouteMatcher(["/coach(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

// ─── Auth context lookup ────────────────────────────────────────────

type AuthContext = {
  role: string | null;
  status: string;
  hasActiveSubscription: boolean;
  /**
   * `true` when the Convex query failed. The proxy should fail-closed on most
   * routes but distinguish this from a real "no role / no subscription" state
   * so it can serve a 503 instead of silently locking paying coaches out.
   * Closes BUG-021.
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

// ─── Proxy (replaces deprecated middleware) ─────────────────────────

export const proxy = clerkMiddleware(async (auth, req) => {
  const authObject = await auth();

  // Public routes bypass auth entirely
  if (isPublicRoute(req)) {
    if (
      authObject.userId &&
      (req.nextUrl.pathname.startsWith("/sign-in") || req.nextUrl.pathname.startsWith("/sign-up"))
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Unauthenticated users go to sign-in
  if (!authObject.userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Single Convex round-trip: role + status + subscription status.
  const { role, status, hasActiveSubscription, unavailable } =
    await getAuthContext(authObject.userId);

  // If Convex is unreachable, surface a 503 rather than mass-redirecting
  // paying coaches to /dashboard?reason=billing during a transient outage.
  // Closes BUG-021. Admin routes still fail-closed (defense in depth).
  if (unavailable) {
    if (isAdminRoute(req) || isCoachRoute(req)) {
      return new NextResponse("Service temporarily unavailable", {
        status: 503,
      });
    }
    // For non-privileged routes during an outage, let the request through —
    // the data layer enforces auth independently.
    return NextResponse.next();
  }

  // Suspended users cannot access any protected route. Closes BUG-063.
  if (status === "suspended") {
    return NextResponse.redirect(new URL("/unauthorized?reason=suspended", req.url));
  }

  // Admin routes: require admin role
  if (isAdminRoute(req) && role !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // Coach routes: require coach or admin role
  if (isCoachRoute(req) && role !== "coach" && role !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // Coach routes: paying coaches only. Admins bypass billing.
  // Lapsed/canceled coaches are redirected to /dashboard with a query flag so
  // the dashboard can surface a "renew your subscription" prompt.
  if (
    isCoachRoute(req) &&
    role === "coach" &&
    !hasActiveSubscription
  ) {
    return NextResponse.redirect(new URL("/dashboard?reason=billing", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!monitoring|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
