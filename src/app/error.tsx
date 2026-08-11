"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Root-segment error boundary. Catches any uncaught error in the landing,
 * sign-in, sign-up, or other root-level pages before it bubbles to
 * `global-error.tsx` (which renders an unbranded `NextError`). Closes
 * BUG-074 (root segment had no error.tsx).
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#111508] p-8 text-center">
      <h2 className="text-2xl font-bold text-[#e2e4cf]">Something went wrong</h2>
      <p className="max-w-md text-sm text-[#c4c9ac]">
        We hit an unexpected error. The team has been notified.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-[#c4c9ac]/60">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
        <Button render={<Link href="/" />} variant="default">
          Back home
        </Button>
      </div>
    </div>
  );
}
