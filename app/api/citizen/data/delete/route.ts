/**
 * PIPL 数据真删 API (INF-07)
 *
 * POST /api/citizen/data/delete
 *   { phone } → 200 { deleted: true } | 404 { error } if 不存在
 *
 * - 真删 (不留软删除标记)，符合 V8 plan 的 PIPL 要求
 * - Prisma onDelete: Cascade 级联删除 diagnosis_records / service_logs / consent_records
 *
 * Phase 1 限制 (同 export API): 没有 SMS 验证。生产前必须接 OTP。
 * 当前先支持 PIPL 工单可用的 happy path，后续 phase 补防滥用。
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteCitizenByPhone } from "@/lib/citizens";
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
  const deleted = await deleteCitizenByPhone(phone);

  // 删除前后状态都记审计 (PIPL 合规留痕)
  await logAudit({
    actor: `citizen:${phoneHash}`,
    action: deleted ? "pipl.delete.success" : "pipl.delete.notfound",
    targetType: "citizen",
    // 已删除，targetId 不重要；用 phoneHash 间接关联
    targetId: phoneHash,
    request: req,
  });

  if (!deleted) {
    return NextResponse.json({ error: "未找到对应市民档案" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
