import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "");

export const dynamic = "force-dynamic";

/**
 * Public health endpoint (listed as public in `proxy.ts`).
 *
 * Liveness: always answers 200 while the app can serve requests.
 * Readiness (`?deep=true`): additionally probes the Convex backend with
 * `gamification.getBadgeDefinitions` — a public, static, no-arg query that
 * returns constant data, so the probe leaks nothing.
 */
export async function GET(request: NextRequest) {
  const base = {
    status: "ok",
    service: "gym-pro",
    timestamp: new Date().toISOString(),
  };

  const isDeep = request.nextUrl.searchParams.get("deep") === "true";
  if (!isDeep) {
    return NextResponse.json(base);
  }

  try {
    await convex.query(api.gamification.getBadgeDefinitions);
    return NextResponse.json({ ...base, convex: "ok" });
  } catch {
    return NextResponse.json(
      { ...base, status: "degraded", convex: "unreachable" },
      { status: 503 },
    );
  }
}
