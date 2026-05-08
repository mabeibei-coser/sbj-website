import { PrismaClient } from "@prisma/client";

/**
 * Prisma 客户端单例。Next.js dev 模式下避免 hot reload 创建多个连接池。
 * (parity with career-report 的 lib/db.ts 单例风格)
 */

declare global {
  var __prismaClient: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prismaClient ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaClient = prisma;
}
