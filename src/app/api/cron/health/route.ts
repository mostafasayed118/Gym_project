import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "");

export const dynamic = "force-dynamic";

/**
 * Backend-outage alerting, wired to a Vercel cron (`vercel.json`).
 *
 * Vercel calls this endpoint on schedule and automatically sends
 * `Authorization: Bearer <CRON_SECRET>`. We fail closed: without the secret
 * the endpoint returns 401, so it can't be used as a free probing endpoint
 * by the public. On a failed deep probe (Convex unreachable), it POSTs an
 * alert to `ALERT_WEBHOOK_URL` (Slack/Discord/Teams-style `{ "text": ... }`
 * payload) and returns 503 so the cron run shows as failed in Vercel.
 *
 * The deep probe mirrors `/api/health?deep=true`: `gamification.getBadgeDefinitions`
 * is a public, static, no-arg query, so the probe leaks nothing.
 */
// eslint-disable-next-line @clerk/next/require-auth-protection -- Machine request: guarded by CRON_SECRET bearer token (Vercel cron), not a Clerk user session.
export async function GET(request: NextRequest) {
  // Machine-to-machine guard — Vercel cron sends this header automatically.
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("CRON_SECRET is not configured; refusing to run health cron");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await convex.query(api.gamification.getBadgeDefinitions);
    return NextResponse.json({ status: "ok", service: "gym-pro", checked: new Date().toISOString() });
  } catch (err) {
    console.error("Health cron: Convex deep probe failed", err);

    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `🚨 GymPro backend outage detected: Convex deep probe failed at ${new Date().toISOString()}. Check the health endpoint and deployment.`,
          }),
        });
      } catch (alertErr) {
        console.error("Health cron: failed to deliver alert to webhook", alertErr);
      }
    } else {
      // No webhook configured — surface loudly in logs so the outage is at
      // least visible in the platform's observability.
      console.error("Health cron: ALERT_WEBHOOK_URL not configured; alert not delivered");
    }

    return NextResponse.json(
      { status: "degraded", convex: "unreachable", checked: new Date().toISOString() },
      { status: 503 },
    );
  }
}
