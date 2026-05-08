#!/usr/bin/env tsx
/**
 * Smoke test: 验证 callLlm 三档 fallback 通路（DeepSeek → 豆包 → 讯飞）。
 * 跑一次最简 chat，看返回 + 计 token + vendor。不依赖 sources/。
 *
 * Usage: npm run wiki:smoke
 */
// 优先加载 .env.local（与 Next.js 行为一致），再 fallback 到 .env
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });
loadDotenv({ path: ".env" });
import { callLlm } from "../../lib/llm-client";

main().catch((err) => {
  console.error("[smoke] 失败：", err instanceof Error ? err.message : err);
  process.exit(1);
});

async function main() {
  console.log(`[smoke] sending hello via callLlm...`);
  const start = Date.now();
  const result = await callLlm({
    caller: "qa.smoke",
    systemPrompt: "你是一个简洁的助手。",
    userPrompt: "请用一句中文回答：什么是失业保险？",
    maxTokens: 200,
    temperature: 0.1,
  });
  const elapsed = Date.now() - start;
  console.log(
    `[smoke] OK vendor=${result.vendor} model=${result.model} (${elapsed}ms, tokensIn=${result.tokensIn}, tokensOut=${result.tokensOut}, fallback=${result.isFallback})`
  );
  console.log(`[smoke] content: ${String(result.data).slice(0, 200)}`);
}
