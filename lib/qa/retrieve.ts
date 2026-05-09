import "server-only";
import { prisma } from "@/lib/db";
import { QA_CONFIG } from "@/lib/qa/config";

export interface RetrievalResult {
  page: {
    id: string;
    slug: string;
    title: string;
    content: string;
    sourceUrl: string | null;
  };
  score: number;
}

/** 降级路径的固定分（ILIKE 无法计算真实相似度，统一给 0.5） */
const ILIKE_FALLBACK_SCORE = 0.5;

/**
 * pg_trgm 字符三元组相似度检索（autoplan B1 修正：替换 tsvector 'simple' 配置）。
 * word_similarity 对中文短语效果显著优于 simple tsvector（无需中文分词扩展）。
 * 前置条件：Task 0 migration 已运行（CREATE EXTENSION pg_trgm + GIN index wiki_pages_content_trgm）。
 * 阈值过滤由 caller (lib/qa/answer.ts) 决定 hit/partial/miss 档位。
 *
 * D-08: top-K=3 默认；D-09: 阈值 0.1（pg_trgm 量级），SQL 内用 0.05 做初筛
 * 不在本模块的事：hit/partial/miss 判定、审计写入 —— 那些在 lib/qa/answer.ts。
 */
export async function retrieveTopK(
  question: string,
  kbType: "policy" | "biz",
  k: number = QA_CONFIG.TOP_K
): Promise<RetrievalResult[]> {
  if (!question || question.trim().length === 0) return [];

  try {
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      slug: string;
      title: string;
      content: string;
      source_url: string | null;
      score: number;
    }>>`
      SELECT id, slug, title, content, source_url,
             word_similarity(${question}, title || ' ' || content) AS score
      FROM wiki_pages
      WHERE kb_type = ${kbType}
        AND word_similarity(${question}, title || ' ' || content) > 0.05
      ORDER BY score DESC
      LIMIT ${k}
    `;

    return rows.map((r) => ({
      page: {
        id: r.id,
        slug: r.slug,
        title: r.title,
        content: r.content,
        sourceUrl: r.source_url,
      },
      score: typeof r.score === "number" ? r.score : Number(r.score),
    }));
  } catch (err) {
    console.warn("[qa.retrieve] pg_trgm 查询失败（Task 0 migration 是否已执行？），降级到 ILIKE:", err);
    const likeRows = await prisma.wikiPage.findMany({
      where: {
        kbType,
        OR: [
          { title: { contains: question, mode: "insensitive" } },
          { content: { contains: question, mode: "insensitive" } },
        ],
      },
      take: k,
      orderBy: { updatedAt: "desc" },
    });
    return likeRows.map((p) => ({
      page: {
        id: p.id,
        slug: p.slug,
        title: p.title,
        content: p.content,
        sourceUrl: p.sourceUrl,
      },
      score: ILIKE_FALLBACK_SCORE,
    }));
  }
}
