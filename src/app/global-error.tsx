"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Last-resort error boundary. Wraps `<html>` and `<body>` because it can fire
 * before the root layout mounts. Closes BUG-075 (was rendering an unbranded
 * `NextError` with a misleading "0 server-side exception" message).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#111508",
          color: "#e2e4cf",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            GymPro hit an unexpected error
          </h1>
          <p style={{ color: "#c4c9ac", marginBottom: "1.5rem" }}>
            The team has been notified. Please try again in a moment.
          </p>
          {error.digest ? (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                color: "rgba(196, 201, 172, 0.6)",
                marginBottom: "1.5rem",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            onClick={() => reset()}
            type="button"
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.5rem",
              background: "linear-gradient(45deg, #abd600, #00dce5)",
              color: "#09090b",
              fontWeight: 600,
              border: 0,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
