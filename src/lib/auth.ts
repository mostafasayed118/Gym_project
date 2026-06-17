"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";

export type UserRole = "admin" | "coach" | "user";

/**
 * Resolves the authenticated Clerk user's role from the Convex `users` table.
 *
 * Returns `{ role, userId, isLoading }` — role is `null` until the user is
 * synced via the Clerk webhook or until Convex confirms the record exists.
 */
export function useUserRole() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();

  // After `npx convex dev`, replace this with:
  //   import { api } from "../../convex/_generated/api";
  //   useQuery(api.auth.getUserByClerkId, { clerkId: clerkUser.id })
  const convexUser = useQuery(
    "auth:getUserByClerkId" as FunctionReference<"query">,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip",
  );

  const isLoading = !clerkLoaded || convexUser === undefined;
  const role: UserRole | null = (convexUser as Record<string, unknown> | null)?.role as UserRole | null;
  const userId: string | null = (convexUser as Record<string, unknown> | null)?._id as string | null;

  return {
    role,
    userId,
    isLoading,
    isCoach: role === "coach",
    isAdmin: role === "admin",
    isUser: role === "user",
  };
}

/**
 * Server-side role guard. Use in Server Components or Route Handlers.
 */
export function canAccess(requiredRole: UserRole, userRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    admin: 3,
    coach: 2,
    user: 1,
  };
  return (hierarchy[userRole] ?? 0) >= (hierarchy[requiredRole] ?? 0);
}
