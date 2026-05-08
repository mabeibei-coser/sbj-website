/**
 * Admin 登录 API (INF-06)
 * POST /api/admin/login { password } → 200 { ok: true } | 401 { error }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginAdmin } from "@/lib/admin-session";
import { logAudit } from "@/lib/audit";

const LoginSchema = z.object({
  password: z.string().min(1, "密码不能为空"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
  }

  let ok = false;
  try {
    ok = await loginAdmin(parsed.data.password);
  } catch (err) {
    // env 校验失败等启动错误，不暴露给前端
    console.error("[admin/login] loginAdmin threw:", err);
    return NextResponse.json({ error: "服务端配置异常，请联系管理员" }, { status: 500 });
  }

  // 不论成功失败都审计
  await logAudit({
    actor: ok ? "admin:default" : "anonymous",
    action: ok ? "admin.login.success" : "admin.login.failed",
    request: req,
  });

  if (!ok) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
