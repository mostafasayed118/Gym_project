import { action, internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// ─── ExerciseDB (RapidAPI) integration ──────────────────────────────
//
// The exercisedb/exercisedb-api repo is a marketing/README repo — the actual
// product is the hosted API at https://exercisedb.dev (RapidAPI,
// exercisedb.p.rapidapi.com, key via `X-RapidAPI-Key`).
//
// Integration strategy: **sync once, serve locally.** An admin triggers
// `syncCatalog`, which imports the full exercise catalog (~11k rows) into the
// Convex `exercises` table. All reads (search, filters, stats) are then served
// from Convex — zero per-request API cost, latency, or key exposure. The API
// key lives only in the Convex env (`EXERCISEDB_API_KEY`).

const EXERCISEDB_HOST = "exercisedb.p.rapidapi.com";
const EXERCISEDB_BASE = `https://${EXERCISEDB_HOST}`;

// The API's documented max page size.
const PAGE_SIZE = 200;

// Safety cap for scheduling when the API omits X-Total-Count.
const MAX_PAGES = 60;

interface ExerciseDbRow {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles?: string[];
  gifUrl?: string;
  instructions?: string[];
}

/** Fetch one page of the catalog. Returns rows + an optional total count. */
async function fetchPage(
  offset: number,
  apiKey: string,
): Promise<{ rows: ExerciseDbRow[]; total: number | null }> {
  const url = `${EXERCISEDB_BASE}/exercises?limit=${PAGE_SIZE}&offset=${offset}`;
  const res = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": EXERCISEDB_HOST,
    },
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("ExerciseDB rate limit exceeded (429) — retry later");
    }
    throw new Error(`ExerciseDB API error ${res.status}: ${await res.text()}`);
  }

  const totalHeader = res.headers.get("x-total-count");
  const total = totalHeader ? Number.parseInt(totalHeader, 10) || null : null;
  const rows = (await res.json()) as ExerciseDbRow[];
  return { rows, total };
}

/**
 * Admin-only coordinator. Upserts the catalog page by page, scheduling one
 * `syncPage` action per page staggered so we never burst the RapidAPI free
 * tier. Returns how many pages were scheduled.
 *
 * Upsert-by-id is idempotent and safe to re-run (pages can be re-fetched if a
 * request is rate-limited or fails). Rows removed upstream are not pruned —
 * harmless for a fitness catalog, where exercises are rarely deleted.
 */
export const syncCatalog = action({
  args: {
    // Stagger between scheduled page syncs in ms. RapidAPI free tiers are
    // rate-limited (commonly ~10 req/min); raise this if you see 429s.
    requestIntervalMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: not authenticated");
    }
    const caller = await ctx.runQuery(api.auth.getUserByClerkId, {
      clerkId: identity.subject,
    });
    if (!caller || caller.role !== "admin") {
      throw new Error("Forbidden: admin role required to sync the catalog");
    }

    const apiKey = process.env.EXERCISEDB_API_KEY;
    if (!apiKey) {
      throw new Error(
        "EXERCISEDB_API_KEY not configured — set it on the Convex deployment first",
      );
    }

    // Fetch page 0 inline so we learn the total and don't schedule pages that
    // don't exist.
    const first = await fetchPage(0, apiKey);
    if (first.rows.length > 0) {
      await ctx.runMutation(internal.exerciseDb.upsertBatch, {
        exercises: first.rows,
      });
    }

    const total = first.total ?? first.rows.length;
    const pageCount = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);
    const interval = Math.max(args.requestIntervalMs ?? 6000, 1000);

    let scheduled = 0;
    for (let page = 1; page < pageCount; page++) {
      await ctx.scheduler.runAfter(
        page * interval,
        internal.exerciseDb.syncPage,
        { offset: page * PAGE_SIZE },
      );
      scheduled++;
    }

    return {
      scheduledPages: scheduled,
      totalExercises: total,
      firstPageUpserted: first.rows.length,
      requestIntervalMs: interval,
    };
  },
});

/** Fetch one page of the catalog and upsert it. Internal — scheduled only. */
export const syncPage = internalAction({
  args: { offset: v.number() },
  handler: async (ctx, args) => {
    const apiKey = process.env.EXERCISEDB_API_KEY;
    if (!apiKey) {
      console.error("EXERCISEDB_API_KEY not configured — syncPage skipped");
      return { inserted: 0 };
    }

    const { rows } = await fetchPage(args.offset, apiKey);
    if (rows.length === 0) return { inserted: 0 };

    await ctx.runMutation(internal.exerciseDb.upsertBatch, { exercises: rows });
    return { inserted: rows.length };
  },
});

/** Internal: insert-or-patch one batch of exercises by ExerciseDB id. */
export const upsertBatch = internalMutation({
  args: {
    exercises: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        bodyPart: v.string(),
        equipment: v.string(),
        target: v.string(),
        secondaryMuscles: v.optional(v.array(v.string())),
        gifUrl: v.optional(v.string()),
        instructions: v.optional(v.array(v.string())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const ex of args.exercises) {
      const searchTerms = ex.name.trim().toLowerCase();
      const existing = await ctx.db
        .query("exercises")
        .withIndex("by_exerciseDbId", (q) => q.eq("exerciseDbId", ex.id))
        .first();

      const fields = {
        exerciseDbId: ex.id,
        name: ex.name.trim(),
        bodyPart: ex.bodyPart,
        equipment: ex.equipment,
        target: ex.target,
        secondaryMuscles: ex.secondaryMuscles ?? [],
        gifUrl: ex.gifUrl,
        instructions: ex.instructions,
        searchTerms,
      };

      if (existing) {
        await ctx.db.patch(existing._id, fields);
        updated++;
      } else {
        await ctx.db.insert("exercises", fields);
        inserted++;
      }
    }

    return { inserted, updated };
  },
});

// ─── Public reads (served entirely from the local catalog) ──────────

/**
 * Search the local catalog. Supports a case-insensitive name prefix plus
 * optional bodyPart / equipment / target filters. Used by the plan-builder
 * exercise picker. Public — the catalog is a non-sensitive public dataset.
 */
export const search = query({
  args: {
    query: v.optional(v.string()),
    bodyPart: v.optional(v.string()),
    equipment: v.optional(v.string()),
    target: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 50);
    const q = (args.query ?? "").trim().toLowerCase();
    const { bodyPart, equipment, target } = args;

    let rows;
    if (q.length > 0) {
      rows = await ctx.db
        .query("exercises")
        .withIndex("by_searchTerms", (idx) =>
          idx.gte("searchTerms", q).lt("searchTerms", q + "\uffff"),
        )
        .collect();
    } else if (bodyPart) {
      rows = await ctx.db
        .query("exercises")
        .withIndex("by_bodyPart", (idx) => idx.eq("bodyPart", bodyPart))
        .collect();
    } else if (equipment) {
      rows = await ctx.db
        .query("exercises")
        .withIndex("by_equipment", (idx) => idx.eq("equipment", equipment))
        .collect();
    } else if (target) {
      rows = await ctx.db
        .query("exercises")
        .withIndex("by_target", (idx) => idx.eq("target", target))
        .collect();
    } else {
      rows = await ctx.db.query("exercises").take(limit);
    }

    const filtered = rows.filter(
      (e) =>
        (!args.bodyPart || e.bodyPart === args.bodyPart) &&
        (!args.equipment || e.equipment === args.equipment) &&
        (!args.target || e.target === args.target),
    );

    return filtered.slice(0, limit).map((e) => ({
      _id: e._id,
      exerciseDbId: e.exerciseDbId,
      name: e.name,
      bodyPart: e.bodyPart,
      equipment: e.equipment,
      target: e.target,
      gifUrl: e.gifUrl,
    }));
  },
});

/** Distinct body parts, for the picker filter. Public. */
export const listBodyParts = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("exercises").collect();
    return Array.from(new Set(rows.map((e) => e.bodyPart))).sort();
  },
});

/** Distinct equipment types, for the picker filter. Public. */
export const listEquipment = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("exercises").collect();
    return Array.from(new Set(rows.map((e) => e.equipment))).sort();
  },
});

/** Distinct target muscles, for the picker filter. Public. */
export const listTargets = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("exercises").collect();
    return Array.from(new Set(rows.map((e) => e.target))).sort();
  },
});

/** Catalog size + last-sync info for the admin Mission Control card. */
export const getCatalogStats = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("exercises").collect();
    const latest = await ctx.db.query("exercises").order("desc").first();
    return {
      total: rows.length,
      lastSyncedAt: latest?._creationTime ?? null,
      bodyPartCount: new Set(rows.map((e) => e.bodyPart)).size,
      apiKeyConfigured: Boolean(process.env.EXERCISEDB_API_KEY),
    };
  },
});
