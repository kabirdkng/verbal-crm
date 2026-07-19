import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prisma + ioredis ship native/Node bits; keep them external on Vercel serverless.
  serverExternalPackages: ["@prisma/client", "prisma", "ioredis"]
};

export default nextConfig;
