import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const repoRoot = dirname(fileURLToPath(import.meta.url));
const appVersion = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")).version;

const extraDevOrigins =
  process.env.NEXT_DEV_EXTRA_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ??
  [];

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost", ...extraDevOrigins],
  /** Avoid bundling Capacitor into server/static workers (native modules are client-only). */
  serverExternalPackages: ["@capacitor/app", "@capacitor/browser", "@capacitor/core"],
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
