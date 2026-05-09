/**
 * PUT /api/admin/wiki/[id] — 更新 wiki 内容（事务 + audit 在 service 层写）
 *
 * 鉴权：proxy.ts matcher /api/admin/* 自动拦截未登录请求（401）。
 * 本 handler 用 getAdminSession 取 userId 写 audit actor，不重复 401 检查。
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-session";
import { updateWikiContent } from "@/lib/qa/wiki";

const PutSchema = z.object({
  content: z.string().min(1, "内容不能为空").max(50_000, "内容超过 50000 字"),
  diffSummary: z.string().max(500).optional(),
});

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  // 取 session（proxy 已保证 isAdmin=true，但还要 userId 写 audit）
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const editorId = session.userId ?? "default";

  // JSON 解析 + Zod 校验
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 }
    );
  }

  // 调 service
  try {
    const updated = await updateWikiContent({
      id,
      content: parsed.data.content,
      editorId,
      diffSummary: parsed.data.diffSummary,
    });
    return NextResponse.json({ ok: true, page: updated });
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      return NextResponse.json({ error: "Wiki 不存在" }, { status: 404 });
    }
    console.error("[admin/wiki PUT] failed:", err);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
