"use client";

import { Suspense } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ConvexClientProvider } from "./convex-provider";
import { PostHogProvider, PostHogPageView } from "@/lib/analytics";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </PostHogProvider>
      </NextThemesProvider>
    </ConvexClientProvider>
  );
}
