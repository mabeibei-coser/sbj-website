/**
 * Vitest 全局 setup
 * - 单元测试不依赖真实数据库；DB 测试走集成测试 (T11 后续添加)
 * - 加密测试需要 FIELD_ENCRYPTION_KEY；这里给一个固定的测试 key 保证可复现
 */

import { randomBytes } from "node:crypto";

if (!process.env.FIELD_ENCRYPTION_KEY) {
  // 32 字节固定测试 key (base64)。绝不在生产用。
  process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(32, "test-key-padding").toString("base64");
}

if (!process.env.ADMIN_SESSION_PASSWORD) {
  // 48 字节随机，每次测试 run 独立
  process.env.ADMIN_SESSION_PASSWORD = randomBytes(48).toString("base64");
}
