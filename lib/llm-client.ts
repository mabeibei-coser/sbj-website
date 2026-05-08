/**
 * 多供应商 LLM 抽象层 (INF-03)
 *
 * 优先级链: DeepSeek 主 → 豆包 备1 → 讯飞 备2
 * 任一档成功即返回；全部失败抛**首因**异常 (DeepSeek 错误，便于排查)。
 *
 * 每次调用 (含失败、含降级) 都写 llm_call_logs (T5 logLlmCall)。
 *
 * 设计:
 * - 三家走 OpenAI 兼容协议 (统一 chat.completions.create)，差异只在 baseURL/model/cost
 * - JSON 模式可选 (jsonMode: true 时启用 response_format + JSON_ONLY_PREFIX)
 * - validator 返回 null=通过, string=失败原因 → 触发 fallback (沿用 career-report 风格)
 * - 单次硬超时 50s (career-report 经验值)，调用方可覆盖
 *
 * 不在本模块的事:
 * - prompt 工程 (business 层 caller 自己拼 prompt + 自己加约束)
 * - 缓存命中 (Phase 2 QA 可加 prompt cache，本模块不预设)
 * - JSON 修复管线 (extractJson / tryFixAndParse 在 Phase 2 用到时再迁移过来)
 *
 * 参考: D:\career-report\lib\report-shared.ts callWithFallback (MiniMax → iFlytek 二档)
 * 改造点: 三档 fallback + 自动审计写入 + DeepSeek 主 + 不强制 JSON 模式
 */

import "server-only";
import type OpenAI from "openai";
import { getDeepseekClient, estimateDeepseekCost } from "@/lib/llm-vendors/deepseek";
import { getDoubaoClient, estimateDoubaoCost } from "@/lib/llm-vendors/doubao";
import { getIflytekClient, estimateIflytekCost } from "@/lib/llm-vendors/iflytek";
import { hashPrompt, logLlmCall } from "@/lib/audit";

export type Vendor = "deepseek" | "doubao" | "iflytek";

const VENDOR_ORDER: Vendor[] = ["deepseek", "doubao", "iflytek"];
const HARD_TIMEOUT_MS = 50_000;

// JSON 模式下注入的约束前缀 (从 career-report report-shared.ts JSON_ONLY_PREFIX 抠过来)
const JSON_ONLY_PREFIX = `【输出约束 · 必须严格遵守】
1. 只输出合法 JSON 对象，第一个字符必须是 {，最后一个字符必须是 }
2. 禁止任何说明性前言（如"让我分析..." "用户要求..." "好的，我来..."）
3. 禁止 markdown 代码围栏（\`\`\`json）
4. 禁止 JSON 之外的任何文字、注释、解释

以下是章节具体要求：
`;

export interface CallLlmOpts<T = string> {
  /** system prompt (业务层自己写) */
  systemPrompt: string;
  /** user prompt */
  userPrompt: string;
  /** 业务面: "qa.answer" / "career.interview" 等，写入 llm_call_logs.caller */
  caller: string;
  /** 启用 JSON 模式: response_format=json_object + 注入 JSON_ONLY_PREFIX */
  jsonMode?: boolean;
  /** 可选: 强制起点 vendor (默认 deepseek)，主要给 monitoring/重跑用 */
  primaryVendor?: Vendor;
  /** 单次硬超时 (毫秒)，默认 50s */
  timeoutMs?: number;
  /** temperature, 默认 0.6 */
  temperature?: number;
  /** maxTokens, 默认 3000 */
  maxTokens?: number;
  /** validator: 返回 null = 通过；返回字符串 = 失败原因，触发 fallback */
  validator?: (raw: string) => string | null;
  /** 解析器: 把 raw string 转成 T (e.g. JSON.parse)。默认返回原始 string */
  parser?: (raw: string) => T;
}

export interface CallLlmResult<T> {
  /** 解析后的数据 */
  data: T;
  /** 实际成功的 vendor */
  vendor: Vendor;
  /** 模型名 */
  model: string;
  /** 输入 token */
  tokensIn: number;
  /** 输出 token */
  tokensOut: number;
  /** 是否走到 fallback (即非 primaryVendor) */
  isFallback: boolean;
}

interface VendorBundle {
  vendor: Vendor;
  client: OpenAI;
  model: string;
  estimateCost: (tokensIn: number, tokensOut: number) => number;
}

function getVendor(v: Vendor): VendorBundle | null {
  switch (v) {
    case "deepseek": {
      const r = getDeepseekClient();
      return r && { vendor: v, client: r.client, model: r.model, estimateCost: estimateDeepseekCost };
    }
    case "doubao": {
      const r = getDoubaoClient();
      return r && { vendor: v, client: r.client, model: r.model, estimateCost: estimateDoubaoCost };
    }
    case "iflytek": {
      const r = getIflytekClient();
      return r && { vendor: v, client: r.client, model: r.model, estimateCost: estimateIflytekCost };
    }
  }
}

async function callOnce<T>(
  bundle: VendorBundle,
  opts: CallLlmOpts<T>,
  isFallback: boolean,
  promptHashValue: string
): Promise<CallLlmResult<T>> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? HARD_TIMEOUT_MS);
  try {
    const systemFinal = opts.jsonMode ? JSON_ONLY_PREFIX + opts.systemPrompt : opts.systemPrompt;
    const response = await bundle.client.chat.completions.create(
      {
        model: bundle.model,
        messages: [
          { role: "system", content: systemFinal },
          { role: "user", content: opts.userPrompt },
        ],
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 3000,
        ...(opts.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      },
      { signal: controller.signal }
    );
    const raw = response.choices[0]?.message?.content ?? "";
    if (opts.validator) {
      const issue = opts.validator(raw);
      if (issue) throw new Error(`[${bundle.vendor}] 内容校验失败: ${issue}`);
    }
    const data = (opts.parser ? opts.parser(raw) : raw) as T;

    const tokensIn = response.usage?.prompt_tokens ?? 0;
    const tokensOut = response.usage?.completion_tokens ?? 0;
    const latencyMs = Date.now() - startedAt;
    await logLlmCall({
      vendor: bundle.vendor,
      model: bundle.model,
      caller: opts.caller,
      promptHash: promptHashValue,
      tokensIn,
      tokensOut,
      latencyMs,
      status: "success",
      costCents: bundle.estimateCost(tokensIn, tokensOut),
      isFallback,
    });

    return {
      data,
      vendor: bundle.vendor,
      model: bundle.model,
      tokensIn,
      tokensOut,
      isFallback,
    };
  } catch (err) {
    const isTimeout = controller.signal.aborted;
    const latencyMs = Date.now() - startedAt;
    await logLlmCall({
      vendor: bundle.vendor,
      model: bundle.model,
      caller: opts.caller,
      promptHash: promptHashValue,
      latencyMs,
      status: isTimeout ? "timeout" : "failed",
      errorMessage: err instanceof Error ? err.message : String(err),
      isFallback,
    });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 三档 fallback LLM 调用。
 *
 * @throws 全部 vendor 都不可用时抛 "无可用 LLM vendor"；任一 vendor 失败但还有备用时不抛。
 *         全链路失败时抛**首因** (primaryVendor 错误)。
 */
export async function callLlm<T = string>(opts: CallLlmOpts<T>): Promise<CallLlmResult<T>> {
  const primary = opts.primaryVendor ?? "deepseek";
  // 把 primary 排在最前面，其余按默认顺序
  const order = [primary, ...VENDOR_ORDER.filter((v) => v !== primary)];
  const promptHashValue = hashPrompt(opts.systemPrompt, opts.userPrompt);

  let primaryError: unknown = null;
  for (let i = 0; i < order.length; i++) {
    const v = order[i];
    const bundle = getVendor(v);
    if (!bundle) {
      // 该 vendor 未配 key, 尝试下一档
      continue;
    }
    const isFallback = i > 0;
    try {
      return await callOnce(bundle, opts, isFallback, promptHashValue);
    } catch (err) {
      if (i === 0) primaryError = err;
      // eslint-disable-next-line no-console
      console.warn(`[llm-client] ${v} 失败:`, err instanceof Error ? err.message : err);
      // 继续尝试下一档
    }
  }
  if (primaryError) throw primaryError;
  throw new Error("无可用 LLM vendor: 请检查 DEEPSEEK_API_KEY / DOUBAO_API_KEY / IFLYTEK_API_KEY");
}
