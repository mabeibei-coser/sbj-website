import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // E2E 用 Playwright (e2e/ 目录)，单元/集成在这里
    exclude: ["node_modules/**", ".next/**", "e2e/**", "tests/llm-eval/**"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // server-only 在测试环境 stub 成空模块；生产代码里它仍生效保护 RSC 边界
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});
