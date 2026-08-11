import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  // Client-side init reads NEXT_PUBLIC_SENTRY_DSN (must be exposed to the browser).
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: process.env.NEXT_PUBLIC_SENTRY_SEND_PII === "true",

  tracesSampleRate: isProd ? 0.1 : 1,

  // Replay sample rate dialed down in prod — was 10% of ALL sessions, which
  // bloats the bundle and ships the replay SDK to users who never error.
  replaysSessionSampleRate: isProd ? 0.02 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [Sentry.replayIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
