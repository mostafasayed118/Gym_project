This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🔐 Security Model

GymPro is a **multi-user** coaching platform with three roles — `user`, `coach`, and
`admin` — authenticated through [Clerk](https://clerk.com). Every layer (pages,
Convex functions, webhooks) enforces its own gate; no layer trusts another.

| Claim | Reality |
|---|---|
| **Authentication** | ✅ Clerk via Convex auth (`convex/auth.config.ts`). JWTs are validated against `CLERK_JWT_ISSUER` on the Convex deployment. |
| **Route gating** | ✅ Every protected page/layout calls `auth.protect()` plus the `requireAuth()` / `requireRole()` / `requireCoachAccess()` gates in `src/lib/auth-server.ts`. Unprotected resources under protected folders **fail CI** (`@clerk/eslint-plugin` `require-auth-protection`). |
| **Convex data access** | ✅ Handlers call `requireIdentity()` / `requireSelf()` (`convex/auth.ts`) — e.g. coach roster/metrics queries reject callers other than the requesting coach (IDOR-closed). |
| **Webhook / machine surfaces** | ✅ `subscriptions` mutations require the shared `CONVEX_BILLING_WEBHOOK_SECRET` ("Forbidden: invalid billing secret"); webhook-only lookups (`getAuthContextByClerkId`, Stripe lookups) are `internalFunction`s or secret-guarded. `/api/webhooks/*` is svix-signature verified. |
| **Public by design** | ✅ Landing page + sign-in/sign-up, `/api/health` (deep probe), and `/api/cron/health` (bearer `CRON_SECRET`, alerts via `ALERT_WEBHOOK_URL`). |

**Required environment variables:**

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | `.env.local` | Clerk client/server |
| `CLERK_WEBHOOK_SECRET` | `.env.local` + Convex env | svix webhook verification |
| `CLERK_JWT_ISSUER` | Convex deployment env | Convex validates Clerk JWTs |
| `CONVEX_BILLING_WEBHOOK_SECRET` | Convex deployment env | guards `subscriptions` webhook mutations |
| `CRON_SECRET` / `ALERT_WEBHOOK_URL` | `.env.local` + Vercel | `/api/cron/health` bearer guard + outage alerts |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Convex deployment env | transactional emails via Gmail SMTP (`emailActions.ts`) |
| `NEXT_PUBLIC_APP_URL` | `.env.local` + Convex env | base URL for email CTA links |
| `EXERCISEDB_API_KEY` | Convex deployment env | RapidAPI key for the ExerciseDB catalog sync (`convex/exerciseDb.ts`) |

**Clerk → Convex JWT verification requires the Convex integration to be active in the Clerk dashboard** for the instance named by `CLERK_JWT_ISSUER` (dashboard.clerk.com → Convex integration → *Activate*). Clerk pre-maps the `aud: "convex"` claim into session tokens only when the integration is active — without it, `ctx.auth.getUserIdentity()` returns `null` for every signed-in user even with the provider configured below.

⚠️ **Known hardening items** (from the 2026 security audit): `auth.syncUser`
still trusts anonymous calls as "webhooks" — an attacker can mint an admin account
(proven live, the last critical in this project). `auth.getUserByClerkId`
enumerates users anonymously, and the `push.*` lookups plus email/push actions
are public server-only surfaces that should be `internalFunction`s.

## 📧 Email (Gmail SMTP)

Transactional email is sent from a Gmail account over SMTP with `convex/emailActions.ts` (nodemailer). No sending domain of your own is required — Gmail sends from its own domain.

| Variable | Where | Purpose |
|---|---|---|
| `GMAIL_USER` | Convex deployment env | The Gmail address that sends emails, e.g. `al3tar401@gmail.com` |
| `GMAIL_APP_PASSWORD` | Convex deployment env | A 16-character **App Password** for that account — never your real Gmail password |
| `NEXT_PUBLIC_APP_URL` | Convex deployment env | Base URL for email CTA links (code falls back to `https://gym-project-azure.vercel.app`) |

**Creating an App Password** (required — Gmail rejects normal passwords over SMTP):

1. Turn on **2-Step Verification** at https://myaccount.google.com/security if it isn't already on.
2. Create an App Password at https://myaccount.google.com/apppasswords (select *Mail*).
3. Set it on the Convex deployment: `npx convex env set GMAIL_APP_PASSWORD <16-char-password> --deployment fleet-mouse-480`.

Emails are sent from `GymPro <GMAIL_USER>`. If the credentials are missing or sending fails, `sendEmail` **fails closed** with a logged error instead of silently dropping mail.

## 🏋️ Exercise Database (ExerciseDB)

The [exercisedb/exercisedb-api](https://github.com/exercisedb/exercisedb-api) repo is a README/marketing repo — the actual product is the **hosted API** at https://exercisedb.dev (RapidAPI, `exercisedb.p.rapidapi.com`, key via `X-RapidAPI-Key`).

GymPro integrates it with a **sync-once, serve-locally** strategy (`convex/exerciseDb.ts`):

1. An admin triggers **Sync catalog** from Mission Control (admin dashboard) — or calls the `exerciseDb:syncCatalog` action directly.
2. The action imports the full catalog (~11k exercises) into the Convex `exercises` table, one scheduled page-sync per page so the RapidAPI free tier isn't burst.
3. All reads are served from Convex — search, body-part/equipment/target filters, and stats never touch the API again.

Coaches pick exercises from the catalog in the plan builder (searchable picker, `src/features/plan-builder/exercise-search.tsx`); the picked ExerciseDB id is stored on `planItems.exerciseDbId` so GIFs / instructions can be rendered later. Typing a name that isn't in the catalog still works as a custom exercise.

**Setup:**

| Variable | Where | Purpose |
|---|---|---|
| `EXERCISEDB_API_KEY` | Convex deployment env | RapidAPI key for `exercisedb.p.rapidapi.com` — get one (free tier) at https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb |

Set it with `npx convex env set EXERCISEDB_API_KEY <key> --deployment fleet-mouse-480`, then hit **Sync catalog** in Mission Control. The card shows catalog size, body-part count, last sync time, and whether the key is configured. GIF URLs in the API rotate periodically for unauthenticated content — treat `gifUrl` as best-effort, not a permanent asset.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
