/**
 * Admin 登出 API (INF-06)
 * POST /api/admin/logout → 200 { ok: true }
 * 总是 200，避免 enum 攻击者发现 "已登录"。
 */

import { NextRequest, NextResponse } from "next/server";
import { logoutAdmin, getAdminSession } from "@/lib/admin-session";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  // 取登出前的 session 记审计
  let actor = "anonymous";
  try {
    const s = await getAdminSession();
    if (s.isAdmin) actor = `admin:${s.userId ?? "default"}`;
  } catch {
    /* env 错误 → 维持 anonymous */
  }

  await logoutAdmin();
  await logAudit({ actor, action: "admin.logout", request: req });

  return NextResponse.json({ ok: true });
}
