import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    resolveAlias: {
      "@convex/": "./convex/",
    },
  },
};

export default nextConfig;
