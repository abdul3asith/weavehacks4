import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Weave's auto-instrumentation breaks under Next's server bundler unless
  // it's treated as an external (not bundled) package.
  serverExternalPackages: ["weave"],
};

export default nextConfig;
