// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  // DSN from env so it can rotate without code changes.
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Down-sample traces in production — 100% ingestion was both costly and a
  // privacy concern. Dev keeps full sampling for debuggability.
  tracesSampleRate: isProd ? 0.1 : 1,

  enableLogs: true,

  // PII opt-in is environment-controlled. Off by default so production
  // doesn't ship request bodies / user emails to Sentry unless explicitly
  // enabled with `SENTRY_SEND_PII=true`.
  sendDefaultPii: process.env.SENTRY_SEND_PII === "true",
});
