import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "next/navigation";
import { api } from "@convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "");

export async function requireAuth() {
  const session = await auth();
  if (!session.userId) redirect("/sign-in");
  return session;
}

/**
 * Server-side role guard for Next.js Route Handlers and Server Components.
 *
 * Closes BUG-049: the lookup is now strongly typed through the generated
 * `api` object. Renaming/relocating `auth.getUserByClerkId` will fail at
 * compile time instead of silently 500ing on every protected page.
 */
export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth();

  const user = await convex.query(api.auth.getUserByClerkId, {
    clerkId: session.userId,
  });
  const role = user?.role ?? null;

  if (!role || !allowedRoles.includes(role)) {
    redirect("/unauthorized");
  }

  return { session, role, user };
}
