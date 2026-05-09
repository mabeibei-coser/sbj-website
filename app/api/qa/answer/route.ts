import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashField } from "@/lib/encryption";
import { extractRequestMeta } from "@/lib/audit";
import { answerQuestion } from "@/lib/qa/answer";
import { FALLBACK_PHRASE_MISS } from "@/lib/qa/config";

const PostSchema = z.object({
  question: z.string().min(2, "问题至少 2 个字符").max(500, "问题最多 500 字符"),
  kbType: z.enum(["policy", "biz"]),
  phone: z.string().regex(/^\d{11}$/, "手机号格式错误").optional(),
  // autoplan F2: 移除 consentId 字段，统一用 phone → HMAC → citizenPhoneHash 查 ConsentRecord
});

async function checkQaConsent(phoneHash: string): Promise<boolean> {
  const latest = await prisma.consentRecord.findFirst({
    where: { citizenPhoneHash: phoneHash, consentType: "qa" },
    orderBy: { createdAt: "desc" },
  });
  return latest?.granted === true;
}

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
  const { question, kbType, phone } = parsed.data;

  // ---- D-27 Consent 校验 ----
  if (phone) {
    const phoneHash = hashField(phone);
    const granted = await checkQaConsent(phoneHash).catch(() => false);
    if (!granted) {
      return NextResponse.json(
        { status: "miss", error: "请先同意服务条款", answer: "", citations: [] },
        { status: 403 }
      );
    }
  }

  const meta = extractRequestMeta(req);
  try {
    const result = await answerQuestion(
      {
        question,
        kbType,
        phoneHash: phone ? hashField(phone) : undefined,
        ip: meta.ip ?? undefined,
      },
      req
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/qa/answer] uncaught:", err);
    return NextResponse.json({
      status: "miss",
      answer: FALLBACK_PHRASE_MISS,
      citations: [],
    });
  }
}
