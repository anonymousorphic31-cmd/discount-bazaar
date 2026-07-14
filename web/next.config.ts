import path from "node:path";
import type { NextConfig } from "next";

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // The Replit preview proxies the dev server through an iframe on a
  // different origin — without this, Next's dev-origin check blocks HMR
  // and data requests. Next 16 does not honor a "*" wildcard here, so list
  // the concrete hosts the proxy can present as.
  allowedDevOrigins: process.env.REPLIT_DEV_DOMAIN
    ? [process.env.REPLIT_DEV_DOMAIN, "127.0.0.1", "localhost"]
    : ["127.0.0.1", "localhost"],

  // The repo has a root-level package-lock.json (backend) alongside this
  // app's own lockfile — pin the workspace root explicitly so Turbopack
  // doesn't have to guess (and warn) about it on every boot.
  turbopack: {
    root: path.join(__dirname),
  },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },

  async rewrites() {
    return [
      {
        // Same-origin from the browser's perspective — avoids CORS and
        // keeps requests working inside the proxied preview iframe.
        source: "/api/:path*",
        destination: `${BACKEND_INTERNAL_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
