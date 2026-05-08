/**
 * DeepSeek 主 vendor adapter (INF-03)
 * OpenAI 兼容协议: https://api.deepseek.com (参考 https://api-docs.deepseek.com/)
 */

import OpenAI from "openai";

/**
 * 单价 (元/1M token)
 * - deepseek-chat (V3): 输入 0.27 / 输出 1.10
 * - deepseek-reasoner (R1): 输入 0.55 / 输出 2.19
 * 价格随官方调整，监控里以"分"为单位估算，每月对账校准
 *
 * https://api-docs.deepseek.com/quick_start/pricing
 */
export const DEEPSEEK_INPUT_CENTS_PER_1K = 0.027; // 0.27 元/M = 0.027 分/1K
export const DEEPSEEK_OUTPUT_CENTS_PER_1K = 0.11;

let cachedClient: OpenAI | null = null;
let cachedModel: string | null = null;

export function getDeepseekClient(): { client: OpenAI; model: string } | null {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  if (cachedClient && cachedModel) {
    return { client: cachedClient, model: cachedModel };
  }
  const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  cachedClient = new OpenAI({ apiKey, baseURL });
  cachedModel = model;
  return { client: cachedClient, model };
}

/** 估算成本，返回单位 = 分。用于 llm_call_logs.costCents */
export function estimateDeepseekCost(tokensIn: number, tokensOut: number): number {
  const cents = (tokensIn / 1000) * DEEPSEEK_INPUT_CENTS_PER_1K + (tokensOut / 1000) * DEEPSEEK_OUTPUT_CENTS_PER_1K;
  return Math.round(cents);
}

/** 测试用: 强制重新读 env */
export function __resetDeepseekClientForTest(): void {
  cachedClient = null;
  cachedModel = null;
}
