"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export type UserRole = "admin" | "coach" | "user";

/**
 * Resolves the authenticated Clerk user's role from the Convex `users` table.
 *
 * Returns `{ role, userId, isLoading }` — role is `null` until the user is
 * synced via the Clerk webhook or until Convex confirms the record exists.
 */
export function useUserRole() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();

  const convexUser = useQuery(
    api.auth.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip",
  );

  const isLoading = !clerkLoaded || convexUser === undefined;

  return {
    role: (convexUser?.role as UserRole | undefined) ?? null,
    userId: convexUser?._id ?? null,
    isLoading,
    isCoach: convexUser?.role === "coach",
    isAdmin: convexUser?.role === "admin",
    isUser: convexUser?.role === "user",
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
