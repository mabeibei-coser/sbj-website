import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callLlm } from "@/lib/llm-client";

const PostSchema = z.object({
  question: z.string().min(2).max(500),
  answer: z.string().min(1).max(2000),
  kbType: z.enum(["policy", "biz"]),
});

const SYSTEM_PROMPT = `你是上海黄浦区就业创业政策助理。
根据用户刚才的问题和系统回答，生成3个相关的后续问题，帮助用户更深入了解。

要求：
- 每个问题简洁，不超过25字
- 紧扣黄浦区就业/创业政策主题
- 问题之间互不重复，覆盖不同角度
- 只输出 JSON，格式：{"questions":["问题1","问题2","问题3"]}`;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ questions: [] }, { status: 400 });
  }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ questions: [] }, { status: 400 });
  }

  const { question, answer, kbType } = parsed.data;
  const label = kbType === "policy" ? "就业" : "创业";
  const answerSnippet = answer.slice(0, 400);

  try {
    const result = await callLlm<{ questions: string[] }>({
      caller: "qa.follow-up",
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `知识库类型：${label}\n用户提问：${question}\n系统回答（节选）：${answerSnippet}`,
      jsonMode: true,
      temperature: 0.7,
      maxTokens: 200,
      parser: (raw) => {
        const obj = JSON.parse(raw) as { questions?: unknown };
        const qs = Array.isArray(obj.questions) ? obj.questions : [];
        return {
          questions: qs
            .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
            .slice(0, 3),
        };
      },
      validator: (raw) => {
        try {
          const obj = JSON.parse(raw) as { questions?: unknown };
          if (!Array.isArray(obj.questions)) return "questions 字段不是数组";
          return null;
        } catch {
          return "JSON 解析失败";
        }
      },
    });
    return NextResponse.json({ questions: result.data.questions });
  } catch (err) {
    console.error("[api/qa/follow-up] LLM 调用失败:", err instanceof Error ? err.message : err);
    return NextResponse.json({ questions: [] });
  }
}
