/**
 * 讯飞星火 vendor adapter — fallback 2
 * OpenAI 兼容协议: https://www.xfyun.cn/doc/spark/HTTP%E8%B0%83%E7%94%A8%E6%96%87%E6%A1%A3.html
 *
 * 不同于 DeepSeek/豆包，讯飞 OpenAI 兼容入口的 model 字段填 "4.0Ultra" / "Lite" / "Pro" 等。
 */

import OpenAI from "openai";

/**
 * 单价 (元/1M token，4.0Ultra 估值)
 * 入：50 元/M  出：50 元/M (Ultra 较贵，仅作为最后 fallback)
 * Lite/Pro 更便宜但质量稍差，按业务决定 W1 之后调整
 */
export const IFLYTEK_INPUT_CENTS_PER_1K = 5;
export const IFLYTEK_OUTPUT_CENTS_PER_1K = 5;

let cachedClient: OpenAI | null = null;
let cachedModel: string | null = null;

export function getIflytekClient(): { client: OpenAI; model: string } | null {
  const apiKey = process.env.IFLYTEK_API_KEY;
  if (!apiKey) return null;
  if (cachedClient && cachedModel) {
    return { client: cachedClient, model: cachedModel };
  }
  const baseURL = process.env.IFLYTEK_BASE_URL || "https://spark-api-open.xf-yun.com/v1";
  const model = process.env.IFLYTEK_MODEL || "4.0Ultra";
  cachedClient = new OpenAI({ apiKey, baseURL });
  cachedModel = model;
  return { client: cachedClient, model };
}

export function estimateIflytekCost(tokensIn: number, tokensOut: number): number {
  const cents = (tokensIn / 1000) * IFLYTEK_INPUT_CENTS_PER_1K + (tokensOut / 1000) * IFLYTEK_OUTPUT_CENTS_PER_1K;
  return Math.round(cents);
}

export function __resetIflytekClientForTest(): void {
  cachedClient = null;
  cachedModel = null;
}
