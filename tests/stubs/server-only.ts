/**
 * `server-only` 包在 Vitest 测试环境的占位 stub。
 * 生产代码里仍由 node_modules/server-only 提供真正的 RSC 边界保护。
 * 仅 vitest.config.ts 的 resolve.alias 把 import 路由到此文件。
 */
export {};
