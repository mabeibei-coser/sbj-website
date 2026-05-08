/**
 * PIPL 数据导出 API (INF-07)
 *
 * POST /api/citizen/data/export
 *   { phone } → 200 { citizen, diagnosisRecords[], serviceLogs[], consentRecords[] }
 *           or 404 { error } if 该 phone 不存在
 *
 * Phase 1 限制 (同 consent API): 没有 SMS 验证, 谁拿到 phone 谁能导出。
 * Phase 2/3 后续 phase 加 OTP 验证。
 *
 * 解密所有字段 (phone / name / 简历内容)，输出 JSON。
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exportCitizenByPhone } from "@/lib/citizens";
import { logAudit } from "@/lib/audit";
import { hashField } from "@/lib/encryption";

const Schema = z.object({
  phone: z.string().regex(/^\d{11}$/, "手机号格式错误 (期望 11 位数字)"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 }
    );
  }
  const { phone } = parsed.data;
  const phoneHash = hashField(phone);

  const data = await exportCitizenByPhone(phone);

  await logAudit({
    actor: `citizen:${phoneHash}`,
    action: data ? "pipl.export.success" : "pipl.export.notfound",
    targetType: "citizen",
    targetId: data?.citizen.id,
    request: req,
  });

  if (!data) {
    return NextResponse.json({ error: "未找到对应市民档案" }, { status: 404 });
  }
  return NextResponse.json(data);
}
