import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import clerkNext from "@clerk/eslint-plugin/next";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Convex-generated files — never lint generated code.
    "convex/_generated/**",
  ]),
  {
    rules: {
      // Standard TS convention: `_`-prefixed args/vars are intentionally unused.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  // Clerk resource-based auth gate: every App Router resource must perform an
  // authentication check. Mirrors the resource-level auth migration (proxy.ts
  // no longer gates routes). Public routes are opted out explicitly.
  {
    plugins: { "@clerk/next": clerkNext },
    rules: {
      "@clerk/next/require-auth-protection": [
        "error",
        {
          protected: ["**"],
          public: [
            // Auth entrypoints and public pages.
            "src/app/sign-in/**",
            "src/app/sign-up/**",
            "src/app/unauthorized/**",
            // Exact-folder match: covers only the root landing page + root
            // layout (src/app/page.tsx, src/app/layout.tsx), not subfolders.
            "src/app",
            // Public API surfaces: health probe + signature-verified webhooks.
            "src/app/api/health/**",
            "src/app/api/webhooks/**",
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
