import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PostgreSQL/Prisma 走 server external，加密用 Node crypto 在 server-only 模块
  serverExternalPackages: ["@prisma/client", "bcryptjs"],

  // 生产环境用专属前缀，避免和同台服务器的 career-report 共用 /_next/static 时
  // chunks 被 nginx location / 反代到 3000 后 404，导致 React 不 hydrate
  assetPrefix: process.env.NODE_ENV === "production" ? "/sbj-assets" : undefined,

  // 生产路由别名 (Phase 3+ 会做完整路由迁移)
  async redirects() {
    return [
      { source: "/a500", destination: "/qa", permanent: false },
      { source: "/a500/:path*", destination: "/qa/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
