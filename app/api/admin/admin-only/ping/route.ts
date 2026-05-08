/**
 * Admin-only 路径占位 (INF-06 middleware role 校验测试用)
 *
 * 仅 role==='admin' 可访问；reviewer 会在 middleware 被拦截 403。
 * Phase 1 没有真正的 admin-only 业务，这是给 e2e 测试用的最简端点。
 *
 * Phase 4 真业务 (e.g. 删除市民 / 修改 5 级标签终审) 走这个前缀。
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, message: "admin-only ping" });
}
