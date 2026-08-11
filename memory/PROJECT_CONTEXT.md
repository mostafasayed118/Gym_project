# 🧠 GymPro: AI Agent Context & Project Memory

> **BOOT DIRECTIVE — READ FIRST.** Any AI agent (Cursor, Copilot, Windsurf, Claude, GPT) or human developer working on this codebase **MUST read this file in full before writing or modifying any code.** The rules in §4 are non-negotiable. Violations have caused production regressions.

---

## 1. [IDENTITY & MISSION]

**GymPro** is a real-time **B2B fitness coaching SaaS** with three roles: **User** (trainee), **Coach** (builds plans, reviews progress), **Admin** (governs platform). Stack: Next.js 16 App Router + Convex reactive backend + Clerk auth + Stripe billing.

**Your primary goal**: Write **secure, performant, strictly typed** code that preserves the **real-time reactive nature of Convex** and the premium **"Neon Precision" dark-mode UI** (lime `#abd600` + teal `#00dce5` accents).

---

## 2. [TECH STACK & VERSIONS]

| Layer | Tool | Version |
|---|---|---|
| Framework | **Next.js** App Router | `16.2.9` (middleware renamed `proxy`) |
| Runtime | **React** + React Compiler | `19.2.4` |
| Backend | **Convex** | `1.41.0` |
| Auth | **Clerk** / `@clerk/backend` | `7.5.3` / `3.8.2` |
| Billing | **Stripe** | `22.2.1` (API pinned `2026-05-27.dahlia`) |
| Styling | **Tailwind** | `v4` + `tw-animate-css` |
| Components | shadcn primitives + `@base-ui/react` | latest |
| Forms | `react-hook-form` + `zod` | `7.79` / `4.4.3` |
| Webhook signing | `svix` | `1.95.2` |
| Charts | `recharts` | `3.8.1` |
| PDF | `@react-pdf/renderer` | `4.5.1` |
| Push | `web-push` (VAPID) | `3.6.7` |
| Toasts | `sonner` | `2.0.7` |
| Observability | Sentry `10.58` + PostHog `1.390` |
| Email | **Resend** (HTTP API) |
| Test | Vitest, Playwright, Storybook |

**Convex⇄Clerk bridge**: `convex/react-clerk` `ConvexProviderWithClerk` is wired in `src/components/providers/convex-provider.tsx`. **Never replace with plain `ConvexProvider`** — client-side `ctx.auth.getUserIdentity()` will silently return `null`.

---

## 3. [ARCHITECTURE & DATA FLOW]

- **Frontend**: Next.js App Router. **Server Components** for initial render + auth gating (`requireRole()` from `src/lib/auth-server.ts`). **Client Components** (`"use client"`) only when interactivity is required. Use `params`/`searchParams` props, NOT `useRouter().query`.
- **Backend**: **Convex is the only data layer.** All DB I/O goes through `convex/*.ts` queries/mutations/actions. **NO Prisma, NO Drizzle, NO raw SQL, NO direct DB clients.** External services (Stripe, Resend, Clerk SDK, web-push) are invoked from Convex **Node actions** (`"use node"` directive at top of file).
- **Auth (3-layer defense)**:
  1. **Edge** — `src/proxy.ts` (Clerk middleware exported as `proxy` per Next 16). Calls `subscriptions:getAuthContextByClerkId` per protected request.
  2. **Server Component** — `requireRole(["coach","admin"])` from `src/lib/auth-server.ts`.
  3. **Convex function (authoritative)** — `requireRole(ctx, [...])`, `requireOwnership(ctx, ...)`, `requireActiveSubscription(ctx, userId)`.
- **State**: **Convex `useQuery` IS the state layer.** No Redux, no Zustand, no Jotai, no Context for cross-component data. Local UI state only via `useState`/`useReducer`. Cross-component state lives in Convex.
- **Realtime**: Every `useQuery` is a WebSocket subscription. Mutations propagate to all subscribers in <200ms.
- **Webhooks**: `src/app/api/webhooks/{clerk,stripe}/route.ts`. Both verify signatures (SVIX, Stripe). Public route matcher in proxy.
- **Cron**: `convex/crons.ts`. All schedules in **UTC**.

---

## 4. [STRICT CODING RULES FOR AI AGENTS] (CRITICAL)

### Styling
- **DO** use Tailwind v4 **semantic CSS variables**: `bg-card`, `text-foreground`, `border-border`, `bg-muted`, `text-primary`. These respect light/dark tokens in `src/app/globals.css`.
- **DON'T** hardcode hex colors (`#111508`, `#abd600`, `#00dce5`) in **new** components. Legacy code uses them — refactor when touching, never propagate.
- **DO** use the `cn()` helper from `src/lib/utils.ts` for conditional classes.
- **DO** preserve the "Neon Precision" gradient (`linear-gradient(45deg, #abd600, #00dce5)`) for primary CTAs and PR celebrations — brand-critical.

### Convex (Backend)
- **DO** read `convex/_generated/ai/guidelines.md` **before writing any Convex code**. Its rules override training data.
- **DO** put `requireRole(ctx, [...])` at the **top of every sensitive mutation/query/action**.
- **DO** use `requireOwnership(ctx, userId)` for user-scoped resources.
- **DO** use `requireActiveSubscription(ctx, coachId)` for new coach features (already gates `plans.createPlanWithItems`).
- **DO** add `v.` validators (`v.id("users")`, `v.string()`, `v.union(...)`, etc.) for **every** mutation/query/action arg.
- **DO** use `internalQuery` / `internalMutation` / `internalAction` for private functions. `api.*` = public, `internal.*` = private.
- **DO** put Node-only deps (Resend, web-push, Clerk SDK, Stripe SDK) in `"use node"` files.
- **DO** use `.withIndex(...)` with a specific composite index. Indexes are defined in `convex/schema.ts`.
- **DON'T** call `api.audit.logAuditEvent` from a context without admin identity — it admin-gates the inner call. Use direct `ctx.db.insert("auditLogs", ...)` for system-actor inserts.
- **DON'T** trust `userId` / `clientId` / `senderId` args from clients in **new** code — re-derive from `ctx.auth.getUserIdentity()`. (Legacy functions have this gap; flag, don't propagate.)
- **DON'T** add `ctx.db.query("table").collect()` over large tables — known hotspots include `sessions.getClientProgressDashboard`, `auth.listAllUsers`, `audit.getAuditLogStats`.

### React / Next.js
- **DON'T** use `useEffect` for data fetching. Use Convex `useQuery`. Period.
- **DON'T** use `any` — strict TypeScript is enforced. If a generated type is missing, fix the source; never `as any` (legacy code does this in webhooks — don't propagate).
- **DON'T** use `<img>` — use `next/image`.
- **DON'T** use `<a href>` for internal links — use `next/link`.
- **DO** wrap any component using `useSearchParams()` in `<Suspense>` — Next 16 production builds **fail** without it (`PostHogPageView` in `providers/index.tsx` is the reference pattern).
- **DO** default to React Server Components. Add `"use client"` only when you need state, effects, or browser APIs.
- **DO** prefer `useMemo` for derived data over recomputation in render.

### Forms
- **DO** use `react-hook-form` + `zodResolver` for all forms. Reference: `src/features/plan-builder/`.
- **DO** colocate Zod schemas with the form (`schema.ts` sibling).
- **DON'T** reinvent input components — extend `src/components/ui/` primitives.

### Immutable Business Logic
- **DON'T** modify the **Epley 1RM formula** (`weight * (1 + reps / 30)`) in `convex/gamification.ts:60` without explicit instruction.
- **DON'T** modify the **streak math** (UTC midnight, gap → reset to 1) in `convex/gamification.ts:130-239` without explicit instruction.
- **DON'T** modify the **role hierarchy** (`admin: 3, coach: 2, user: 1`) in `convex/auth.ts:9-13`.
- **DON'T** modify the **subscription allow-list** (`active`, `trialing`) in `convex/subscriptions.ts` without product approval.

### Action Confirmation
- **DON'T** modify `convex/schema.ts`, webhook routes, or `src/proxy.ts` without first stating the blast radius in your response.
- **DON'T** create new top-level docs (`*.md`, `README.md`) unless explicitly asked.
- **DON'T** add comments that restate what code does. Only add a comment when the **why** is non-obvious (a hidden constraint, a workaround, a known incident).

---

## 5. [BUSINESS LOGIC INVARIANTS]

### PR (Personal Record) Detection
- **Formula**: **Epley 1RM** `weight * (1 + reps / 30)` at `convex/gamification.ts:60`.
- **Trigger**: `<ExerciseTracker>` calls `usePRDetection.detectPR(...)` after every successful `logSet`.
- **Race-safe**: `checkForPR` excludes `args.sessionId` from comparison so the just-written set can't self-promote (`gamification.ts:73`).
- **Side effect**: first PR ever awards `first_pr` badge (`pr_machine` / `pr_legend` are defined but **never auto-awarded** — dead code).
- **DIVERGENCE**: Coach dashboard uses **raw weight** for `prsHit` counter (`sessions.ts:362`). Known v1 inconsistency — do not "fix" without product approval.

### Streak
- **Day boundary**: **UTC midnight** (parsed from `"YYYY-MM-DD"` via `Date.UTC()`).
- **Rule**: `diffDays === 1` → increment. `diffDays === 0` → no-op (same-day re-log). Any other gap → **reset to 1**, NOT 0.
- **No grace period.** No frozen streaks.
- **Persisted**: `userStats.currentStreak` / `userStats.maxStreak`.

### RBAC
- **Hierarchy**: `admin (3) > coach (2) > user (1)`. `requireRole(ctx, ["coach", "admin"])` allows ≥ level 2.
- **Admin bypass**: both `requireOwnership` and `requireActiveSubscription` bypass unconditionally for admins.

### Billing State Machine
- **Allowed (paying)**: `active`, `trialing`.
- **Blocked**: `past_due`, `canceled`, missing.
- **Stripe → Convex mapping** in `src/app/api/webhooks/stripe/route.ts`:
  - `incomplete_expired` → `canceled` (recently fixed — do not regress).
  - `unpaid` → `canceled`.
  - Default fallback → `active` (latent risk — fail-safe to `canceled` is a known follow-up).
- **Auto-promote**: `checkout.session.completed` (with `mappedStatus ∈ {active, trialing}`) → `subscriptions.promoteToCoachFromBilling` → `users.role = "coach"` + audit log `COACH_PROMOTION_VIA_BILLING`.
- **No auto-demote** on `subscription.deleted` — subscription is marked `canceled` but role stays `coach` (by design — admin must reconcile).

### Idempotency
- ✅ **Idempotent**: `sessions.logSet` (upsert on `(sessionId, exerciseName, setIndex)`), `sessions.createForToday`, `checkins.submitCheckin` (upsert on `(userId, weekNumber)`), `subscriptions.promoteToCoachFromBilling`, `users.suspendUser`/`unsuspendUser`, `auth.syncUser`.
- ❌ **NOT idempotent**: `messages.sendMessage` (duplicates on offline replay), `gamification.updateUserStats` (state corruption on out-of-order calls).

### Offline / Optimistic UI
- **Convex client SDK** queues mutations **in memory** while offline; replays on reconnect.
- **Service Worker** (`public/sw.js`) **bypasses all `convex.cloud` traffic and `/api/*`** — only caches static assets + HTML.
- **No `withOptimisticUpdate` anywhere** — UI updates are server-confirmation-driven via reactive `useQuery` re-emits.
- **Lost on tab close while offline**: queued mutations vanish (no IndexedDB).

### Rate Limits (`convex/rateLimit.ts`)
| Key | Limit | Window |
|---|---|---|
| `messages:send` | 20 | 60s |
| `push:saveSubscription` | 5 | 60s |
| `auth:syncUser` | 10 | 60s |
- Fixed-window. Cleanup cron runs `*/15 * * * *`.

### Timezone Hazards
- **Mixed boundaries**: streak (UTC) vs user-dashboard "today" (browser local) vs check-in week# (browser local, non-strict ISO) vs cron (UTC) vs `pushActions.sendWorkoutReminders` (UTC weekday name).
- **DON'T introduce a new TZ semantic.** Match the surrounding module's convention.

### Webhooks
- **Clerk webhook** (`api/webhooks/clerk/route.ts`): handles `user.created` (syncs + sends welcome email), `user.updated` (re-syncs — overwrites role from `publicMetadata`), `user.deleted`. Verifies `svix-id` / `svix-timestamp` / `svix-signature`.
- **Stripe webhook** (`api/webhooks/stripe/route.ts`): handles checkout, sub create/update/delete, invoice succeeded/failed. Verifies `stripe-signature` against `STRIPE_WEBHOOK_SECRET`.

---

## 6. [FILE DIRECTORY MAP]

```
convex/                                # Backend — single source of truth
  schema.ts                            # All tables + indexes
  auth.ts                              # requireRole, requireOwnership, ROLE_HIERARCHY
  users.ts                             # User CRUD, suspend/unsuspend, coach assignment
  plans.ts                             # createPlanWithItems (BILLING-GATED)
  sessions.ts                          # createForToday, logSet, finish, dashboards
  gamification.ts                      # checkForPR (Epley), updateUserStats (streak)
  subscriptions.ts                     # requireActiveSubscription, getAuthContextByClerkId
  messages.ts                          # Conversations, messages, typing indicators
  checkins.ts                          # Weekly check-ins + photo storage
  progress.ts                          # Body measurements log
  push.ts + pushActions.ts             # Web Push (Node action)
  emailActions.ts                      # Resend templates + weekly fan-out (Node)
  clerkActions.ts                      # Clerk ban/unban (Node)
  audit.ts                             # Audit log queries (admin-only)
  rateLimit.ts                         # Fixed-window rate limiter
  crons.ts                             # Scheduled jobs (UTC)
  _generated/ai/guidelines.md          # ⚠ READ BEFORE WRITING CONVEX CODE

src/app/                               # Next.js App Router
  layout.tsx                           # <ClerkProvider> → <Providers> → <ClientLayout>
  page.tsx                             # Landing
  dashboard/page.tsx                   # Post-auth router by role
  user/{dashboard,session,messages}/page.tsx
  coach/{dashboard,clients,plans,messages}/...
  admin/{dashboard,users}/...
  api/webhooks/{clerk,stripe}/route.ts # Webhook handlers (signature-verified)
  api/push/subscribe/route.ts          # VAPID push enrollment
  sign-in/[[...sign-in]]/page.tsx
  sign-up/[[...sign-up]]/page.tsx

src/components/
  ui/                                  # shadcn primitives — extend, don't replace
  providers/                           # ConvexProviderWithClerk, Theme, PostHog (Suspense-wrapped)
  user/                                # Dashboard, session-tracker, exercise-tracker, set-input
  coach/                               # Roster, metric cards, volume chart, progression table
  admin/                               # Mission control, user mgmt, audit viewer, dialogs
  messaging/                           # Chat UI (shared User+Coach)
  checkins/                            # Weekly check-in wizard
  gamification/                        # PR celebration, trophy case
  notifications/                       # Push permission UI
  reports/                             # PDF report (@react-pdf/renderer)
  client-layout.tsx                    # Mobile bottom nav wrapper
  service-worker-registration.tsx
  offline-indicator.tsx

src/features/                          # Cross-component features
  plan-builder/                        # RHF + Zod plan builder (atomic mutation)

src/hooks/
  use-active-plan.ts                   # Aggregates user/plan/sessions queries
  use-pr-detection.ts                  # Wraps checkForPR mutation

src/lib/
  utils.ts                             # cn() + helpers
  auth-server.ts                       # requireAuth/requireRole for RSCs
  analytics.tsx                        # PostHogProvider + PostHogPageView
  feature-flags.ts                     # PostHog flag wrappers
  validators/                          # (empty — Zod schemas colocated with forms)

src/proxy.ts                           # Edge middleware (renamed per Next 16)

public/
  sw.js                                # Service worker (cache + push)
  manifest.json                        # PWA manifest
  icons/                               # PWA icons

ARCHITECTURE_AND_BUSINESS_LOGIC.md     # Deep reference doc
PROJECT_STATUS.md                      # Sprint state + ticket list
AGENTS.md / CLAUDE.md                  # Per-project AI directives
memory/PROJECT_CONTEXT.md              # ← THIS FILE
```

---

## 7. [CURRENT STATE & ACTIVE SPRINT]

**Launch readiness (2026-06-21): ~75%** — up from 55% baseline after the 2026-06 wiring sprint.

### Recently shipped
- ✅ **Ticket 1** — `ConvexProviderWithClerk` auth bridge (`providers/convex-provider.tsx`).
- ✅ **Ticket 2** — PR celebration wired into live workout flow (`exercise-tracker.tsx` + `session-tracker.tsx`).
- ✅ **Ticket 3 + GAP-5** — Reinstate dialog (`reinstate-user-dialog.tsx`) + audit-log client-side filters.
- ✅ **Ticket 4 + GAP-7** — PostHog provider mounted + welcome email on `user.created` + weekly summary cron (Sun 18:00 UTC).
- ✅ **Ticket 5** — Subscription gating end-to-end: `requireActiveSubscription` helper, `plans.createPlanWithItems` gated, `promoteToCoachFromBilling` on checkout, edge proxy redirects lapsed coaches to `/dashboard?reason=billing`, `incomplete_expired` → `canceled` fix.

### Top 3 active priorities
1. **Coach attribution authorization** — `plans.createPlanWithItems` still trusts client-supplied `coachId`. Must bind to `ctx.auth` identity to prevent attribution spoofing.
2. **Convex N+1 / unbounded scan hotspots** — `sessions.getClientProgressDashboard` collects the entire `sessionSets` table per call; `auth.listAllUsers`, `audit.getAuditLogStats`, `progress.getCoachView`, `subscriptions.findByStripeCustomerId` all do full table scans. Plan index migrations before scale.
3. **Dual data model** — legacy `plans.exercises[]` / `sessions.exercises[]` embedded arrays remain non-optional in schema. New writes set them to `[]`. Need a `@convex-dev/migrations` plan to drop the fields cleanly.

### Known debts (non-blocking)
- Coach dashboard `prsHit` uses raw weight (disagrees with Epley used by celebration).
- `mapStripeStatus` default branch falls back to `"active"` for unhandled states (`incomplete`, `paused`). Consider fail-safe to `"canceled"`.
- `typingIndicators` rows accumulate forever (TTL is read-time only, no cleanup cron).
- `auditLogs.archiveOldLogs` defined but unscheduled.
- No CSP header in `next.config.ts`.
- Sentry DSN hardcoded in 3 config files; should be env-var.
- Weekly summary `totalVolume` is all-time, not weekly (proper weekly aggregation requires walking sessionSets per user — too expensive for v1).
- Coach "Add Client" form requires raw Clerk IDs — needs invite-by-email flow.
- `<SidebarNav>` defined but not mounted in `<ClientLayout>` (desktop has no left nav).
- `pr_machine` / `pr_legend` badges defined but never auto-awarded.
- Mission Control "Error Rate" widget uses mocked `Math.random()` data.
- No server-side push on message receipt (only daily 17:00 UTC workout reminder).

---

*End of memory. When in doubt: defer to `ARCHITECTURE_AND_BUSINESS_LOGIC.md` for deep reference, `PROJECT_STATUS.md` for current ticket state, and the source code as authoritative. If this file disagrees with the source code, **trust the source** and update this file.*
