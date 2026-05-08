import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PostgreSQL/Prisma 走 server external，加密用 Node crypto 在 server-only 模块
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
