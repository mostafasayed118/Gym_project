import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Returns all clients assigned to a coach, enriched with:
 * - activePlan: the client's current active workout plan (or null)
 * - lastWorkoutDate: the date of the client's most recent session (or null)
 */
export const getCoachClients = query({
  args: { coachId: v.id("users") },
  handler: async (ctx, args) => {
    const clients = await ctx.db
      .query("users")
      .withIndex("by_coachId", (q) => q.eq("coachId", args.coachId))
      .collect();

    const enriched = await Promise.all(
      clients.map(async (client) => {
        const activePlan = await ctx.db
          .query("plans")
          .withIndex("by_clientId", (q) => q.eq("clientId", client._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .first();

        const lastSession = await ctx.db
          .query("sessions")
          .withIndex("by_clientId", (q) => q.eq("clientId", client._id))
          .order("desc")
          .first();

        return {
          _id: client._id,
          name: client.name,
          email: client.email,
          avatarUrl: client.avatarUrl,
          activePlan: activePlan ? { title: activePlan.title } : null,
          lastWorkoutDate: lastSession?.date ?? null,
        };
      }),
    );

    return enriched;
  },
});
