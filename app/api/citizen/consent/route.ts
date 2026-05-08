/**
 * PIPL 同意记录 API (INF-07)
 *
 * POST /api/citizen/consent
 *   { phone, consentType, granted, version }
 *   → 写 consent_records (citizen 不存在则创建空档)
 *
 * GET /api/citizen/consent?phone=<phone>
 *   → 返回该 phone 的同意状态 (按 consentType 取最新一条)
 *
 * 已知限制 (Phase 1 stub):
 * - phone 是可信输入: 没有 SMS 验证，谁拿到 phone 谁能写。Phase 2/3 加验证。
 * - phone 通过 phone_hash 索引；明文不在请求路径里出现 (除了 request body)。
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findCitizenByPhone, findOrCreateCitizenByPhone } from "@/lib/citizens";
import { prisma } from "@/lib/db";
import { hashField } from "@/lib/encryption";
import { logConsent } from "@/lib/audit";

const PostSchema = z.object({
  phone: z.string().regex(/^\d{11}$/, "手机号格式错误 (期望 11 位数字)"),
  consentType: z.enum(["qa", "career", "biz", "cookie", "privacy_policy"]),
  granted: z.boolean(),
  version: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 }
    );
  }
  const { phone, consentType, granted, version } = parsed.data;

  // 找或建市民 (Phase 1 没 SMS 验证，按手机号建档)
  const citizen = await findOrCreateCitizenByPhone({ phone });

  await logConsent({
    citizenId: citizen.id,
    citizenPhoneHash: hashField(phone),
    consentType,
    granted,
    version,
    request: req,
  });

  return NextResponse.json({ ok: true });
}

const GetSchema = z.object({
  phone: z.string().regex(/^\d{11}$/),
});

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  const parsed = GetSchema.safeParse({ phone });
  if (!parsed.success) {
    return NextResponse.json({ error: "phone 参数缺失或格式错误" }, { status: 400 });
  }
  const citizen = await findCitizenByPhone(parsed.data.phone);
  if (!citizen) {
    return NextResponse.json({ consents: [] });
  }
  // 按 consentType 取最新一条 (granted/revoked 演化路径)
  const latest = await prisma.consentRecord.findMany({
    where: { citizenId: citizen.id },
    orderBy: { createdAt: "desc" },
  });
  // 简单 dedupe by consentType, 取首条 (即最新)
  const seen = new Set<string>();
  const consents: Array<{ consentType: string; granted: boolean; version: string; createdAt: string }> = [];
  for (const c of latest) {
    if (seen.has(c.consentType)) continue;
    seen.add(c.consentType);
    consents.push({
      consentType: c.consentType,
      granted: c.granted,
      version: c.version,
      createdAt: c.createdAt.toISOString(),
    });
  }
  return NextResponse.json({ consents });
}
