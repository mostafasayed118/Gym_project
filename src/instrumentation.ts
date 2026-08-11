export async function register() {
  // Skip Sentry instrumentation when using Turbopack (known compatibility issue)
  if (process.env.TURBOPACK) {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export async function onRequestError(
  error: unknown,
  errorRequest: Readonly<{
    path: string;
    method: string;
    headers: NodeJS.Dict<string | string[]>;
  }>,
  errorContext: Readonly<{
    routerKind: string;
    routePath: string;
    routeType: string;
  }>,
) {
  if (process.env.TURBOPACK) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, errorRequest, errorContext);
}
