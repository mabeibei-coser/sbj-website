/**
 * GET /api/admin/wiki?kbType=policy|biz&q=<title 模糊搜>
 *
 * 鉴权：proxy.ts matcher /api/admin/* 自动拦截未登录请求（401）。本 handler 不重复鉴权。
 */
import { NextRequest, NextResponse } from "next/server";
import { listWikiPages } from "@/lib/qa/wiki";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const kbTypeRaw = url.searchParams.get("kbType");
  const q = url.searchParams.get("q") ?? undefined;

  if (kbTypeRaw && kbTypeRaw !== "policy" && kbTypeRaw !== "biz") {
    return NextResponse.json(
      { error: "kbType 必须是 policy 或 biz" },
      { status: 400 }
    );
  }

  try {
    const items = await listWikiPages(
      (kbTypeRaw as "policy" | "biz" | null) ?? null,
      q
    );
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[admin/wiki] list failed:", err);
    return NextResponse.json(
      { items: [], error: "查询失败" },
      { status: 500 }
    );
  }
}
