import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

// ─── Proxy (replaces deprecated middleware) ─────────────────────────

export const proxy = clerkMiddleware(async (auth, req) => {
  const authObject = await auth();

  // Public routes bypass auth entirely
  if (isPublicRoute(req)) {
    // If already signed in and hitting sign-in/sign-up, redirect to dashboard
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

  // Extract role from session claims (set by Clerk after JWT generation)
  const role = (authObject.sessionClaims?.metadata as Record<string, unknown> | undefined)
    ?.role as string | undefined;

  // Admin routes: require admin role
  if (isAdminRoute(req) && role !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // Coach routes: require coach or admin role
  if (isCoachRoute(req) && role !== "coach" && role !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
