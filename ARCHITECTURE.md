# GymPro Architecture

## Overview

GymPro is a full-stack gym management platform built with Next.js 16, Convex, and Clerk authentication. It follows a modern server-first architecture with real-time capabilities.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 | UI framework and styling |
| Backend | Convex | Real-time database and serverless functions |
| Auth | Clerk | Authentication and user management |
| Monitoring | Sentry | Error tracking and performance monitoring |
| Analytics | PostHog | User analytics and event tracking |

## Project Structure

```
├── convex/                    # Convex backend
│   ├── _generated/           # Auto-generated types and API
│   ├── auth.ts              # User authentication and role management
│   ├── plans.ts             # Workout plan CRUD operations
│   ├── sessions.ts          # Workout session management
│   ├── messages.ts          # Real-time messaging
│   ├── gamification.ts      # Badges, streaks, and PR tracking
│   ├── progress.ts          # User progress tracking
│   ├── push.ts              # Push notification subscriptions
│   ├── pushActions.ts       # Web push notification sending
│   ├── emailActions.ts      # Transactional emails via Resend
│   └── schema.ts            # Database schema definitions
│
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── admin/          # Admin dashboard
│   │   ├── coach/          # Coach dashboard and management
│   │   ├── user/           # User dashboard and features
│   │   ├── api/            # API route handlers
│   │   │   └── webhooks/   # Clerk and Stripe webhooks
│   │   └── page.tsx        # Landing page
│   │
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui base components
│   │   ├── messaging/      # Chat interface components
│   │   ├── gamification/   # PR celebrations and trophy case
│   │   ├── admin/          # Admin-specific components
│   │   ├── coach/          # Coach-specific components
│   │   └── user/           # User-specific components
│   │
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions and auth helpers
│   └── types/              # TypeScript type definitions
│
├── e2e/                     # Playwright E2E tests
└── .github/workflows/       # CI/CD pipelines
```

## Database Schema

### Entity Relationships

```
Users (1) ──< Plans (Many)
    │
    ├──< Sessions (Many)
    │       │
    │       └──< SessionSets (Many)
    │
    ├──< Messages (Many)
    │       │
    │       └── Conversations (Many)
    │
    ├──< Progress (Many)
    │
    ├──< CheckIns (Many)
    │
    └── UserStats (1)
            │
            └──< Badges (Array)
```

### Key Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User profiles with roles | clerkId, email, role, coachId |
| `plans` | Workout plans created by coaches | coachId, clientId, exercises, status |
| `planItems` | Individual exercises in a plan | planId, dayOfWeek, exerciseName |
| `sessions` | Workout session records | clientId, coachId, planId, exercises |
| `sessionSets` | Logged sets during sessions | sessionId, exerciseName, actualWeight |
| `conversations` | Chat conversation metadata | participantIds, lastMessageAt |
| `messages` | Individual chat messages | conversationId, senderId, body |
| `userStats` | Gamification statistics | userId, currentStreak, totalVolume |
| `progress` | Body measurements over time | clientId, weight, bodyFat |

## Authentication Flow

### Clerk Integration

1. **Sign Up**: User creates account via Clerk
2. **Webhook**: Clerk sends `user.created` event to `/api/webhooks/clerk`
3. **Sync**: Webhook handler calls `auth:syncUser` to create Convex user
4. **Role Assignment**: User role is set from Clerk metadata or defaults to "user"
5. **Session**: Convex queries use `auth:getUserByClerkId` to identify users

### Role Hierarchy

```
admin (3) > coach (2) > user (1)
```

- **Admin**: Full access to all features
- **Coach**: Can create plans, view client progress, message clients
- **User**: Can view plans, log workouts, message coach

### Adding a New Role

1. Update `roleValidator` in `convex/schema.ts`
2. Add role to `ROLES` array in `convex/auth.ts`
3. Update `requireRole` function with new hierarchy level
4. Add role-specific pages in `src/app/[role]/`
5. Update navigation components to include new role

## Real-Time Features

### Messaging System

- **Conversations**: Stored in `conversations` table with participant IDs
- **Messages**: Real-time via Convex `useQuery` with `by_conversationId` index
- **Typing Indicators**: Ephemeral state in `typingIndicators` table (3s expiry)
- **Read Receipts**: `readBy` array tracks who has seen each message

### Optimistic Updates

Messages use optimistic UI:
1. User sends message → immediately appears in UI
2. Convex mutation fires in background
3. On success: message confirmed with server timestamp
4. On failure: error toast, message marked as failed

## Push Notifications

### VAPID Key Generation

```bash
npx web-push generate-vapid-keys
```

Set in `.env.local`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
```

### Notification Types

1. **Workout Reminders**: Daily at user's preferred time
2. **Message Notifications**: When coach/client sends message
3. **Check-in Reminders**: Weekly progress check-in prompts
4. **PR Celebrations**: Instant notification when new PR detected

## Testing Strategy

### Unit Tests (Vitest)

- Location: `convex/__tests__/*.test.ts`
- Coverage: Core business logic, mutations, queries
- Mocking: Convex database and context

### E2E Tests (Playwright)

- Location: `e2e/*.spec.ts`
- Coverage: Critical user journeys
- Auth: Test user accounts with Clerk

### CI Pipeline

1. **Lint & TypeCheck**: ESLint + TypeScript
2. **Unit Tests**: Vitest with coverage
3. **Build**: Next.js production build
4. **E2E Tests**: Playwright (PR only)
5. **Deploy**: Convex + Vercel (main branch only)

## Performance Considerations

### Convex Optimizations

- Use indexes for all query patterns
- Limit returned data with `take()` and `.first()`
- Use `withIndex()` instead of full table scans
- Batch mutations when possible

### Next.js Optimizations

- Server Components by default
- Dynamic imports for heavy components
- Image optimization with `next/font`
- Aggressive caching with `revalidate`

### PWA Features

- Service worker for offline support
- Manifest for installability
- Background sync for pending mutations
- Push notifications for engagement

## Environment Variables

### Required

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signature verification |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web push public key |
| `VAPID_PRIVATE_KEY` | Web push private key |
| `RESEND_API_KEY` | Resend email API key |

### Optional

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe payment processing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `SENTRY_DSN` | Sentry error tracking |
| `POSTHOG_KEY` | PostHog analytics |

## Deployment

### Convex

```bash
npx convex deploy
```

### Vercel

```bash
npx vercel --prod
```

### Manual

1. Push to `main` branch
2. GitHub Actions runs CI pipeline
3. On success, deploys to Convex
4. Vercel automatically deploys from `main`
