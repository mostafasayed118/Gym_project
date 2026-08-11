# 🗺️ GymPro Neon Precision — Migration Master Plan

> **Scope:** CSS foundation tokens are already updated (globals.css). This plan covers every React component and layout that needs visual changes to match the new design. Zero business logic changes.

---

## Executive Summary

The new "Neon Precision" design introduces three major structural changes:

1. **Universal Sidebar Navigation** — All roles (User, Coach, Admin) now share a 240px fixed left sidebar instead of mobile-only bottom nav
2. **Olive-Black Color System** — Background shifts from zinc-gray (`#09090b`) to olive-black (`#111508`), borders from zinc to olive-tinted (`#444933`)
3. **Glassmorphism Everywhere** — All cards/surfaces use `rgba(9,9,11,0.5)` + `blur(24px)` + `1px solid rgba(68,73,51,0.2)`

**Total files affected:** ~45 files across 8 directories
**New components needed:** 4
**Estimated effort:** 3-4 focused sessions

---

## 1. Global Layout & Navigation

### 1.1 NEW: Shared Sidebar Navigation Component

- **Target File:** `src/components/navigation/sidebar-nav.tsx` (NEW)
- **Visual Changes Required:**
  - Fixed left sidebar `w-[240px]` with `bg-surface-container-lowest/50 backdrop-blur-2xl border-r border-outline-variant/10`
  - Logo: `font-headline-lg text-headline-lg font-black text-primary-fixed tracking-tighter` with gradient text
  - Nav links: `flex items-center gap-stack-md text-on-surface-variant px-4 py-3 hover:bg-surface-variant/50 rounded-lg`
  - Active link: `bg-primary-container text-on-primary-container shadow-[0_0_20px_rgba(171,214,0,0.3)]`
  - User profile at bottom: avatar + name + role badge
  - Role-based menu items (different for user/coach/admin)
- **Logic Preservation Warning:** `usePathname()` for active state detection MUST NOT be changed. Role-based filtering logic MUST stay as-is.
- **New Components Needed:** This is the new shared sidebar component

### 1.2 Root Layout

- **Target File:** `src/app/layout.tsx`
- **Visual Changes Required:**
  - Body class: add `bg-[#111508] text-[#e2e4cf]` for the olive-black base
  - Add sidebar padding: `md:pl-[240px]` on main content wrapper
  - Keep all existing Provider wrappers (Clerk, Convex, Themes)
- **Logic Preservation Warning:** `ClerkProvider`, `Providers`, `ClientLayout`, `ServiceWorkerRegistration`, `Toaster` MUST NOT be moved or removed. Font loading (Geist Sans/Mono) stays identical.

### 1.3 Mobile Bottom Nav (DEPRECATE or CONDITIONAL)

- **Target File:** `src/components/mobile-bottom-nav.tsx`
- **Visual Changes Required:**
  - New design shows sidebar on ALL breakpoints. Bottom nav becomes obsolete for desktop layouts.
  - **Option A:** Remove entirely (new design is desktop-first)
  - **Option B:** Keep for `<768px` only, update colors to match olive palette
  - Current classes to change: `bg-zinc-900/95` → `bg-[#0c0f04]/95`, `border-zinc-700/50` → `border-[#444933]/50`
- **Logic Preservation Warning:** `usePathname()` active detection and `NAV_ITEMS` array MUST stay.

### 1.4 Client Layout

- **Target File:** `src/components/client-layout.tsx`
- **Visual Changes Required:**
  - May need to wrap children in a `ml-0 md:ml-[240px]` container for sidebar offset
  - Keep `MobileBottomNav` conditional rendering
- **Logic Preservation Warning:** All existing logic stays.

---

## 2. Landing Page

### 2.1 Landing Page Client

- **Target File:** `src/components/landing-page-client.tsx` (398 lines)
- **Visual Changes Required:**
  - **Body:** `bg-background` stays (now `#111508`)
  - **Hero Section:**
    - Add `bg-mesh` class to main wrapper (radial gradient overlay)
    - H1: Keep `text-gradient-neon` (now 45deg lime→teal)
    - Add version badge pill: `glass-surface rounded-full border border-[#c3f400]/20` with "Performance Hub v2.0 Live"
    - CTA buttons: Primary → `primary-gradient-btn` class (lime→teal gradient), Secondary → `glass-surface border border-[#444933]/50`
    - Add arrow icon to primary CTA
  - **Features Grid:**
    - Cards: `glass-surface p-stack-lg rounded-xl` (remove `bg-zinc-900/50 border-zinc-800/50`)
    - First card gets `border-l-4 border-l-[#c3f400]` accent
    - Icon containers: keep `bg-primary/10` (now `#abd600/10`)
  - **Testimonials:**
    - Cards: `glass-surface p-stack-lg rounded-xl border border-[#444933]/10`
    - Stars: keep `fill-primary text-primary`
  - **Pricing:**
    - Cards: `glass-surface p-stack-lg rounded-xl`
    - Popular card: `border-2 border-[#c3f400] neon-glow-pro` with `scale-105`
    - Badge: `bg-[#c3f400] text-[#09090b]` (inverted)
    - Price text: `font-metric-lg` (Geist Mono)
  - **CTA Section:**
    - Card: `glass-surface rounded-3xl p-12 border-t border-t-[#c3f400]/30`
    - Button: `primary-gradient-btn px-12 py-5 rounded-2xl text-xl font-black`
  - **Footer:**
    - Background: `bg-[#0c0f04]` (surface-container-lowest)
    - Border: `border-[#444933]/10`
    - Copyright: `font-label-caps text-[10px] uppercase tracking-widest`
- **Logic Preservation Warning:** `isAuthenticated` prop handling, `SignInButton`/`SignUpButton` from Clerk, `FEATURES`/`TESTIMONIALS`/`PRICING` data arrays MUST NOT change. JSON-LD structured data stays.

### 2.2 Landing Page Route

- **Target File:** `src/app/page.tsx`
- **Visual Changes Required:** None — server component just passes auth state.
- **Logic Preservation Warning:** `auth()` call and `LandingPageClient` rendering stay.

---

## 3. User Dashboard

### 3.1 User Dashboard Client

- **Target File:** `src/components/user/user-dashboard-client.tsx` (249 lines)
- **Visual Changes Required:**
  - **Page wrapper:** Remove `bg-zinc-950`, add `bg-background` (now olive)
  - **Header:** `bg-surface/50 backdrop-blur-2xl border-b border-[#444933]/10 h-[56px]`
  - **Greeting Card:** `bg-[#1a1d10] p-8 rounded-xl border border-[#444933]/10` (surface-container-low)
  - **Progress Ring:** Keep existing component, update stroke colors
  - **Stat Pills:** `glass-panel px-6 py-3 rounded-full` with `border-[#c3f400]/20` for active
  - **Day Selector:**
    - Grid: `grid grid-cols-7 gap-3` (was horizontal scroll, now 7-column grid)
    - Day cells: `h-20 glass-panel rounded-lg`
    - Active day: `bg-[#c3f400]/15 border border-[#c3f400]` with top bar indicator
    - Day labels: `font-label-caps text-[10px]` (Geist Mono uppercase)
  - **Exercise Cards:**
    - Card: `glass-panel p-5 rounded-xl hover:border-[#c3f400]/40 hover:-translate-y-1`
    - Icon container: `w-12 h-12 rounded-lg bg-[#333627] border border-[#444933]/10`
    - Exercise tags: `bg-[#c3f400]/10 text-[#abd600] text-[10px] px-2 py-0.5 rounded uppercase font-label-caps`
    - Stats: `font-metric-lg` (Geist Mono for numbers)
  - **Sticky CTA:**
    - Background: `bg-gradient-to-t from-[#111508] via-[#111508]/90 to-transparent`
    - Button: `h-14 px-12 rounded-full bg-gradient-to-r from-[#c3f400] to-[#00dce5] text-[#09090b] font-black text-sm uppercase tracking-widest neon-glow-primary`
- **Logic Preservation Warning:** `useActivePlan()` hook, `DaySelector`/`ExercisePreviewCard` component imports, `ChatPanel` trigger, `getGreeting()` function, `useMemo` for `activeDay` — ALL stay unchanged.

### 3.2 Day Selector

- **Target File:** `src/components/user/day-selector.tsx` (86 lines)
- **Visual Changes Required:**
  - Change from horizontal scroll to 7-column grid: `grid grid-cols-7 gap-3`
  - Each day cell: `h-20 glass-panel rounded-lg flex flex-col items-center justify-center gap-1`
  - Active state: `bg-[#c3f400]/15 border border-[#c3f400]` with `absolute top-0 left-0 w-full h-1 bg-[#c3f400]`
  - Day label: `font-label-caps text-[10px]`
  - Day number: `font-headline-lg text-xl font-bold` → active gets `text-[#abd600]`
  - Completed indicator: `w-1.5 h-1.5 bg-[#abd600] rounded-full mt-1 animate-pulse`
- **Logic Preservation Warning:** `days`, `selectedDay`, `currentDay`, `completedDays`, `onDaySelect` props stay. Completion check logic stays.

### 3.3 Exercise Preview Card

- **Target File:** `src/components/user/exercise-preview-card.tsx` (127 lines)
- **Visual Changes Required:**
  - Card: `glass-panel p-5 rounded-xl flex items-center justify-between hover:border-[#c3f400]/40 hover:-translate-y-1`
  - Icon: `w-12 h-12 rounded-lg bg-[#333627] border border-[#444933]/10` with `text-[#abd600]`
  - Exercise name: `font-headline-lg text-lg font-semibold`
  - Type tags: `bg-[#c3f400]/10 text-[#abd600] text-[10px] px-2 py-0.5 rounded uppercase font-label-caps`
  - Stats: `font-metric-lg` for numbers
- **Logic Preservation Warning:** `exercise` prop type, stagger animation index, all rendering logic stays.

---

## 4. Session Tracker

### 4.1 Session Tracker Page

- **Target File:** `src/components/user/session/session-tracker.tsx` (416 lines)
- **Visual Changes Required:**
  - **Header:** `sticky top-0 z-40 h-[72px] bg-surface/50 backdrop-blur-2xl border-b border-[#444933]/10`
  - **Timer display:** `font-metric-lg text-[#abd600] text-[28px] font-bold tabular-nums`
  - **Progress bar:** `h-1 bg-[#282b1d]` track, fill: `bg-gradient-to-r from-[#abd600] to-[#00dce5] shadow-[0_0_15px_rgba(171,214,0,0.5)]`
  - **Exercise cards:** `glass-panel rounded-xl p-stack-lg mb-stack-lg hover:-translate-y-0.5`
  - **Finish button:** `w-full py-5 rounded-2xl gradient-primary text-[#09090b] font-headline-lg text-lg font-black uppercase tracking-tighter shadow-[0_10px_40px_rgba(171,214,0,0.25)]`
  - **Rest timer:** Floating `fixed bottom-6 right-6 w-72 glass-panel rounded-2xl` (was bottom-left)
- **Logic Preservation Warning:** `useSessionTimer`, `useMutation(api.sessions.logSet)`, `useMutation(api.sessions.finish)`, `checkForPR`, `updateUserStats`, `PRCelebration` state — ALL stay unchanged.

### 4.2 Exercise Tracker

- **Target File:** `src/components/user/session/exercise-tracker.tsx` (190 lines)
- **Visual Changes Required:**
  - Card: `glass-panel rounded-xl p-stack-lg relative overflow-hidden group hover:-translate-y-0.5`
  - Glow effect: `absolute top-0 right-0 w-32 h-32 bg-[#c3f400]/5 blur-3xl rounded-full`
  - Header: `font-headline-lg text-2xl font-bold tracking-tight`
  - Set counter: `bg-[#333627] px-3 py-1 rounded-full font-label-caps text-xs`
  - Completed set row: `bg-[#abd600]/5 border border-[#444933]/10`
  - Check button (completed): `w-10 h-10 rounded-lg bg-[#abd600] shadow-[0_0_12px_rgba(171,214,0,0.4)]`
- **Logic Preservation Warning:** `useMutation(api.sessions.logSet)`, `loggedSets` array, `onSetCompleted` callback, `memo` wrapper — ALL stay.

### 4.3 Set Row

- **Target File:** `src/components/user/session/set-row.tsx` (191 lines)
- **Visual Changes Required:**
  - Active row: `flex items-center gap-4 p-4 rounded-xl bg-zinc-900/40 border border-[#abd600]/40` with `active-glow`
  - Stepper buttons: `w-8 h-8 rounded-md bg-[#282b1d] border border-[#444933]/20` (was larger, now compact)
  - Stepper value: `font-metric-lg text-xl` (Geist Mono)
  - Unit label: `font-label-caps text-[10px] text-on-surface-variant`
  - Check box: `w-14 h-14 rounded-2xl bg-[#333627] border border-[#444933]/20` with inner checkbox
  - Completed state: values get `line-through` decoration
- **Logic Preservation Warning:** `onWeightChange`, `onRepsChange`, `onComplete` callbacks, `handleWeightStep`/`handleRepsStep` delta logic, `justCompleted` animation state — ALL stay.

### 4.4 Rest Timer

- **Target File:** `src/components/user/session/rest-timer.tsx` (130 lines)
- **Visual Changes Required:**
  - Position: `fixed bottom-6 right-6 w-72` (was `bottom-24 left-4 right-4`)
  - Container: `glass-panel rounded-2xl overflow-hidden shadow-2xl active-glow`
  - Progress bar: `h-1 w-full bg-[#333627]` track, fill: `gradient-primary shadow-[0_0_10px_rgba(171,214,0,0.4)]`
  - Timer display: `font-metric-lg text-3xl tabular-nums`
  - Controls: circular buttons `w-10 h-10 rounded-full border border-[#444933]/30`
  - Play button: `w-12 h-12 rounded-full bg-[#abd600] text-[#09090b]`
- **Logic Preservation Warning:** `duration`, `onComplete`, `onDismiss` props, countdown interval logic, pause/resume state — ALL stay.

---

## 5. Coach Dashboard

### 5.1 Coach Dashboard Client

- **Target File:** `src/app/coach/dashboard/client.tsx` (94 lines)
- **Visual Changes Required:**
  - **Header:** `flex justify-between items-center mb-stack-lg`
  - **Title:** `font-headline-lg text-headline-lg text-[#abd600]`
  - **Metrics row:** `grid grid-cols-4 gap-gutter` with `font-metric-lg text-3xl` values
  - **Client roster:** `glass-panel rounded-xl overflow-hidden`
  - **Roster header:** `p-gutter border-b border-[#444933]/10 bg-[#1a1d10]/30`
- **Logic Preservation Warning:** `useQuery(api.auth.listClients)`, role checks, `MetricCards` component, `ClientTable` component — ALL stay.

### 5.2 Client Table

- **Target File:** `src/components/coach/client-table.tsx` (280 lines)
- **Visual Changes Required:**
  - Table container: `bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10 rounded-xl`
  - Header cells: `font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest`
  - Row hover: `hover:bg-[#1e2113]/20`
  - Client avatar: `w-10 h-10 rounded-full border border-[#c3f400]/20`
  - Name: `font-headline-lg text-[16px] text-[#abd600]`
  - Status badge (active): `bg-[#c3f400]/10 text-[#abd600] text-[10px] font-black uppercase tracking-widest`
  - Message button: `border border-[#c3f400]/30 text-[#abd600] text-[10px] font-black uppercase`
  - View Plan button: `bg-gradient-to-r from-[#abd600] to-[#00dce5] text-[#09090b] text-[10px] font-black uppercase`
  - Pagination: `text-[12px] text-[#c4c9ac]`
- **Logic Preservation Warning:** `useQuery` for clients, pagination state, role filtering, `handleMessage`/`handleViewPlan` callbacks — ALL stay.

### 5.3 Metric Cards

- **Target File:** `src/components/coach/metric-cards.tsx` (99 lines)
- **Visual Changes Required:**
  - Card: `glass-panel p-stack-md rounded-xl`
  - Label: `font-label-caps text-[12px] text-[#c4c9ac] uppercase opacity-70`
  - Value: `font-metric-lg text-3xl` with color variants (lime/cyan/amber)
- **Logic Preservation Warning:** `metrics` prop, rendering logic — stays.

---

## 6. Admin Dashboard

### 6.1 Admin Layout

- **Target File:** `src/app/admin/layout.tsx` (17 lines)
- **Visual Changes Required:**
  - Remove `bg-zinc-950` → use `bg-background`
  - Remove amber top bar gradient (now handled by sidebar)
  - Add sidebar: import and render `SidebarNav` component
  - Add `md:pl-[240px]` to main content
- **Logic Preservation Warning:** `requireRole(["admin"])` stays.

### 6.2 Admin Header

- **Target File:** `src/app/admin/admin-header.tsx` (63 lines)
- **Visual Changes Required:**
  - Convert to top app bar: `sticky top-0 z-40 h-[56px] bg-surface/50 backdrop-blur-2xl border-b border-[#444933]/10`
  - Add `amber-gradient-top` (4px top border)
  - Title: `font-headline-lg text-headline-lg text-[#abd600]`
  - Search/notification icons: `p-2 hover:bg-[#333627] rounded-full`
  - Avatar: `w-8 h-8 rounded-full border border-[#444933]/30`
- **Logic Preservation Warning:** `useUser()` from Clerk, `CommandK` trigger, back link — stays.

### 6.3 Admin Dashboard Page

- **Target File:** `src/app/admin/dashboard/page.tsx` (252 lines)
- **Visual Changes Required:**
  - Page wrapper: `p-stack-lg max-w-container-max mx-auto space-y-stack-lg`
  - Metrics grid: `grid grid-cols-1 md:grid-cols-4 gap-stack-md`
  - Metric cards: `bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10 p-stack-md rounded-xl`
  - Error metric: `bg-[#ffb300]/5 border border-[#ffb300]/20` (amber)
  - Values: `font-metric-lg text-metric-lg text-[#abd600]`
  - Delta indicators: `text-[#abd600] text-xs font-bold font-label-caps`
  - Table: `bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10 rounded-xl`
  - Role badges: Admin=`bg-[#ffb300]/10 border-[#ffb300]/30 text-[#ffb300]`, Coach=`bg-[#c3f400]/10 border-[#c3f400]/30 text-[#abd600]`, User=`bg-[#333627]/20 border-[#444933]/30 text-[#c4c9ac]`
  - All text: `font-label-caps` for labels, `font-metric-lg` for numbers
- **Logic Preservation Warning:** `useQuery(api.auth.listAllUsers)`, `useMutation(api.auth.updateRole)`, role filter state, search state — ALL stay.

### 6.4 Mission Control

- **Target File:** `src/components/admin/mission-control.tsx` (399 lines)
- **Visual Changes Required:**
  - Cards: `bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10 p-stack-md rounded-xl`
  - Chart cards: `h-80` with `font-label-caps text-[12px]` titles
  - Activity dots: `bg-[#abd600] animate-pulse-dot` with `glow-lime`
  - Quick action buttons: `border border-[#444933]/20 rounded-lg hover:bg-[#333627]`
- **Logic Preservation Warning:** `useQuery(api.auth.getSystemHealth)`, `useQuery(api.audit.getRecentAuditLogs)`, Recharts config — ALL stay.

---

## 7. Messaging

### 7.1 Chat Layout

- **Target File:** `src/components/messaging/chat-layout.tsx` (105 lines)
- **Visual Changes Required:**
  - Desktop split: conversation list `w-80 border-r border-[#444933]/10`
  - Glass surfaces: `bg-[#0c0f04]/50 backdrop-blur-2xl`
- **Logic Preservation Warning:** `useQuery` for conversations, `activeConversationId` state, mobile detection — stays.

### 7.2 Conversation List

- **Target File:** `src/components/messaging/conversation-list.tsx` (158 lines)
- **Visual Changes Required:**
  - Search input: `bg-[#1e2113] border border-[#444933]/20 rounded-lg`
  - Active conversation: `bg-[#1e2113]/40 border-l-2 border-[#abd600]`
  - Unread badge: `bg-[#abd600] text-[#09090b]`
  - Time text: `text-[10px] text-[#c4c9ac]/60`
- **Logic Preservation Warning:** Search filter, `onSelect` callback, unread count — stays.

### 7.3 Message Bubble

- **Target File:** `src/components/messaging/message-bubble.tsx` (69 lines)
- **Visual Changes Required:**
  - Own message: `bg-gradient-to-r from-[#abd600] to-[#00dce5] text-[#09090b]`
  - Other message: `bg-[#1e2113] border border-[#444933]/50`
  - Avatar: `bg-[#333627]`
- **Logic Preservation Warning:** `isOwn`, `timestamp`, `readByCount` logic — stays.

### 7.4 Chat Input

- **Target File:** `src/components/messaging/chat-input.tsx` (118 lines)
- **Visual Changes Required:**
  - Input bar: `bg-[#0c0f04]/80 backdrop-blur-xl border-t border-[#444933]/60`
  - Textarea: `bg-[#1e2113] border border-[#444933]/80`
  - Send button: `bg-gradient-to-r from-[#abd600] to-[#00dce5] text-[#09090b]`
- **Logic Preservation Warning:** `onSend`, `onTyping` callbacks, Enter-to-send, auto-resize — stays.

---

## 8. Shared UI Components

### 8.1 Button

- **Target File:** `src/components/ui/button.tsx` (63 lines)
- **Visual Changes Required:**
  - `default` variant: `bg-[#abd600] text-[#09090b] hover:bg-[#abd600]/90 shadow-[0_0_20px_rgba(171,214,0,0.3)]`
  - `gradient` variant: `bg-gradient-to-r from-[#abd600] to-[#00dce5] text-[#09090b]`
  - `outline` variant: `border border-[#444933]/50 hover:bg-[#333627]/50`
  - `ghost` variant: `hover:bg-[#333627]/50`
  - `destructive` variant: `bg-[#ffb4ab]/10 text-[#ffb4ab]`
  - All buttons: `rounded-lg` (8px radius per design spec)
- **Logic Preservation Warning:** CVA variants structure, Base UI ButtonPrimitive, all size variants — stay.

### 8.2 Card

- **Target File:** `src/components/ui/card.tsx` (97 lines)
- **Visual Changes Required:**
  - Base: `bg-[rgba(9,9,11,0.5)] backdrop-blur-2xl border border-[rgba(68,73,51,0.2)] rounded-xl`
  - Footer: `border-t border-[#444933]/60 bg-[#0c0f04]/30`
  - Title: `font-heading text-base leading-snug font-semibold`
- **Logic Preservation Warning:** `size` and `hoverable` props, sub-component structure — stays.

### 8.3 Input

- **Target File:** `src/components/ui/input.tsx` (17 lines)
- **Visual Changes Required:**
  - Base: `bg-[#09090b] border border-[#444933]/40 rounded-lg`
  - Focus: `focus:border-[#abd600] focus:ring-0`
  - Focus glow: parent wrapper gets `neon-glow-active` (box-shadow on focus-within)
- **Logic Preservation Warning:** Base UI InputPrimitive wrapper — stays.

### 8.4 Badge

- **Target File:** `src/components/ui/badge.tsx` (48 lines)
- **Visual Changes Required:**
  - `default`: `bg-[#c3f400] text-[#09090b]` (inverted neon)
  - `secondary`: `bg-[#333627] text-[#e2e4cf]`
  - `outline`: `border-[#444933] text-[#e2e4cf]`
  - Height: `h-5`, radius: `rounded` (4px per design spec)
- **Logic Preservation Warning:** CVA structure, variant system — stays.

### 8.5 Table

- **Target File:** `src/components/ui/table.tsx` (104 lines)
- **Visual Changes Required:**
  - Header: `[&_tr]:border-b border-[#444933]/10`
  - Row hover: `hover:bg-[#1e2113]/20`
  - Cell padding: `p-2`
- **Logic Preservation Warning:** All sub-components — stays.

### 8.6 Skeleton

- **Target File:** `src/components/ui/skeleton.tsx` (21 lines)
- **Visual Changes Required:**
  - Shimmer: `skeleton-shimmer` class (already updated in globals.css to use olive colors)
- **Logic Preservation Warning:** `variant` prop — stays.

### 8.7 Dialog

- **Target File:** `src/components/ui/dialog.tsx` (93 lines)
- **Visual Changes Required:**
  - Backdrop: `bg-black/60 backdrop-blur-sm`
  - Content: `bg-[#111508] border border-[#444933]/80 rounded-xl`
- **Logic Preservation Warning:** Escape key handler, open/close state — stays.

### 8.8 Sheet

- **Target File:** `src/components/ui/sheet.tsx` (173 lines)
- **Visual Changes Required:**
  - Content: `bg-[#1e2113] border-[#444933]/80`
  - Overlay: `bg-black/60 backdrop-blur-sm`
- **Logic Preservation Warning:** Side variants, open/close state — stays.

### 8.9 Select

- **Target File:** `src/components/ui/select.tsx` (188 lines)
- **Visual Changes Required:**
  - Trigger: `bg-[#1e2113] border border-[#444933]/80`
  - Content: `bg-[#1e2113]/95 backdrop-blur-xl border border-[#444933]/80`
  - Focus item: `bg-[#abd600]/10 text-[#abd600]`
- **Logic Preservation Warning:** All Base UI Select primitives — stays.

### 8.10 Avatar

- **Target File:** `src/components/ui/avatar.tsx` (100 lines)
- **Visual Changes Required:**
  - Fallback: `bg-[#333627] text-[#c4c9ac]`
  - Border ring: `after:border-[#444933]/30`
- **Logic Preservation Warning:** Size variants, Badge/Group sub-components — stays.

---

## 9. Gamification

### 9.1 PR Celebration

- **Target File:** `src/components/gamification/pr-celebration.tsx` (181 lines)
- **Visual Changes Required:**
  - Overlay: `bg-black/40 backdrop-blur-sm`
  - Card: `rounded-3xl border border-[#abd600]/30 bg-[rgba(9,9,11,0.8)] backdrop-blur-2xl`
  - Trophy: gradient from `#abd600` to `#00dce5`
  - Title: `text-gradient-neon` (now 45deg)
  - Confetti colors: add `#abd600`, `#00dce5`, `#c3f400`
- **Logic Preservation Warning:** `show`, `exerciseName`, `newWeight`, `previousWeight` props, animation timers — stay.

### 9.2 Trophy Case

- **Target File:** `src/components/gamification/trophy-case.tsx` (223 lines)
- **Visual Changes Required:**
  - Cards: `glass-panel` style
  - Unlocked badge: `border-[#abd600]/30 bg-[#abd600]/5`
  - Locked badge: `opacity-40 grayscale border-[#444933]/40`
  - Stats: `font-metric-lg` for numbers
- **Logic Preservation Warning:** `useQuery(api.gamification.getUserStats)`, badge definition lookup — stays.

---

## 10. Animations Component

### 10.1 Progress Ring

- **Target File:** `src/components/animations/progress-ring.tsx` (119 lines)
- **Visual Changes Required:**
  - Stroke color: `#abd600` (neon lime)
  - Glow: `filter: drop-shadow(rgba(171, 214, 0, 0.8) 0px 0px 4px)`
  - Label: `font-metric-sm text-[12px] font-bold text-[#abd600]`
- **Logic Preservation Warning:** `value`, `max`, `size`, `strokeWidth`, `color`, `showLabel` props — stays.

### 10.2 Stagger

- **Target File:** `src/components/animations/stagger.tsx` (20 lines)
- **Visual Changes Required:** None — pure animation wrapper.
- **Logic Preservation Warning:** All logic stays.

---

## 11. New Components Needed

| Component | Purpose | Location |
|-----------|---------|----------|
| `SidebarNav` | Shared 240px sidebar for all roles | `src/components/navigation/sidebar-nav.tsx` |
| `IntensityBar` | Vertical bar chart for session intensity | `src/components/user/session/intensity-bar.tsx` |
| `AtmosphericBackground` | Radial gradient mesh overlay for hero sections | `src/components/animations/atmospheric-bg.tsx` |
| `AdminMetricCard` | Admin-specific metric card with amber variant | `src/components/admin/admin-metric-card.tsx` |

---

## 12. Files That Need NO Changes

These files are purely logic/state and have no visual styling to update:

- `src/hooks/use-active-plan.ts`
- `src/lib/utils.ts`
- `src/lib/auth-server.ts`
- `src/components/providers/*`
- `src/components/service-worker-registration.tsx`
- `src/components/offline-indicator.tsx`
- `convex/*` (all backend files)
- `src/app/api/*` (all API routes)
- All `page.tsx` server components (they just delegate to client components)

---

## 13. Implementation Order

| Phase | Priority | Files | Est. Time |
|-------|----------|-------|-----------|
| **1. Shared Sidebar** | Critical | `sidebar-nav.tsx` (new), `layout.tsx`, `client-layout.tsx` | 2h |
| **2. UI Primitives** | Critical | `button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx`, `select.tsx` | 1.5h |
| **3. User Dashboard** | High | `user-dashboard-client.tsx`, `day-selector.tsx`, `exercise-preview-card.tsx` | 2h |
| **4. Session Tracker** | High | `session-tracker.tsx`, `exercise-tracker.tsx`, `set-row.tsx`, `rest-timer.tsx` | 3h |
| **5. Coach Dashboard** | Medium | `client.tsx`, `client-table.tsx`, `metric-cards.tsx` | 1.5h |
| **6. Admin Dashboard** | Medium | `layout.tsx`, `admin-header.tsx`, `page.tsx`, `mission-control.tsx` | 2h |
| **7. Landing Page** | Medium | `landing-page-client.tsx` | 1.5h |
| **8. Messaging** | Low | `chat-layout.tsx`, `message-bubble.tsx`, `chat-input.tsx` | 1h |
| **9. Gamification** | Low | `pr-celebration.tsx`, `trophy-case.tsx` | 1h |
| **10. Polish & QA** | Critical | Visual regression testing, mobile responsiveness | 2h |

**Total estimated effort: ~17 hours across 3-4 sessions**
