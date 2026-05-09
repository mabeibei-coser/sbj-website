/**
 * GET /api/qa/hot (QA-10 / D-14 / D-15)
 *
 * 返回 3 个热点问题预设答案。
 * **绝不调 LLM**（D-15 / D-16 / D-29）——热点答案由人工编辑写入 content/qa-hot/*.md。
 * 文件读失败时返回 500 + items=[]（T-02-10：不暴露 fs path / stack）。
 */

import { NextResponse } from "next/server";
import { getHotQuestions } from "@/lib/qa/hot-questions";

export async function GET() {
  try {
    const items = await getHotQuestions();
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[qa/hot] failed:", err);
    return NextResponse.json(
      { items: [], error: "热点暂时不可用" },
      { status: 500 }
    );
  }
}
