# GymPro Technical Debt Audit Report

## 1. Executive Summary

The GymPro codebase is at an **early-stage maturity level** with approximately 180 identified issues across backend, frontend, security, and code quality layers. The most critical risk is the **complete absence of server-side authorization on Convex mutations** -- any unauthenticated client can escalate privileges to admin, delete users, or modify any data. Beyond security, the backend suffers from severe N+1 query patterns that will hit Convex transaction limits at scale, and the frontend has 10+ monolithic components exceeding 300 lines with missing error boundaries across all route segments. The codebase has strong foundations (proper Convex schema design, good Tailwind v4 theming, solid PWA setup) but requires immediate hardening before any production deployment.

---

## 2. Debt Registry

### [DEBT-001] Convex Mutations Lack Authorization Guards (CRITICAL)
- **Severity:** 🔴 Critical
- **Category:** Security
- **Location:** `convex/auth.ts` (lines 59-140), `convex/plans.ts` (lines 42-127), `convex/sessions.ts` (lines 34-231), `convex/messages.ts` (lines 128-257), `convex/gamification.ts` (lines 47-226), `convex/audit.ts` (lines 102-210), `convex/progress.ts` (lines 38-59), `convex/push.ts` (lines 40-112), `convex/checkins.ts` (lines 120-177), `convex/emailActions.ts` (all actions)
- **Description:** Zero mutations in the entire Convex backend verify the caller's identity or role. `syncUser`, `updateRole`, and `deleteUser` accept arbitrary arguments from any client. A regular user can call `convex.mutation(api.auth.updateRole, { clerkId: "...", role: "admin" })` and gain admin access. The audit-aware variants (`deleteUserWithAudit`, `updateRoleWithAudit`) accept `adminId` as a client-provided argument without verifying it. All 24 mutations across 9 files are exploitable.
- **Recommended Fix:** Add `ctx.auth.getUserIdentity()` to every mutation to obtain the Clerk JWT. Then look up the user's role from the database and verify permissions before executing. Create a shared `requireRole(ctx, allowedRoles)` helper. For `updateRole`/`deleteUser`, require admin role. For plan mutations, require coach/admin. For session mutations, verify the caller is the session's client or coach.

### [DEBT-002] Sentry Auth Token Exposed in Repository
- **Severity:** 🔴 Critical
- **Category:** Security
- **Location:** `.env.sentry-build-plugin` (line 5)
- **Description:** Contains a live Sentry auth token (`SENTRY_AUTH_TOKEN=sntrys_eyJpYXQi...`). Although `.gitignore` lists this file, it exists in the working tree and may have been committed. This token grants source map upload and organization-level Sentry access.
- **Recommended Fix:** Rotate the token immediately in Sentry dashboard. Use `git filter-branch` or BFG Repo-Cleaner to purge from git history. Add a `.env.example` with placeholder values. Never commit real secrets.

### [DEBT-003] Debug Page Exposes Session Claims Without Auth
- **Severity:** 🔴 Critical
- **Category:** Security
- **Location:** `src/app/debug/page.tsx` (lines 1-18), `src/proxy.ts` (line 15)
- **Description:** `/debug` renders full Clerk JWT session claims to any authenticated user. Worse, it is listed in `isPublicRoute` in the proxy, potentially making it accessible without any authentication. No role check exists.
- **Recommended Fix:** Delete `src/app/debug/page.tsx` entirely. Remove `/debug` from the public route list in `proxy.ts`. If debug info is needed, create an admin-only route with `requireRole(["admin"])`.

### [DEBT-004] Sentry Example Routes Exposed in Production
- **Severity:** 🔴 Critical
- **Category:** Security
- **Location:** `src/app/api/sentry-example-api/route.ts`, `src/app/sentry-example-page/page.tsx`
- **Description:** These diagnostic routes are accessible to any visitor without authentication. The page reveals Sentry project URL, org name, and allows triggering error reports. Uses `next/head` which is broken in App Router.
- **Recommended Fix:** Delete both files entirely. If Sentry testing is needed, do it in a development-only environment.

### [DEBT-005] Push Subscription API Has No Authentication
- **Severity:** 🔴 Critical
- **Category:** Security
- **Location:** `src/app/api/push/subscribe/route.ts` (lines 1-34)
- **Description:** Accepts `userId` directly from the request body and saves a push subscription for that user without verifying the caller. Any unauthenticated client can subscribe push notifications for any user ID.
- **Recommended Fix:** Derive `userId` from the Clerk session (`auth()`) instead of accepting it from the request body. Verify `session.userId` matches the target user before saving.

### [DEBT-006] Severe N+1 Query Patterns in Convex Backend
- **Severity:** 🔴 Critical
- **Category:** Backend Performance
- **Location:** `convex/auth.ts` (lines 193-221, 227-330), `convex/messages.ts` (lines 22-92), `convex/gamification.ts` (lines 60-86), `convex/users.ts` (lines 30-118), `convex/audit.ts` (lines 20-89), `convex/pushActions.ts` (lines 69-120)
- **Description:** 14 distinct N+1 patterns identified. `listAllUsers` makes 2N queries for N users. `getConversations` makes ~3N queries per conversation. `checkForPR` makes N queries per session. `getSystemHealth` loads ALL records from 4 tables into memory. `searchAll` loads ALL records from 3 tables. For 100 users with 20 conversations each, this produces 6000+ queries in a single request.
- **Recommended Fix:** Batch queries using `Promise.all` with indexed lookups. For `listAllUsers`, aggregate session/plan counts in a single pass. For `getConversations`, denormalize participant names and last message into the conversation document. For `searchAll`, implement a dedicated search index or use Convex full-text search. For `getSystemHealth`, use counted/aggregated queries instead of loading all records.

### [DEBT-007] Missing Composite Database Indexes
- **Severity:** 🟠 High
- **Category:** Backend Performance
- **Location:** `convex/schema.ts` (multiple tables), `convex/messages.ts`, `convex/sessions.ts`
- **Description:** 6 missing composite indexes: `progress` needs `by_clientId_date`, `sessions` needs `by_clientId_date`, `conversations` needs a participant+ordering composite index, `messages` needs `by_conversationId_senderId`. Current queries force full table scans with client-side filtering.
- **Recommended Fix:** Add composite indexes in `convex/schema.ts` for all query patterns that filter on multiple fields. For conversations, consider a denormalized `participantId` field (one per participant) with a `by_participantId_lastMessageAt` index.

### [DEBT-008] No Next.js Middleware File
- **Severity:** 🟠 High
- **Category:** Security / Architecture
- **Location:** Missing `src/middleware.ts`, `src/proxy.ts` (lines 36-72)
- **Description:** Route protection logic is defined in `proxy.ts` exporting `proxy` function and `config`, but Next.js requires the file to be named `middleware.ts` with a named export `middleware`. If the file is not properly wired, all admin/coach route protection is non-functional.
- **Recommended Fix:** Rename `src/proxy.ts` to `src/middleware.ts`. Rename the exported `proxy` function to `middleware`. Verify the `config` matcher is correct. Test that `/admin`, `/coach` routes redirect unauthenticated users.

### [DEBT-009] Missing Security Headers in next.config.ts
- **Severity:** 🟠 High
- **Category:** Security
- **Location:** `next.config.ts` (lines 9-30)
- **Description:** No security headers configured. Missing: `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`.
- **Recommended Fix:** Add `headers()` configuration to `next.config.ts` with all standard security headers. Use the `next/headers` API or the config-based approach.

### [DEBT-010] Missing Error Boundaries Across All Routes
- **Severity:** 🟠 High
- **Category:** Frontend Reliability
- **Location:** `src/app/admin/`, `src/app/coach/`, `src/app/user/`, `src/app/dashboard/`
- **Description:** Zero `error.tsx` files exist for any route segment. Only `global-error.tsx` exists for fatal errors. If any Convex query fails or a component throws, the entire page crashes with no recovery. No `loading.tsx` files exist for streaming/suspense boundaries.
- **Recommended Fix:** Add `error.tsx` to each route segment (`admin/`, `coach/`, `user/`, `dashboard/`). Add `loading.tsx` with skeleton states for each major route. Use React's `ErrorBoundary` pattern with retry functionality.

### [DEBT-011] Convex Queries Lack Authorization
- **Severity:** 🟠 High
- **Category:** Security
- **Location:** `convex/auth.ts` (lines 165-332), `convex/audit.ts` (lines 7-97)
- **Description:** `listAllUsers`, `getSystemHealth`, `searchAll`, and all audit log queries return data to any caller without verifying admin role. User emails, clerkIds, and audit trails are exposed.
- **Recommended Fix:** Add `ctx.auth.getUserIdentity()` and role verification to all admin-only queries. Return empty/error responses for unauthorized callers.

### [DEBT-012] Large Monolithic Components
- **Severity:** 🟠 High
- **Category:** Frontend Maintainability
- **Location:** `src/features/plan-builder/plan-builder-form.tsx` (574 lines), `src/components/user/session/session-tracker.tsx` (456 lines), `src/components/landing-page-client.tsx` (422 lines), `src/app/admin/dashboard/page.tsx` (363 lines), `src/components/reports/report-template.tsx` (339 lines)
- **Description:** 10 components exceed 150 lines, with the largest at 574 lines containing form logic, preview, and day/exercise management all in one file. This makes testing, reuse, and code review difficult.
- **Recommended Fix:** Extract sub-components (e.g., `PlanPreview`, `DayCard`, `ExerciseRow` from plan-builder). Extract hooks (e.g., `useSessionTimer` from session-tracker). Split page files into separate component files.

### [DEBT-013] Improper Server/Client Component Boundaries
- **Severity:** 🟠 High
- **Category:** Frontend Performance
- **Location:** `src/app/admin/dashboard/page.tsx` (line 1), `src/components/ui/table.tsx` (line 1), `src/components/ui/label.tsx` (line 1), `src/components/messaging/message-bubble.tsx` (line 1), `src/components/animations/stagger.tsx` (line 1), `src/components/user/day-selector.tsx` (line 1)
- **Description:** 6 components are marked `"use client"` but use no hooks or browser APIs. This unnecessarily increases the client bundle size and prevents server-side rendering optimizations.
- **Recommended Fix:** Remove `"use client"` from pure presentational components. Move `"use client"` only to the lowest necessary component in the tree that actually uses hooks.

### [DEBT-014] Missing Zod Validation on Mutations
- **Severity:** 🟠 High
- **Category:** Backend Robustness
- **Location:** `convex/plans.ts` (lines 42-85), `convex/sessions.ts` (lines 34-231), `convex/messages.ts` (lines 128-192), `convex/checkins.ts` (lines 120-177), `convex/progress.ts` (lines 38-59)
- **Description:** 13 validation gaps: no startDate<endDate check on plans, no existence checks before patch operations, no message length limits, no bounds checking on setIndex, no duplicate prevention on progress entries, no weekNumber range validation.
- **Recommended Fix:** Add Zod schemas for all mutation arguments. Validate: date ordering, entity existence, numeric bounds, string lengths, enum values. Use Convex's built-in validators (`v.string()`, `v.number()`) with additional business logic checks.

### [DEBT-015] Excessive `any` Type Usage
- **Severity:** 🟡 Medium
- **Category:** Code Quality
- **Location:** `convex/pushActions.ts` (line 8), `convex/crons.ts` (line 14), `convex/schema.ts` (line 154), `src/lib/auth-server.ts` (lines 16-17), `src/proxy.ts` (lines 25-26), `src/app/api/webhooks/clerk/route.ts` (lines 69-85), `src/features/plan-builder/plan-builder-form.tsx` (lines 259-260), `src/components/admin/audit-log-viewer.tsx` (line 144), `convex/__tests__/test-utils.ts` (10+ instances)
- **Description:** 30+ individual `any` type instances across backend and frontend. The `InternalApi` type is explicitly `any`. Audit metadata uses `v.any()`. Multiple files use `eslint-disable` to cast Convex API calls to `any`.
- **Recommended Fix:** Use Convex generated types from `convex/_generated/api` instead of string-based casts. Define proper types for audit metadata. Remove `eslint-disable` comments and fix the underlying type issues.

### [DEBT-016] Dead/Unused Code
- **Severity:** 🟡 Medium
- **Category:** Code Quality
- **Location:** `src/lib/convex.ts`, `src/lib/auth.ts` (`canAccess`), `src/components/user/session/set-input.tsx`, `src/components/user/day-section.tsx`, `src/components/user/plan-header.tsx`, `src/components/admin/audit-log-viewer.tsx`, `src/components/messaging/index.ts` (most exports), `convex/push.ts` (`getSubscriptionInternal`, `getPreferencesInternal`), `convex/sessions.ts` (`finish` vs `complete`)
- **Description:** 16 instances of dead or unused code. `convex.ts` creates a duplicate Convex client. `canAccess` is exported but never imported. `set-input.tsx` is replaced by `set-row.tsx`. Several barrel exports are unused. `finish` and `complete` mutations overlap.
- **Recommended Fix:** Delete dead files. Remove unused exports. Consolidate `finish`/`complete` into a single mutation. Clean up barrel exports to only include used components.

### [DEBT-017] Inefficient Re-renders and Missing Memoization
- **Severity:** 🟡 Medium
- **Category:** Frontend Performance
- **Location:** `src/components/messaging/chat-panel.tsx` (lines 194-207), `src/components/gamification/pr-celebration.tsx` (lines 24-29), `src/components/coach/volume-chart.tsx` (line 124), `src/features/plan-builder/plan-builder-form.tsx` (line 221), `src/components/user/exercise-preview-card.tsx` (line 62)
- **Description:** 10 re-render issues: inline IIFE in JSX, `Math.random()` during render causing flickering, `useWatch` returning new references on every keystroke, inline style objects created per render, confetti particles recalculated on every render.
- **Recommended Fix:** Wrap `ConfettiParticle` values in `useMemo` with empty deps. Extract inline functions to `useCallback`. Use CSS custom properties for animation delays instead of inline styles. Memoize `VolumeChartSkeleton` bar heights.

### [DEBT-018] Hardcoded Colors Instead of CSS Variables
- **Severity:** 🟡 Medium
- **Category:** UI Consistency
- **Location:** `src/app/admin/layout.tsx` (lines 12, 14), `src/app/admin/dashboard/page.tsx` (lines 58-194), `src/app/sentry-example-page/page.tsx` (lines 113-234), `src/components/coach/volume-chart.tsx` (lines 60-101)
- **Description:** Extensive use of hardcoded `zinc-800`, `zinc-900`, `zinc-950`, `amber-500`, `blue-500` across admin and coach sections. Recharts SVG colors use inline `oklch()` strings. Sentry example page has 120+ lines of hardcoded CSS.
- **Recommended Fix:** Replace hardcoded colors with CSS variable references (`bg-background`, `bg-card`, `text-foreground`). For Recharts, create a theme constants file. Remove Sentry example page.

### [DEBT-019] Missing Accessibility (ARIA) Labels
- **Severity:** 🟡 Medium
- **Category:** Accessibility
- **Location:** `src/components/messaging/chat-panel.tsx` (lines 103, 192), `src/components/messaging/chat-input.tsx` (lines 76, 92), `src/components/mobile-bottom-nav.tsx` (line 35), `src/components/checkins/weekly-checkin-form.tsx` (lines 176, 248), `src/components/gamification/pr-celebration.tsx` (line 102), `src/components/notifications/notification-preferences.tsx` (lines 166-179)
- **Description:** 13 accessibility issues: chat trigger button has no `aria-label`, textarea inputs lack labels, navigation has no `aria-label`, toggle switches missing `role="switch"` and `aria-checked`, PR celebration overlay has no `role="alert"`, photo remove button uses unlabelled `x`.
- **Recommended Fix:** Add `aria-label` to all icon-only buttons. Associate `<label>` elements with form inputs. Add `role="switch"` and `aria-checked` to toggles. Add `role="alert"` and `aria-live="polite"` to the PR overlay. Add `aria-label="Main navigation"` to the bottom nav.

### [DEBT-020] `console.log` in Production Code
- **Severity:** 🟡 Medium
- **Category:** Code Quality
- **Location:** `src/proxy.ts` (line 59)
- **Description:** Logs authenticated user's Clerk ID and role on every request. While Next.js production builds strip `console.log`, this is still a code quality concern and could leak PII in server logs.
- **Recommended Fix:** Remove the `console.log` or gate it behind `process.env.NODE_ENV === "development"`. Use structured logging with a proper logger if audit logging is needed.

### [DEBT-021] Date Handling Timezone Issues
- **Severity:** 🟡 Medium
- **Category:** Backend Correctness
- **Location:** `convex/gamification.ts` (lines 143-163), `convex/push.ts` (lines 171-189), `convex/users.ts` (lines 4-10)
- **Description:** `toLocaleDateString("en-US", { weekday: "long" })` is locale-dependent and may return non-English day names on servers with different locales. `new Date(string)` date arithmetic is affected by DST. `toISOString().split("T")[0]` uses UTC date which differs from local date.
- **Recommended Fix:** Use a fixed locale (`en-US`) with explicit timezone handling. Store dates as UTC midnight. Use date-only string comparisons instead of Date object arithmetic.

### [DEBT-022] Inconsistent Auth Patterns
- **Severity:** 🟡 Medium
- **Category:** Code Quality
- **Location:** `src/app/user/dashboard/page.tsx` (lines 5-12), `src/lib/auth-server.ts`, `src/lib/auth.ts`, `src/app/coach/dashboard/page.tsx`
- **Description:** Multiple auth patterns: some pages use `requireAuth()`, others use `requireRole()`, others use `auth()` directly from Clerk. `src/lib/auth.ts` has `"use client"` but exports a "server-side role guard" comment. Role types are duplicated across 3 files.
- **Recommended Fix:** Standardize on `requireAuth()` and `requireRole()` from `auth-server.ts`. Remove `src/lib/auth.ts` client-side role hooks. Centralize role type in a single location.

### [DEBT-023] Stripe Webhook Handlers Are No-Ops
- **Severity:** 🟠 High
- **Category:** Functional / Revenue
- **Location:** `src/app/api/webhooks/stripe/route.ts` (lines 50-95)
- **Description:** All Stripe event handlers only log and have TODO comments. Payments are received but no subscription state is tracked. Users could pay but never receive premium features. Returning 200 on processing errors prevents Stripe retries.
- **Recommended Fix:** Implement subscription state tracking in Convex. Return 500 for transient errors so Stripe retries. Create a `subscriptions` table to track payment status.

### [DEBT-024] Duplicate Convex Client Instances
- **Severity:** 🔵 Low
- **Category:** Code Quality
- **Location:** `src/lib/convex.ts`, `src/components/providers/convex-provider.tsx`
- **Description:** `convex.ts` creates a `ConvexReactClient` instance that is never used. The actual client is in `convex-provider.tsx`. This creates confusion about which client is active.
- **Recommended Fix:** Delete `src/lib/convex.ts`. Use the provider's client exclusively.

### [DEBT-025] Storybook Not Fully Configured
- **Severity:** 🔵 Low
- **Category:** Developer Experience
- **Location:** `.storybook/main.ts`, `.storybook/preview.ts`
- **Description:** Storybook is configured but no `stories` script output exists. The `viteFinal` alias setup may not work correctly with Next.js path aliases. No Chromatic or visual regression testing is set up.
- **Recommended Fix:** Verify Storybook builds with `npm run build-storybook`. Add visual regression testing with Chromatic or Percy.

### [DEBT-026] Unused Dependencies
- **Severity:** 🔵 Low
- **Category:** Code Quality
- **Location:** `package.json`
- **Description:** `@types/web-push` is in `dependencies` instead of `devDependencies`. Several packages may be unused (need bundle analysis to confirm).
- **Recommended Fix:** Move `@types/web-push` to `devDependencies`. Run `npx depcheck` to find unused packages.

### [DEBT-027] Missing `tsconfig.json` Strictness Options
- **Severity:** 🔵 Low
- **Category:** Code Quality
- **Location:** `tsconfig.json`
- **Description:** `skipLibCheck: true` suppresses type errors in dependencies. Missing `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`. While `strict: true` is enabled, these additional checks would catch more bugs.
- **Recommended Fix:** Enable `noFallthroughCasesInSwitch`. Consider enabling `noUncheckedIndexedAccess` (already on). Remove `skipLibCheck` if feasible.

### [DEBT-028] False Structured Data Ratings
- **Severity:** 🔵 Low
- **Category:** SEO / Compliance
- **Location:** `src/components/landing-page-client.tsx` (lines 125, 152)
- **Description:** JSON-LD contains fabricated aggregate ratings (`ratingValue: "4.9"`, `ratingCount: "1247"`) and fake testimonials. This constitutes false structured data that could result in search engine penalties.
- **Recommended Fix:** Remove fabricated ratings or replace with real data when available. Ensure all structured data accurately represents the product.

### [DEBT-029] No Unit Tests for Frontend Components
- **Severity:** 🔵 Low
- **Category:** Testing
- **Location:** `src/` (entire directory)
- **Description:** While Vitest is configured for Convex backend tests, zero unit tests exist for any React components, hooks, or utility functions in `src/`.
- **Recommended Fix:** Add tests for critical hooks (`useActivePlan`, `usePRDetection`), utility functions (`cn`, `formatRelativeTime`), and key components.

### [DEBT-030] E2E Tests Only Cover Navigation
- **Severity:** 🔵 Low
- **Category:** Testing
- **Location:** `e2e/core-flow.spec.ts`
- **Description:** E2E tests only verify route redirects and page loads. No tests cover the actual user flows: creating plans, logging workouts, sending messages, or PR detection.
- **Recommended Fix:** Add E2E tests for: coach creates plan → client sees plan → client logs workout → coach sees completion. Use Clerk test mode for auth bypass.

---

## 3. Quick Wins

1. **Delete dead files** (10 min): Remove `src/lib/convex.ts`, `src/app/debug/page.tsx`, `src/app/sentry-example-page/page.tsx`, `src/app/api/sentry-example-api/route.ts`, `src/components/user/session/set-input.tsx`, `src/components/user/day-section.tsx`, `src/components/user/plan-header.tsx`. This eliminates ~800 lines of dead code and removes critical security exposures.

2. **Add `aria-label` to icon-only buttons** (15 min): Add `aria-label="Open messages"` to chat trigger, `aria-label="Attach file"` to paperclip button, `aria-label="Send message"` to send button, `aria-label="Toggle notification"` to preference toggles. Fixes 8 accessibility issues in one pass.

3. **Move `@types/web-push` to devDependencies** (2 min): Run `npm install --save-dev @types/web-push && npm uninstall @types/web-push` to move it from dependencies.

4. **Remove `console.log` from proxy** (2 min): Delete or comment out line 59 in `src/proxy.ts` to stop logging user IDs in production.

5. **Add `loading.tsx` to dashboard routes** (20 min): Create simple skeleton loading states for `/admin/dashboard`, `/coach/dashboard`, `/user/dashboard` to provide instant feedback during page loads.

---

## 4. Strategic Refactors

1. **Convex Authorization Layer** (2-3 days): Implement a middleware-style authorization system for all Convex mutations and queries. Create a `withAuth(ctx, role)` helper that verifies the caller's Clerk JWT, looks up their role, and throws if unauthorized. Apply this to all 24+ mutations and all admin-only queries. This is the single most impactful security fix and blocks production deployment until completed.

2. **Component Decomposition Sprint** (3-5 days): Break down the 10 monolithic components into focused sub-components. Priority targets: `plan-builder-form.tsx` (574→5 files), `session-tracker.tsx` (456→4 files), `landing-page-client.tsx` (422→6 files), `admin/dashboard/page.tsx` (363→3 files). Extract custom hooks, create focused presentational components, and establish a consistent file-per-component pattern.

3. **Convex Query Optimization** (2-3 days): Eliminate all 14 N+1 query patterns by batched queries and denormalization. Add composite indexes for all multi-field query patterns. Create a `searchIndex` table for full-text search instead of loading all records. This is critical for performance at scale and will prevent Convex transaction limit errors.

---

*Audit performed on 2026-06-18. Total issues identified: 30 registry items covering 180+ individual findings across backend (83), frontend (97), and security/config (30) layers.*
