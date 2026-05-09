/**
 * GET /api/qa/hot?kb=policy|biz (QA-10 / D-14 / D-15)
 *
 * 返回指定知识库的 3 个热点问题预设答案。
 * **绝不调 LLM**（D-15 / D-16 / D-29）——热点答案由人工编辑写入 content/qa-hot/{kb}/*.md。
 * 文件读失败时返回 500 + items=[]（T-02-10：不暴露 fs path / stack）。
 */

import { NextResponse, type NextRequest } from "next/server";
import { getHotQuestions, type KbType } from "@/lib/qa/hot-questions";

function parseKb(value: string | null): KbType {
  return value === "biz" ? "biz" : "policy";
}

export async function GET(req: NextRequest) {
  const kb = parseKb(req.nextUrl.searchParams.get("kb"));
  try {
    const items = await getHotQuestions(kb);
    return NextResponse.json({ items, kb });
  } catch (err) {
    console.error("[qa/hot] failed:", err);
    return NextResponse.json(
      { items: [], error: "热点暂时不可用" },
      { status: 500 }
    );
  }
}
