/**
 * Smoke test: 验证 DeepSeek API key + base_url + model 可联通。
 * 跑一次最简 chat，看返回 + 计 token。不依赖 sources/。
 *
 * Usage: npx tsx scripts/smoke-test.ts
 */

import '../lib/env.js';
import { chat, DEEPSEEK_MODEL } from '../lib/deepseek-client.js';

main().catch((err) => {
  console.error('[smoke] 失败：', err.message);
  if (err.cause) console.error('cause:', err.cause);
  process.exit(1);
});

async function main() {
  console.log(`[smoke] model: ${DEEPSEEK_MODEL}`);
  console.log(`[smoke] base_url: ${process.env.DEEPSEEK_BASE_URL}`);
  console.log(`[smoke] sending hello chat...`);

  const start = Date.now();
  const { content, usage } = await chat({
    system: '你是一个简洁的助手。',
    user: '请用一句中文回答：什么是失业保险？',
    temperature: 0.1,
    max_tokens: 200,
  });
  const elapsed = Date.now() - start;

  console.log(`[smoke] OK (${elapsed}ms, tokens: ${usage?.total_tokens})`);
  console.log(`[smoke] response: ${content}`);
}
