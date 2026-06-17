import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  turbopack: {
    resolveAlias: {
      "@convex/": "./convex/",
    },
  },
};

export default nextConfig;
