import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Consume the shared TS packages directly from source (monorepo).
  transpilePackages: ["@madeby/core", "@madeby/classify", "@madeby/analyzer"],
};

export default nextConfig;
