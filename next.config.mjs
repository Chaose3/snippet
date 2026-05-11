/** @type {import('next').NextConfig} */
const extraDevOrigins =
  process.env.NEXT_DEV_EXTRA_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ??
  [];

const nextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", ...extraDevOrigins],
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
