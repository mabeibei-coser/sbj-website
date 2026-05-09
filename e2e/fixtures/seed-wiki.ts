/**
 * E2E fixture: admin wiki 测试 beforeAll 创建 1 条已知 WikiPage 行；afterAll 真删。
 *
 * 设计：
 * - DB 不可达时返 null（beforeAll 捕获，依赖 fixture 的 test 用 test.skip 跳过）
 * - 唯一 slug "e2e-fixture-policy" 避免和真实数据冲突
 * - cleanup 真删（onDelete: Cascade 自动连带 WikiPageVersion）
 *
 * WRN 9 fix: 不依赖列表已有数据 — 在 beforeAll 自己写一条，afterAll 自己删。
 *
 * ⚠ 警告：此 fixture 直接写真 DB。playwright.config.ts 必须保证 e2e 只在 dev/test DB 跑
 *        （单独的 DATABASE_URL_E2E 或 .env.e2e.local）。生产 DATABASE_URL 不要跑！
 */
import { PrismaClient } from "@prisma/client";

const FIXTURE_SLUG = "e2e-fixture-policy";
const FIXTURE_KB = "policy";

let prisma: PrismaClient | null = null;

export interface E2EWikiFixture {
  wikiPageId: string;
  slug: string;
  initialContent: string;
}

/**
 * 在 DB 中创建 1 条 e2e 专用 WikiPage 行，返回其 id + slug + 初始内容。
 * DB 不可达时返回 null（调用方用 test.skip 跳过相关测试）。
 */
export async function seedWikiFixture(): Promise<E2EWikiFixture | null> {
  prisma = prisma ?? new PrismaClient();
  try {
    // 先清理旧 fixture（避免重复跑残留）
    await prisma.wikiPage.deleteMany({
      where: { kbType: FIXTURE_KB, slug: FIXTURE_SLUG },
    });
    const initialContent =
      "# E2E Fixture\n\n这是 e2e 测试 fixture，beforeAll 创建，afterAll 删除。请勿手动编辑。";
    const created = await prisma.wikiPage.create({
      data: {
        kbType: FIXTURE_KB,
        slug: FIXTURE_SLUG,
        title: "E2E Fixture（请勿手动编辑）",
        content: initialContent,
        version: 1,
      },
    });
    return { wikiPageId: created.id, slug: FIXTURE_SLUG, initialContent };
  } catch (err) {
    console.warn(
      "[seed-wiki] DB 不可达，e2e 编辑测试将 skip:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * 删除 e2e fixture 行（afterAll 调用）。DB 不可达时 best-effort，不抛出。
 */
export async function cleanupWikiFixture(): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.wikiPage.deleteMany({
      where: { kbType: FIXTURE_KB, slug: FIXTURE_SLUG },
    });
  } catch {
    // best-effort
  } finally {
    await prisma.$disconnect();
    prisma = null;
  }
}
