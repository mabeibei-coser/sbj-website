import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E 测试配置
 *
 * 来源: D:\career-report\playwright.config.ts (adapt)
 * 改造点:
 * - 删 career-report 用例 (旧测试不在此处)
 * - 仍保留 E2E_MOCK_MODE 注入 (Phase 2/3 真接 LLM 时配合 lib/mocks/llm-mocks.ts)
 * - Phase 1 只测 admin-login + pipl-flow 两个流程
 *
 * 三个 project (与 career-report 保持一致):
 *   - Desktop Chrome
 *   - iPhone 14 (WebKit)
 *   - Pixel 7 (Chromium 移动 UA)
 *
 * 麦克风权限: Phase 1 不用，Phase 3 AI 访谈语音才会用到。
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: "http://localhost:3000",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "iPhone 14",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "Pixel 7",
      use: { ...devices["Pixel 7"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...(process.env as Record<string, string>),
      E2E_MOCK_MODE: "true",
    },
  },
});
