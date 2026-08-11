"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

/**
 * Ban a user in Clerk by their Clerk ID.
 * This is an internal action — only callable from other Convex functions.
 * Requires CLERK_SECRET_KEY in Convex environment variables.
 */
export const banUserInClerk = internalAction({
  args: {
    clerkId: v.string(),
  },
  handler: async (_ctx, args) => {
    const { createClerkClient } = await import("@clerk/backend");
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

    await clerkClient.users.banUser(args.clerkId);

    return { banned: true, clerkId: args.clerkId };
  },
});

/**
 * Unban a user in Clerk by their Clerk ID.
 * This is an internal action — only callable from other Convex functions.
 * Requires CLERK_SECRET_KEY in Convex environment variables.
 */
export const unbanUserInClerk = internalAction({
  args: {
    clerkId: v.string(),
  },
  handler: async (_ctx, args) => {
    const { createClerkClient } = await import("@clerk/backend");
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

    await clerkClient.users.unbanUser(args.clerkId);

    return { unbanned: true, clerkId: args.clerkId };
  },
});
