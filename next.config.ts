import type { NextConfig } from "next";

/**
 * Static export only. This project has no server runtime by design:
 * no API routes, no server actions, no middleware. The whole policy
 * layer runs in the tab, and the build output is a folder of files.
 */
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
