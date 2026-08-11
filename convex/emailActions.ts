"use node"

import { action, internalAction } from "./_generated/server"
import { api, internal } from "./_generated/api"
import { v } from "convex/values"

// ─── HTML escape (closes BUG-034) ───────────────────────────────────

/**
 * Escape a user-controlled string before interpolating into an HTML email
 * template. Prevents attackers from injecting `<script>`, `<img onerror>`,
 * `</style>` or CSS via Clerk-set display names.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Resend API client
async function sendEmail(args: {
  to: string
  subject: string
  html: string
  from?: string
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("RESEND_API_KEY not configured")
    return false
  }

  const from = args.from || "GymPro <noreply@gympro.app>"

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject: args.subject,
        html: args.html,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Resend API error:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Failed to send email:", error)
    return false
  }
}

// Email templates — `name` is HTML-escaped at the call site before interpolation.
const WELCOME_EMAIL = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e4e4e7; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 32px; font-weight: bold; color: #86efac; }
    .content { background: #18181b; border-radius: 16px; padding: 32px; border: 1px solid #27272a; }
    .title { font-size: 24px; font-weight: bold; margin-bottom: 16px; }
    .text { color: #a1a1aa; line-height: 1.6; margin-bottom: 16px; }
    .button { display: inline-block; background: #86efac; color: #0a0a0f; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .footer { text-align: center; margin-top: 32px; color: #52525b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">GymPro</div>
    </div>
    <div class="content">
      <h1 class="title">Welcome to GymPro! 💪</h1>
      <p class="text">Hi ${name},</p>
      <p class="text">We're excited to have you on board! GymPro is your all-in-one platform for tracking workouts, connecting with your coach, and achieving your fitness goals.</p>
      <p class="text">Here's what you can do:</p>
      <ul class="text">
        <li>Track your workouts in real-time</li>
        <li>View your personalized training plans</li>
        <li>Message your coach directly</li>
        <li>Monitor your progress and PRs</li>
      </ul>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://gympro.app'}/dashboard" class="button">Go to Dashboard</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} GymPro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`

const WEEKLY_SUMMARY_EMAIL = (name: string, stats: {
  sessionsCompleted: number
  totalVolume: number
  streak: number
  prs: number
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e4e4e7; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 32px; font-weight: bold; color: #86efac; }
    .content { background: #18181b; border-radius: 16px; padding: 32px; border: 1px solid #27272a; }
    .title { font-size: 24px; font-weight: bold; margin-bottom: 16px; }
    .text { color: #a1a1aa; line-height: 1.6; margin-bottom: 16px; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
    .stat { background: #27272a; border-radius: 12px; padding: 16px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #86efac; }
    .stat-label { font-size: 12px; color: #71717a; margin-top: 4px; }
    .button { display: inline-block; background: #86efac; color: #0a0a0f; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .footer { text-align: center; margin-top: 32px; color: #52525b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">GymPro</div>
    </div>
    <div class="content">
      <h1 class="title">Your Weekly Summary 📊</h1>
      <p class="text">Hi ${name},</p>
      <p class="text">Here's your workout summary for this week:</p>
      
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${stats.sessionsCompleted}</div>
          <div class="stat-label">Sessions</div>
        </div>
        <div class="stat">
          <div class="stat-value">${(stats.totalVolume / 1000).toFixed(1)}k</div>
          <div class="stat-label">Total Volume (kg)</div>
        </div>
        <div class="stat">
          <div class="stat-value">${stats.streak}</div>
          <div class="stat-label">Day Streak</div>
        </div>
        <div class="stat">
          <div class="stat-value">${stats.prs}</div>
          <div class="stat-label">New PRs</div>
        </div>
      </div>

      <p class="text">Keep up the great work! Your dedication is paying off.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://gympro.app'}/user/dashboard" class="button">View Dashboard</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} GymPro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`

// ─── Actions ────────────────────────────────────────────────────────

/** Send welcome email to new user (admin only or system) */
export const sendWelcomeEmail = action({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (_ctx, args) => {
    return await sendEmail({
      to: args.email,
      subject: "Welcome to GymPro! 💪",
      html: WELCOME_EMAIL(escapeHtml(args.name)),
    })
  },
})

/** Send weekly summary email */
export const sendWeeklySummary = action({
  args: {
    email: v.string(),
    name: v.string(),
    sessionsCompleted: v.number(),
    totalVolume: v.number(),
    streak: v.number(),
    prs: v.number(),
  },
  handler: async (_ctx, args) => {
    return await sendEmail({
      to: args.email,
      subject: "Your Weekly GymPro Summary 📊",
      html: WEEKLY_SUMMARY_EMAIL(escapeHtml(args.name), {
        sessionsCompleted: args.sessionsCompleted,
        totalVolume: args.totalVolume,
        streak: args.streak,
        prs: args.prs,
      }),
    })
  },
})

/**
 * Cron-driven fan-out: send weekly summary email to every active client.
 *
 * Scheduled in convex/crons.ts. Not publicly callable — admins can still
 * trigger via the Convex dashboard for ad-hoc testing.
 *
 * Per-user metrics:
 *   - sessionsCompleted: completed sessions in the last 7 days
 *   - streak           : userStats.currentStreak (live)
 *   - prs              : PR-tagged badges unlocked in the last 7 days
 *   - totalVolume      : userStats.totalVolume (all-time — proper weekly
 *                        volume requires walking sessionSets per user,
 *                        which is too expensive at platform scale; this
 *                        is a known v1 simplification)
 */
const WEEKLY_DIGEST_CHUNK_SIZE = 25

/**
 * Coordinator: paginates recipients and schedules per-chunk sub-actions.
 *
 * Previously this looped sequentially over every active client (one Convex
 * query + one Resend HTTP call per user, in band). At ~1k users the per-cron
 * wall-clock budget was exceeded, so reminders stopped firing for everyone.
 * (Closes BUG-020.) Each chunk now runs as an independent action with its own
 * time budget; retries also re-execute only the failed chunk's work.
 */
export const sendWeeklySummariesToAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const recipients: Array<{ _id: string; email: string; name: string }> =
      await ctx.runQuery(internal.users.listClientsForDigest, {})

    for (let i = 0; i < recipients.length; i += WEEKLY_DIGEST_CHUNK_SIZE) {
      const chunk = recipients.slice(i, i + WEEKLY_DIGEST_CHUNK_SIZE)
      await ctx.scheduler.runAfter(
        (i / WEEKLY_DIGEST_CHUNK_SIZE) * 2000,
        internal.emailActions.sendWeeklySummaryChunk,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { recipients: chunk } as any,
      )
    }

    return {
      scheduledChunks: Math.ceil(recipients.length / WEEKLY_DIGEST_CHUNK_SIZE),
      totalRecipients: recipients.length,
    }
  },
})

/** Process one chunk of weekly-summary recipients. Internal only. */
export const sendWeeklySummaryChunk = internalAction({
  args: {
    recipients: v.array(
      v.object({
        _id: v.id("users"),
        email: v.string(),
        name: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000
    const weekAgoIso = new Date(weekAgoMs).toISOString().split("T")[0] ?? ""

    let sent = 0
    let failed = 0

    for (const u of args.recipients) {
      try {
        const [stats, sessions] = await Promise.all([
          ctx.runQuery(internal.gamification.getUserStatsInternal, {
            userId: u._id,
          }),
          ctx.runQuery(internal.sessions.getByClientInternal, {
            clientId: u._id,
          }),
        ])

        const sessionsCompleted = sessions.filter(
          (s: { completed: boolean; date: string }) =>
            s.completed && s.date >= weekAgoIso,
        ).length

        const prsThisWeek = stats.badges.filter(
          (b: { id: string; unlockedAt: number }) =>
            b.unlockedAt >= weekAgoMs && b.id.includes("pr"),
        ).length

        if (sessionsCompleted === 0 && prsThisWeek === 0) continue

        const ok = await ctx.runAction(api.emailActions.sendWeeklySummary, {
          email: u.email,
          name: u.name,
          sessionsCompleted,
          totalVolume: stats.totalVolume,
          streak: stats.currentStreak,
          prs: prsThisWeek,
        })

        if (ok) sent++
        else failed++
      } catch (err) {
        failed++
        console.error(`Weekly summary failed for ${u.email}:`, err)
      }
    }

    return { sent, failed }
  },
})

/** Send workout reminder email */
export const sendWorkoutReminder = action({
  args: {
    email: v.string(),
    name: v.string(),
    coachName: v.string(),
  },
  handler: async (_ctx, args) => {
    const safeName = escapeHtml(args.name)
    const safeCoachName = escapeHtml(args.coachName)
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; background: #0a0a0f; color: #e4e4e7; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #18181b; border-radius: 16px; padding: 32px; border: 1px solid #27272a; }
    .title { font-size: 24px; font-weight: bold; margin-bottom: 16px; }
    .text { color: #a1a1aa; line-height: 1.6; margin-bottom: 16px; }
    .button { display: inline-block; background: #86efac; color: #0a0a0f; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h1 class="title">Time to Workout! 💪</h1>
      <p class="text">Hi ${safeName},</p>
      <p class="text">Your coach ${safeCoachName} has a workout ready for you today. Don't let them down!</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://gympro.app'}/user/session" class="button">Start Workout</a>
    </div>
  </div>
</body>
</html>
    `

    return await sendEmail({
      to: args.email,
      subject: "Time to Workout! 💪",
      html,
    })
  },
})
