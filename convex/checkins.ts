import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireIdentity, requireSelf, requireCoachOfClient } from "./auth";
import { checkMutationRateLimit } from "./rateLimit";

// ─── Queries ────────────────────────────────────────────────────────

/** Get all checkins for a user — self, assigned coach, or admin only. */
export const getUserCheckins = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);

    // Identity binding — closes the IDOR variant of BUG-003.
    if (caller._id !== args.userId && caller.role !== "admin") {
      if (caller.role !== "coach") {
        throw new Error("Forbidden: cannot read another user's checkins");
      }
      const target = await ctx.db.get(args.userId);
      if (!target || target.coachId !== caller._id) {
        throw new Error("Forbidden: not the assigned coach for this client");
      }
    }

    const checkins = await ctx.db
      .query("checkins")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(52); // Last year of checkins

    // Get photo URLs
    const enriched = await Promise.all(
      checkins.map(async (checkin) => {
        const photoUrls = await Promise.all(
          checkin.photoStorageIds.map(async (storageId) => {
            const url = await ctx.storage.getUrl(storageId);
            return url;
          }),
        );

        return {
          ...checkin,
          photoUrls: photoUrls.filter((url): url is string => url !== null),
        };
      }),
    );

    return enriched;
  },
});

/** Get the latest checkin for a user — self, assigned coach, or admin only. */
export const getLatestCheckin = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);

    if (caller._id !== args.userId && caller.role !== "admin") {
      if (caller.role !== "coach") {
        throw new Error("Forbidden: cannot read another user's checkins");
      }
      const target = await ctx.db.get(args.userId);
      if (!target || target.coachId !== caller._id) {
        throw new Error("Forbidden: not the assigned coach for this client");
      }
    }

    const checkins = await ctx.db
      .query("checkins")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(1);

    if (checkins.length === 0) return null;

    const checkin = checkins[0]!;
    const photoUrls = await Promise.all(
      checkin.photoStorageIds.map(async (storageId) => {
        const url = await ctx.storage.getUrl(storageId);
        return url;
      }),
    );

    return {
      ...checkin,
      photoUrls: photoUrls.filter((url): url is string => url !== null),
    };
  },
});

/** Get checkin comparison data for coach — assigned coach or admin only. */
export const getCheckinComparison = query({
  args: {
    userId: v.id("users"),
    week1: v.number(),
    week2: v.number(),
  },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);
    if (caller._id !== args.userId && caller.role !== "admin") {
      if (caller.role !== "coach") {
        throw new Error("Forbidden: cannot read another user's checkins");
      }
      const target = await ctx.db.get(args.userId);
      if (!target || target.coachId !== caller._id) {
        throw new Error("Forbidden: not the assigned coach for this client");
      }
    }

    const [checkin1, checkin2] = await Promise.all([
      ctx.db
        .query("checkins")
        .withIndex("by_userId_weekNumber", (q) =>
          q.eq("userId", args.userId).eq("weekNumber", args.week1),
        )
        .unique(),
      ctx.db
        .query("checkins")
        .withIndex("by_userId_weekNumber", (q) =>
          q.eq("userId", args.userId).eq("weekNumber", args.week2),
        )
        .unique(),
    ]);

    const getPhotos = async (checkin: typeof checkin1 | typeof checkin2) => {
      if (!checkin) return [];
      const urls = await Promise.all(
        checkin.photoStorageIds.map(async (storageId) => {
          const url = await ctx.storage.getUrl(storageId);
          return url;
        }),
      );
      return urls.filter((url): url is string => url !== null);
    };

    return {
      week1: checkin1
        ? { ...checkin1, photoUrls: await getPhotos(checkin1) }
        : null,
      week2: checkin2
        ? { ...checkin2, photoUrls: await getPhotos(checkin2) }
        : null,
    };
  },
});

// ─── Mutations ──────────────────────────────────────────────────────

/**
 * Generate a short-lived upload URL for progress photos.
 *
 * Closes BUG-010: previously unauthenticated and unbounded, this is now gated
 * by auth + rate limit so unsolicited callers cannot cost-DoS the storage tier
 * or use the platform to host arbitrary content.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const caller = await requireIdentity(ctx);
    // Rate limit: reuse the push-subscription bucket key (5/min) — sufficient
    // for the legitimate 4-photo flow with a couple of retries.
    await checkMutationRateLimit(ctx, "push:saveSubscription", caller._id);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Submit a weekly checkin — strict self-only (closes BUG-003). */
export const submitCheckin = mutation({
  args: {
    userId: v.id("users"),
    weekNumber: v.number(),
    weight: v.optional(v.number()),
    bodyFat: v.optional(v.number()),
    notes: v.optional(v.string()),
    photoStorageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);

    // Validate weekNumber
    if (args.weekNumber < 1 || args.weekNumber > 53) {
      throw new Error("Invalid week number");
    }

    // Validate weight/bodyFat if provided
    if (args.weight !== undefined && (args.weight < 0 || args.weight > 1000)) {
      throw new Error("Weight must be between 0 and 1000 kg");
    }
    if (args.bodyFat !== undefined && (args.bodyFat < 0 || args.bodyFat > 100)) {
      throw new Error("Body fat must be between 0 and 100");
    }

    // Photo array bound — prevents BUG-056 (unbounded growth via storage spam)
    if (args.photoStorageIds.length > 6) {
      throw new Error("Maximum 6 photos per check-in");
    }

    // Check if checkin for this week already exists
    const existing = await ctx.db
      .query("checkins")
      .withIndex("by_userId_weekNumber", (q) =>
        q.eq("userId", args.userId).eq("weekNumber", args.weekNumber),
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        weight: args.weight,
        bodyFat: args.bodyFat,
        notes: args.notes,
        photoStorageIds: args.photoStorageIds,
        status: "submitted",
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("checkins", {
      userId: args.userId,
      weekNumber: args.weekNumber,
      weight: args.weight,
      bodyFat: args.bodyFat,
      notes: args.notes,
      photoStorageIds: args.photoStorageIds,
      status: "submitted",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Coach reviews a checkin — only for clients assigned to the caller.
 *
 * Closes BUG-029: previously any coach could review any client's checkin.
 */
export const reviewCheckin = mutation({
  args: {
    checkinId: v.id("checkins"),
    status: v.union(v.literal("reviewed"), v.literal("pending")),
  },
  handler: async (ctx, args) => {
    const checkin = await ctx.db.get(args.checkinId);
    if (!checkin) throw new Error("Checkin not found");

    await requireCoachOfClient(ctx, checkin.userId);

    await ctx.db.patch(args.checkinId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});
