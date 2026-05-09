/**
 * Admin wiki 编辑器 e2e。
 *
 * 鉴权：用 ADMIN_PASSWORD env（playwright.config.ts 注入）登录后再跑业务用例。
 * 数据（WRN 9 fix）：beforeAll 调 seedWikiFixture() 写 1 条已知 WikiPage；afterAll 真删。
 *       DB 不可达时 fixture 返 null，依赖它的 test 6 用 test.skip 跳过（不破坏 test 1-5）。
 *
 * test 1-3：未登录鉴权 — always on，不需要 env。
 * test 4-6：已登录业务流 — 需要 ADMIN_PASSWORD env；test 6 额外需要 DB 可达。
 */

import { test, expect } from "@playwright/test";
import {
  seedWikiFixture,
  cleanupWikiFixture,
  type E2EWikiFixture,
} from "./fixtures/seed-wiki";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
let fixture: E2EWikiFixture | null = null;

// ─── 未登录鉴权（always on）────────────────────────────────────────────────────

test.describe("admin wiki 鉴权", () => {
  test("1. 未登录访问 /admin/wiki 跳转 /admin/login（含 ?next=...）", async ({
    page,
  }) => {
    await page.goto("/admin/wiki");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page).toHaveURL(/[?&]next=%2Fadmin%2Fwiki/);
  });

  test("2. 未登录 PUT /api/admin/wiki/<id> 返回 401", async ({ request }) => {
    const res = await request.put("/api/admin/wiki/test-id", {
      data: { content: "X" },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
  });

  test("3. 未登录 GET /api/admin/wiki 返回 401", async ({ request }) => {
    const res = await request.get("/api/admin/wiki", {
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
  });
});

// ─── 已登录编辑流程（需要 ADMIN_PASSWORD env + 可选 DB）─────────────────────────

// describe block title 反映 skip 状态，便于 CI log 快速定位
test.describe(
  ADMIN_PASSWORD
    ? "admin wiki 编辑流程"
    : "admin wiki 编辑流程 (skip — no ADMIN_PASSWORD)",
  () => {
    test.skip(!ADMIN_PASSWORD, "ADMIN_PASSWORD env 未配置，跳过已登录用例");

    // WRN 9 fix: beforeAll 写 fixture WikiPage；afterAll 真删
    test.beforeAll(async () => {
      if (ADMIN_PASSWORD) {
        fixture = await seedWikiFixture();
        if (fixture) {
          console.log(
            `[e2e] WikiPage fixture seeded: id=${fixture.wikiPageId}, slug=${fixture.slug}`
          );
        } else {
          console.warn(
            "[e2e] WikiPage fixture 创建失败（DB 不可达）；test 6 将 skip"
          );
        }
      }
    });

    test.afterAll(async () => {
      if (fixture) {
        await cleanupWikiFixture();
        fixture = null;
        console.log("[e2e] WikiPage fixture cleaned up");
      }
    });

    test.beforeEach(async ({ page }) => {
      // 每个 test 前先登录
      await page.goto("/admin/login");
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/, { timeout: 8000 });
    });

    test("4. /admin/wiki 列表页加载（含 h1 + 筛选链接 + 标题列头）", async ({
      page,
    }) => {
      await page.goto("/admin/wiki");
      // 页面标题
      await expect(
        page.getByRole("heading", { level: 1, name: /Wiki 编辑/ })
      ).toBeVisible();
      // 筛选链接（全部 / 政策 / 创业）
      await expect(page.getByRole("link", { name: "全部" })).toBeVisible();
      await expect(page.getByRole("link", { name: "政策" })).toBeVisible();
      await expect(page.getByRole("link", { name: "创业" })).toBeVisible();
      // 表头：标题列
      await expect(
        page.getByRole("columnheader", { name: /标题/ })
      ).toBeVisible();
    });

    test("5. 切 kb 筛选链接 → URL 同步 ?kb=policy", async ({ page }) => {
      await page.goto("/admin/wiki");
      await page.getByRole("link", { name: "政策" }).click();
      await expect(page).toHaveURL(/[?&]kb=policy/);
    });

    test("6. 编辑器保存 → 版本 v1 → v2（用 fixture WikiPage，WRN 9 fix）", async ({
      page,
    }) => {
      test.skip(!fixture, "DB 不可达 / fixture 未创建（test 6 依赖 fixture）");
      // 直接打开 fixture 编辑页，不依赖列表第一行
      await page.goto(`/admin/wiki/${fixture!.wikiPageId}`);
      // 等编辑器加载（textarea aria-label="markdown 编辑器"）
      const editor = page.getByRole("textbox", { name: /markdown 编辑器/ });
      await expect(editor).toBeVisible({ timeout: 8000 });
      // 修改内容
      await editor.fill(fixture!.initialContent + "\n\n<!-- e2e edit -->");
      // 点保存
      await page.getByRole("button", { name: /^保存$/ }).click();
      // 等保存成功提示：版本 v1 → v2
      await expect(page.getByText(/已保存 → v2/)).toBeVisible({
        timeout: 10_000,
      });
    });
  }
);
