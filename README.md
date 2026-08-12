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
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Convex deployment env | transactional emails (`emailActions.ts`); the from-address must be a Resend-verified domain |
| `NEXT_PUBLIC_APP_URL` | `.env.local` + Convex env | base URL for email CTA links |

**Clerk → Convex JWT verification requires the Convex integration to be active in the Clerk dashboard** for the instance named by `CLERK_JWT_ISSUER` (dashboard.clerk.com → Convex integration → *Activate*). Clerk pre-maps the `aud: "convex"` claim into session tokens only when the integration is active — without it, `ctx.auth.getUserIdentity()` returns `null` for every signed-in user even with the provider configured below.

⚠️ **Known hardening items** (from the 2026 security audit): `auth.syncUser`
still trusts anonymous calls as "webhooks" — an attacker can mint an admin account
(proven live, the last critical in this project). `auth.getUserByClerkId`
enumerates users anonymously, and the `push.*` lookups plus email/push actions
are public server-only surfaces that should be `internalFunction`s.

## 📧 Email & Push (Resend)

Transactional email is sent through [Resend](https://resend.com) via `convex/emailActions.ts`.

| Variable | Where | Purpose |
|---|---|---|
| `RESEND_API_KEY` | Convex deployment env | API key from https://resend.com/api-keys |
| `RESEND_FROM_EMAIL` | Convex deployment env | From address, e.g. `GymPro <noreply@yourdomain.com>` — **the domain must be verified in Resend** |
| `NEXT_PUBLIC_APP_URL` | Convex deployment env | Base URL for email CTA links (code falls back to `https://gym-project-azure.vercel.app`) |

**Verifying a domain in Resend** (required — Resend rejects sends from unverified domains, and `gympro.app` is *not* owned):

1. Add the domain in the Resend dashboard (e.g. `yourdomain.com`, or a sending subdomain like `mail.yourdomain.com`).
2. Add these DNS records at your DNS provider:
   - **SPF** — a TXT record at `@` (or the subdomain): `v=spf1 include:amazonses.com ~all`
   - **DKIM** — three TXT records at `resend._domainkey`, `resend1._domainkey`, `resend2._domainkey`, each with the `p=<public key>` value Resend displays
3. Wait for DNS propagation (minutes to a couple of hours), then click **Verify** in Resend.
4. Set `RESEND_FROM_EMAIL` on the Convex deployment to an address on that domain (e.g. `GymPro <noreply@yourdomain.com>`).

If no from-address is configured, `sendEmail` **fails closed** with a clear log line instead of attempting a send.

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
