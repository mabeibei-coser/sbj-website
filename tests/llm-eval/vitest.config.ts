/**
 * Standalone vitest config for llm-eval tests.
 * The root vitest.config.ts excludes tests/llm-eval/** to keep CI fast.
 * This config is used only for: npx vitest run --config tests/llm-eval/vitest.config.ts
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/llm-eval/**/*.test.ts"],
    exclude: ["node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../.."),
      "server-only": path.resolve(__dirname, "../stubs/server-only.ts"),
    },
  },
});
