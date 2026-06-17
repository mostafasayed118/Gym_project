"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ConvexClientProvider } from "./convex-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    </ConvexClientProvider>
  );
}
