/**
 * 豆包 (火山引擎方舟) vendor adapter — fallback 1
 * OpenAI 兼容协议: https://www.volcengine.com/docs/82379/1330310
 *
 * 模型 ID 走"endpoint id"形式 (e.g. ep-2025...)，由方舟控制台分配。
 * 调用时 model 字段填 endpoint id 而非"doubao-pro-32k"。
 */

import OpenAI from "openai";

/**
 * 单价 (元/1M token，doubao-1.5-pro-32k 估值)
 * 入：0.8 元/M  出：2 元/M  (随等级调整，监控对账校准)
 */
export const DOUBAO_INPUT_CENTS_PER_1K = 0.08;
export const DOUBAO_OUTPUT_CENTS_PER_1K = 0.2;

let cachedClient: OpenAI | null = null;
let cachedModel: string | null = null;

export function getDoubaoClient(): { client: OpenAI; model: string } | null {
  const apiKey = process.env.DOUBAO_API_KEY;
  const model = process.env.DOUBAO_MODEL;
  if (!apiKey || !model) return null;
  if (cachedClient && cachedModel) {
    return { client: cachedClient, model: cachedModel };
  }
  const baseURL = process.env.DOUBAO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
  cachedClient = new OpenAI({ apiKey, baseURL });
  cachedModel = model;
  return { client: cachedClient, model };
}

export function estimateDoubaoCost(tokensIn: number, tokensOut: number): number {
  const cents = (tokensIn / 1000) * DOUBAO_INPUT_CENTS_PER_1K + (tokensOut / 1000) * DOUBAO_OUTPUT_CENTS_PER_1K;
  return Math.round(cents);
}

export function __resetDoubaoClientForTest(): void {
  cachedClient = null;
  cachedModel = null;
}
