import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Consume the shared TS package directly from source (monorepo).
  transpilePackages: ["@madeby/core"],
};

export default nextConfig;
