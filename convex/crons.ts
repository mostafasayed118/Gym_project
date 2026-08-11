import { cronJobs } from "convex/server";
import type { FunctionReference } from "convex/server";

const crons = cronJobs();

// Send daily workout reminders at 5 PM
// Note: This cron job requires VAPID keys to be set in environment variables
// See: https://docs.convex.dev/cron-jobs
// Using FunctionReference to avoid circular type dependency with api.d.ts
crons.cron(
  "daily-workout-reminders",
  "0 17 * * *",
  "pushActions:sendWorkoutReminders" as unknown as FunctionReference<"action", "internal">,
);

// Clean up expired rate limits every 15 minutes
crons.cron(
  "cleanup-rate-limits",
  "*/15 * * * *",
  "rateLimit:cleanupExpired" as unknown as FunctionReference<"mutation", "internal">,
);

// Send weekly summary emails to active clients every Sunday at 18:00 UTC.
// The action fans out to every user with role="user" and at least one
// completed session or PR in the last 7 days.
crons.cron(
  "weekly-summary-emails",
  "0 18 * * 0",
  "emailActions:sendWeeklySummariesToAll" as unknown as FunctionReference<"action", "internal">,
);

// Nightly archival of audit logs older than 365 days. Closes BUG-052:
// `archiveOldLogs` existed but was never scheduled, so audit data grew
// unbounded — degrading the admin Mission Control queries.
crons.cron(
  "archive-old-audit-logs",
  "0 3 * * *",
  "audit:archiveOldLogs" as unknown as FunctionReference<"mutation", "internal">,
);

export default crons;
