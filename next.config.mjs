/** @type {import('next').NextConfig} */
const extraDevOrigins =
  process.env.NEXT_DEV_EXTRA_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ??
  [];

const nextConfig = {
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
