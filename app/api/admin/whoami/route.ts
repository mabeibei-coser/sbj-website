/**
 * Admin 当前 session 探针 (INF-06)
 * GET /api/admin/whoami → 200 { isAdmin, role, userId, loggedInAt } | 401 { error }
 *
 * 给 middleware T7 验证 + Phase 4 CRM 前端用。
 */

import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

export async function GET() {
  let session;
  try {
    session = await getAdminSession();
  } catch (err) {
    console.error("[admin/whoami] env 异常:", err);
    return NextResponse.json({ error: "服务端配置异常" }, { status: 500 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  return NextResponse.json({
    isAdmin: true,
    role: session.role ?? "admin",
    userId: session.userId ?? "default",
    loggedInAt: session.loggedInAt ?? null,
  });
}
