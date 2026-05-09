import "server-only";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export interface WikiPageRow {
  id: string;
  kbType: "policy" | "biz";
  slug: string;
  title: string;
  content: string;
  sourceUrl: string | null;
  version: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** toRow helper: Prisma 返回的 kbType 是 string，这里强转到联合类型 */
function toRow(p: {
  id: string; kbType: string; slug: string; title: string; content: string;
  sourceUrl: string | null; version: number;
  publishedAt: Date | null; createdAt: Date; updatedAt: Date;
}): WikiPageRow {
  return { ...p, kbType: p.kbType as "policy" | "biz" };
}

/** D-24: kbType 筛选 + title 模糊搜（搜索字段在 Plan 02-05 admin list 也复用） */
export async function listWikiPages(
  kbType?: "policy" | "biz" | null,
  titleQuery?: string
): Promise<WikiPageRow[]> {
  const pages = await prisma.wikiPage.findMany({
    where: {
      ...(kbType ? { kbType } : {}),
      ...(titleQuery ? { title: { contains: titleQuery, mode: "insensitive" } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return pages.map(toRow);
}

export async function getWikiPage(id: string): Promise<WikiPageRow | null> {
  const p = await prisma.wikiPage.findUnique({ where: { id } });
  return p ? toRow(p) : null;
}

export async function getWikiPageBySlug(
  kbType: "policy" | "biz",
  slug: string
): Promise<WikiPageRow | null> {
  const p = await prisma.wikiPage.findUnique({ where: { kbType_slug: { kbType, slug } } });
  return p ? toRow(p) : null;
}

/**
 * D-23: 事务性更新 wiki content + 写 WikiPageVersion + audit。
 * 实现放到 Plan 02-05（admin editor）。本 stub 仅声明签名让其它模块能 import。
 */
export interface UpdateWikiInput {
  id: string;
  content: string;
  editorId: string;
  diffSummary?: string;
}
export async function updateWikiContent(input: UpdateWikiInput): Promise<WikiPageRow> {
  const { id, content, editorId, diffSummary } = input;

  // ---- 事务：read → update → version snapshot ----
  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.wikiPage.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`WikiPage not found: ${id}`);
    }

    const newVersion = existing.version + 1;
    const result = await tx.wikiPage.update({
      where: { id },
      data: {
        content,
        version: newVersion,
      },
    });

    await tx.wikiPageVersion.create({
      data: {
        wikiPageId: id,
        version: newVersion,
        contentSnapshot: content,
        editorId,
        diffSummary: diffSummary ?? `manual edit by ${editorId}`,
      },
    });

    return result;
  });

  // ---- 事务外：audit (D-26) ----
  await logAudit({
    actor: `admin:${editorId}`,
    action: "wiki.update",
    targetType: "wiki_page",
    targetId: id,
    before: { version: updated.version - 1 },
    after: {
      version: updated.version,
      contentChars: content.length,
      kbType: updated.kbType,
      slug: updated.slug,
    },
  });

  return toRow(updated);
}
