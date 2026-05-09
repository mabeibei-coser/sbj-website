import "server-only";
import type { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { callLlm } from "@/lib/llm-client";
import { logAudit } from "@/lib/audit";
import { retrieveTopK, type RetrievalResult } from "@/lib/qa/retrieve";
import { QA_CONFIG, FALLBACK_PHRASE_MISS, FALLBACK_PHRASE_PARTIAL_PREFIX } from "@/lib/qa/config";
import { QA_DISCLAIMER } from "@/lib/qa/disclaimer";
import {
  detectPromptInjection,
  wrapQuestionXml,
  truncateAnswerToLimit,
} from "@/lib/qa/sanitizer";
import { filterCitations } from "@/lib/qa/citations";

export interface AnswerInput {
  question: string;
  kbType: "policy" | "biz";
  phoneHash?: string;
  ip?: string;
}

export interface AnswerOutput {
  status: "hit" | "partial" | "miss";
  answer: string;
  citations: string[];
}

interface LlmAnswerJson {
  answer: string;
  citations: string[];
  status: "hit" | "partial";
}

function missResponse(): AnswerOutput {
  return { status: "miss", answer: FALLBACK_PHRASE_MISS, citations: [] };
}

let cachedSystemPrompt: string | null = null;
let cachedUserTemplate: string | null = null;

async function loadPrompt(file: string): Promise<string> {
  return readFile(path.join(process.cwd(), "prompts", file), "utf8");
}

async function getSystemPrompt(): Promise<string> {
  if (!cachedSystemPrompt) cachedSystemPrompt = await loadPrompt("qa-answer-system.md");
  return cachedSystemPrompt;
}
async function getUserTemplate(): Promise<string> {
  if (!cachedUserTemplate) cachedUserTemplate = await loadPrompt("qa-answer-user-template.md");
  return cachedUserTemplate;
}

function renderUserMessage(
  template: string,
  vars: { kbType: string; retrievedBlocks: string; userQuestionXml: string }
): string {
  return template
    .replace("{{kbType}}", vars.kbType)
    .replace("{{retrievedBlocks}}", vars.retrievedBlocks)
    .replace("{{userQuestionXml}}", vars.userQuestionXml);
}

function buildRetrievedBlocks(hits: RetrievalResult[], kbType: "policy" | "biz"): string {
  return hits
    .map((h, i) => {
      const slugCitation = `/wiki/${kbType}/${h.page.slug}`;
      const sourceLine = h.page.sourceUrl ? `\n源链接: ${h.page.sourceUrl}` : "";
      return `[${i + 1}] slug: ${slugCitation}${sourceLine}\n标题: ${h.page.title}\n内容:\n${h.page.content}`;
    })
    .join("\n\n---\n\n");
}

/**
 * 统一的 LLM 调用辅助 — 不同 caller 走不同遥测 bucket（D-25 + 运营友好）。
 * 注意：第一次和重试都不传 validator —— 校验由 answer.ts 显式做（见 answerQuestion 流程）。
 * 这样 LlmCallLog.caller 会准确反映"这是哪一次调用"，运营按 caller 检索能直接出对应记录。
 */
async function callQaAnswerLlm(
  caller: "qa.answer" | "qa.answer.retry",
  systemPrompt: string,
  userPrompt: string
) {
  return callLlm<LlmAnswerJson>({
    caller,
    systemPrompt,
    userPrompt,
    jsonMode: true,
    parser: (raw: string) => JSON.parse(raw) as LlmAnswerJson,
    maxTokens: 1500,
  });
}

export async function answerQuestion(input: AnswerInput, req: NextRequest): Promise<AnswerOutput> {
  try {
    // ---- 三层防护 第 1 层: D-13 输入护栏 ----
    const inj = detectPromptInjection(input.question);
    if (inj.triggered) {
      await logAudit({
        actor: input.phoneHash ? `citizen:${input.phoneHash}` : `citizen:ip:${input.ip ?? "unknown"}`,
        action: "qa.answer.injection_blocked",
        request: req,
      });
      return missResponse();
    }

    // ---- 三层防护 第 2 层: D-08/D-09 检索 + 阈值 ----
    const hits = await retrieveTopK(input.question, input.kbType);
    if (hits.length === 0 || hits[0].score <= QA_CONFIG.RETRIEVAL_THRESHOLD) {
      return missResponse();
    }

    // ---- 准备 prompt ----
    const system = await getSystemPrompt();
    const userTpl = await getUserTemplate();
    const baseUserPrompt = renderUserMessage(userTpl, {
      kbType: input.kbType,
      retrievedBlocks: buildRetrievedBlocks(hits, input.kbType),
      userQuestionXml: wrapQuestionXml(input.question),
    });

    // ---- 第一次 callLlm: caller=qa.answer ----
    let result = await callQaAnswerLlm("qa.answer", system, baseUserPrompt);
    let llmJson = result.data;

    // ---- D-12 白名单检验（在 answer.ts 显式做，不依赖 lib/llm-client.ts validator path） ----
    const firstFilter = filterCitations(llmJson.citations ?? []);

    if (firstFilter.dropped.length > 0) {
      // ---- 触发显式第二次 callLlm: caller=qa.answer.retry（运营遥测：SELECT WHERE caller='qa.answer.retry'） ----
      const retryUserPrompt = `${baseUserPrompt}

[retry context]
上一次回答中包含非白名单引用：${JSON.stringify(firstFilter.dropped)}
本次必须只用白名单内引用（gov.cn / rsj.sh.gov.cn / huangpu.gov.cn / zzjb.rsj.sh.gov.cn / /wiki/policy|biz/<slug>）。
如果 retrieved_wiki 不足以提供合规引用，输出 \`status: "partial"\` 且 citations=[]。`;

      const retryResult = await callQaAnswerLlm("qa.answer.retry", system, retryUserPrompt);
      result = retryResult;
      llmJson = retryResult.data;
    }

    // ---- 第二次过滤（兜底；retry 后仍可能有非白名单） ----
    const { kept } = filterCitations(llmJson.citations ?? []);
    let answer = truncateAnswerToLimit(llmJson.answer, QA_CONFIG.MAX_ANSWER_CHARS);

    let status: "hit" | "partial";
    if (kept.length === 0) {
      status = "partial";
      answer = `${FALLBACK_PHRASE_PARTIAL_PREFIX}\n\n${answer}`;
    } else {
      status = "hit";
    }

    answer = `${answer}\n\n${QA_DISCLAIMER}`;

    // ---- D-26 audit ----
    await logAudit({
      actor: input.phoneHash ? `citizen:${input.phoneHash}` : `citizen:ip:${input.ip ?? "unknown"}`,
      action: "qa.answer",
      targetType: "wiki_page",
      targetId: hits[0].page.id,
      after: {
        status,
        citationCount: kept.length,
        vendor: result.vendor,
        retried: firstFilter.dropped.length > 0,  // 运营遥测：是否走了 retry
      },
      request: req,
    });

    return { status, answer, citations: kept };
  } catch (err) {
    // ---- D-29 兜底 ----
    console.error("[qa.answer] error:", err);
    try {
      await logAudit({
        actor: input.phoneHash ? `citizen:${input.phoneHash}` : `citizen:ip:${input.ip ?? "unknown"}`,
        action: "qa.answer.error",
        request: req,
      });
    } catch { /* audit 失败 silent */ }
    return missResponse();
  }
}

/** 测试导出（让 answer.test.ts 能 reset 缓存） */
export function __resetPromptCacheForTest() {
  cachedSystemPrompt = null;
  cachedUserTemplate = null;
}
