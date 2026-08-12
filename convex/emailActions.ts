"use node"

import { action, internalAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import nodemailer from "nodemailer"

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

// Gmail SMTP client (nodemailer)
// Sends from the configured Gmail account (GMAIL_USER) using an App Password
// (GMAIL_APP_PASSWORD) — no sending domain of our own is required.
async function sendEmail(args: {
  to: string
  subject: string
  html: string
  from?: string
}): Promise<boolean> {
  const user = process.env.GMAIL_USER
  const appPassword = process.env.GMAIL_APP_PASSWORD
  if (!user || !appPassword) {
    console.error("GMAIL_USER / GMAIL_APP_PASSWORD not configured")
    return false
  }

  const from = args.from || `GymPro <${user}>`

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass: appPassword,
      },
    })
    await transporter.sendMail({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
    })
    return true
  } catch (error) {
    console.error("Failed to send email:", error)
    return false
  }
}

// Email templates — `name` is HTML-escaped at the call site before interpolation.
// ─── Brand-styled email helpers (match the GymPro light design system) ────

const BRAND = {
  bg: "#F7F8F4",
  card: "#FFFFFF",
  border: "#E2E5D8",
  text: "#1A1C16",
  muted: "#6B6E5F",
  primary: "#4A6B00",
  primaryFg: "#FFFFFF",
  neon: "#ABD600",
  soft: "#EEF0E8",
} as const

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function appUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL || "https://gym-project-azure.vercel.app"}${path}`
}

/** Bulletproof CTA button — table-wrapped so Outlook renders it correctly. */
function emailButton(href: string, label: string): string {
  return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px 0;">
        <tr>
          <td style="border-radius:12px;background-color:${BRAND.primary};">
            <a href="${href}" style="display:inline-block;padding:14px 30px;background-color:${BRAND.primary};color:${BRAND.primaryFg};text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;line-height:1;">${label}</a>
          </td>
        </tr>
      </table>`
}

/** 2-column stat grid for the weekly digest (table layout for mail clients). */
function statGrid(
  stats: Array<{ value: string; label: string }>,
): string {
  const renderCell = (s: { value: string; label: string } | undefined) =>
    s
      ? `<td width="50%" style="padding:6px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="g-stat" style="background-color:${BRAND.soft};border-radius:14px;">
          <tr>
            <td style="padding:18px 12px;text-align:center;">
              <div class="g-value" style="font-size:26px;font-weight:800;color:${BRAND.primary};line-height:1.2;">${s.value}</div>
              <div class="g-text" style="font-size:12px;color:${BRAND.muted};margin-top:4px;">${s.label}</div>
            </td>
          </tr>
        </table>
      </td>`
      : `<td width="50%"></td>`
  const rows: string[] = []
  for (let i = 0; i < stats.length; i += 2) {
    rows.push(`<tr>${renderCell(stats[i])}${renderCell(stats[i + 1])}</tr>`)
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 16px 0;">${rows.join("")}</table>`
}

/** Shared email shell: light theme, brand header, footer, dark-mode support. */
function emailShell(contentHtml: string): string {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      .g-bg { background-color: #16181A !important; }
      .g-card { background-color: #1F231B !important; border-color: #333A28 !important; }
      .g-title { color: #F7F8F4 !important; }
      .g-text { color: #B9BDA9 !important; }
      .g-stat { background-color: #2B3121 !important; }
      .g-value { color: #C4E538 !important; }
      .g-divider { border-top-color: #333A28 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:${FONT_STACK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="g-bg" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="g-card" style="max-width:600px;width:100%;background-color:${BRAND.card};border:1px solid ${BRAND.border};border-radius:20px;">
          <tr>
            <td style="height:6px;background-color:${BRAND.neon};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 36px 0 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:24px;font-weight:800;color:${BRAND.primary};letter-spacing:-0.02em;line-height:1;">GymPro<span style="color:${BRAND.neon};">.</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 36px 8px 36px;font-size:15px;line-height:1.65;">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 28px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="g-divider g-text" style="border-top:1px solid ${BRAND.border};padding-top:16px;font-size:12px;color:${BRAND.muted};text-align:center;line-height:1.5;">
                    © ${year} GymPro. All rights reserved.<br>
                    You're receiving this email because you have a GymPro account.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const WELCOME_EMAIL = (name: string) => {
  const features = [
    "Track your workouts in real-time",
    "View your personalized training plans",
    "Message your coach directly",
    "Monitor your progress and PRs",
  ]
  const listItems = features
    .map(
      (feature) => `
        <tr>
          <td width="28" valign="top" style="padding:6px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:20px;height:20px;border-radius:50%;background-color:${BRAND.neon};text-align:center;font-size:12px;color:#09090B;font-weight:800;line-height:20px;">✓</td>
              </tr>
            </table>
          </td>
          <td class="g-text" style="padding:6px 0 6px 12px;color:${BRAND.muted};font-size:15px;line-height:1.5;">${feature}</td>
        </tr>`,
    )
    .join("")
  return emailShell(`
    <h1 class="g-title" style="margin:0 0 16px 0;font-size:24px;font-weight:800;color:${BRAND.text};letter-spacing:-0.01em;">Welcome to GymPro! 💪</h1>
    <p class="g-text" style="margin:0 0 12px 0;color:${BRAND.muted};">Hi ${name},</p>
    <p class="g-text" style="margin:0 0 20px 0;color:${BRAND.muted};">We're excited to have you on board. GymPro is your all-in-one platform for tracking workouts, connecting with your coach, and reaching your fitness goals.</p>
    <p style="margin:0 0 8px 0;font-weight:700;color:${BRAND.text};">Here's what you can do:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">${listItems}</table>
    ${emailButton(appUrl("/dashboard"), "Go to Dashboard")}
  `)
}

const WEEKLY_SUMMARY_EMAIL = (name: string, stats: {
  sessionsCompleted: number
  totalVolume: number
  streak: number
  prs: number
}) => emailShell(`
    <h1 class="g-title" style="margin:0 0 16px 0;font-size:24px;font-weight:800;color:${BRAND.text};letter-spacing:-0.01em;">Your Weekly Summary 📊</h1>
    <p class="g-text" style="margin:0 0 12px 0;color:${BRAND.muted};">Hi ${name},</p>
    <p class="g-text" style="margin:0 0 4px 0;color:${BRAND.muted};">Here's how your training went this week:</p>
    ${statGrid([
      { value: String(stats.sessionsCompleted), label: "Sessions completed" },
      { value: `${(stats.totalVolume / 1000).toFixed(1)}k`, label: "Total volume (kg)" },
      { value: String(stats.streak), label: "Day streak" },
      { value: String(stats.prs), label: "New PRs" },
    ])}
    <p class="g-text" style="margin:0 0 8px 0;color:${BRAND.muted};">Keep up the great work — your dedication is paying off. 💪</p>
    ${emailButton(appUrl("/user/dashboard"), "View Dashboard")}
  `)

// ─── Actions ────────────────────────────────────────────────────────

/** Send welcome email to new user (admin only or system) */
export const sendWelcomeEmail = action({
  args: {
    email: v.string(),
    name: v.string(),
    secret: v.string(),
  },
  handler: async (_ctx, args) => {
    // Shared-secret guard: only the webhook routes (which verify their
    // signatures first and pass CONVEX_BILLING_WEBHOOK_SECRET) may send mail
    // to arbitrary addresses. Without this, anyone with the public Convex URL
    // could spam arbitrary inboxes via the project's mail quota.
    const expected = process.env.CONVEX_BILLING_WEBHOOK_SECRET;
    if (!expected) {
      throw new Error(
        "CONVEX_BILLING_WEBHOOK_SECRET is not configured in the Convex deployment",
      );
    }
    if (args.secret !== expected) {
      throw new Error("Forbidden: invalid webhook secret");
    }

    return await sendEmail({
      to: args.email,
      subject: "Welcome to GymPro! 💪",
      html: WELCOME_EMAIL(escapeHtml(args.name)),
    })
  },
})

/**
 * Send one weekly summary email.
 *
 * Internal — invoked only by the cron fan-out (sendWeeklySummaryChunk), never
 * from the browser. Previously public, it let anyone with the public Convex
 * URL mail arbitrary addresses at the project's expense.
 */
export const sendWeeklySummary = internalAction({
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

        const ok = await ctx.runAction(internal.emailActions.sendWeeklySummary, {
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

