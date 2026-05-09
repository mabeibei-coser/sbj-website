import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PostgreSQL/Prisma 走 server external，加密用 Node crypto 在 server-only 模块
  serverExternalPackages: ["@prisma/client", "bcryptjs"],

  // 生产路由别名 (Phase 3+ 会做完整路由迁移)
  async redirects() {
    return [
      { source: "/a500", destination: "/qa", permanent: false },
      { source: "/a500/:path*", destination: "/qa/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
