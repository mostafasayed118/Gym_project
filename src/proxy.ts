import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ─── Proxy (replaces deprecated middleware) ─────────────────────────
//
// `createRouteMatcher` was removed (deprecated by Clerk, and middleware-level
// auth gating is bypassable — GHSA-vqx2-fgx2-5wq9). All authentication and
// authorization now happens at the resource level:
//
//   - `requireAuth()` / `requireRole()` / `requireCoachAccess()` from
//     `@/lib/auth-server` in every protected page/layout
//   - `auth.protect()` in Route Handlers (e.g. `/api/push/subscribe`)
//
// What remains here is NOT an auth guarantee — only two UX optimizations that
// can be deleted without exposing anything:
//
//   1. Bounce signed-in users away from /sign-in and /sign-up.
//   2. Early redirect for signed-out users (saves them a page render; the
//      resource-level checks still enforce everything).
//
// `clerkMiddleware()` itself must stay — Clerk requires it for auth to work.

export const proxy = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;

  // UX only: authenticated users don't belong on the auth pages.
  if (
    userId &&
    (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Early redirect for signed-out users. Pure performance optimization — the
  // resource-level checks remain the source of truth. Webhooks are exempt so
  // svix/Stripe-signed requests always reach their handlers.
  if (!userId && !isPublicPath(pathname)) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/health") ||
    // Vercel cron hits are unauthenticated but bearer-guarded (CRON_SECRET).
    pathname.startsWith("/api/cron")
  );
}

export const config = {
  matcher: [
    "/((?!monitoring|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
