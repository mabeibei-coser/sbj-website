/**
 * LLM eval suite skeleton (T11 / INF-12)
 *
 * Phase 1 仅搭框架 + 1 个 sample。Phase 2 政策问答要做到:
 *   - 50 题 golden Q&A (来自甲方政策文档抽题 + HR 经验题)
 *   - 准确率 ≥ 80% (语义相似 / 关键词覆盖)
 *   - 出处校验通过率 ≥ 80% (返回的引用链接全部命中白名单 regex)
 *
 * 当前 (Phase 1):
 *   - 1 道 sample 题验证 pipeline 跑得通
 *   - 不调真 API (走 lib/mocks/llm-mocks.ts) ，dry-run mode
 *   - 输出 JSON 报告: tests/llm-eval/results/<timestamp>.json
 *
 * 跑法: npm run test:llm-eval
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { hashPrompt } from "../../lib/hash";
import { getMockResponse } from "../../lib/mocks/llm-mocks";

interface GoldenItem {
  id: string;
  /** 业务面 caller (路由到对应 mock fixture) */
  caller: string;
  systemPrompt: string;
  userPrompt: string;
  /** 期望关键词，全部出现视作通过 */
  expectedKeywords: string[];
  /** 期望引用域名 (回链白名单)，至少命中一条视作通过 */
  expectedCitationDomains?: string[];
}

interface EvalResult {
  id: string;
  caller: string;
  passKeywords: boolean;
  passCitations: boolean;
  raw: string;
  missingKeywords: string[];
}

const GOLDEN: GoldenItem[] = [
  {
    id: "qa-sample-1",
    caller: "qa.answer",
    systemPrompt: "你是黄浦区社保政策助理，回答必须基于知识库内容。",
    userPrompt: "失业了怎么办失业登记？",
    expectedKeywords: ["黄浦区社保局", "中山南一路 555 号"],
    expectedCitationDomains: ["example.gov.cn"],
  },
];

async function runEval(): Promise<EvalResult[]> {
  const results: EvalResult[] = [];
  for (const item of GOLDEN) {
    const promptHashValue = hashPrompt(item.systemPrompt, item.userPrompt);
    const mock = getMockResponse(item.caller, promptHashValue);
    if (!mock) {
      console.warn(`[eval] ${item.id}: 无 mock fixture (caller=${item.caller})，skip`);
      continue;
    }
    const raw = mock.content;
    const missingKeywords = item.expectedKeywords.filter((k) => !raw.includes(k));
    const passKeywords = missingKeywords.length === 0;
    let passCitations = true;
    if (item.expectedCitationDomains) {
      passCitations = item.expectedCitationDomains.some((d) => raw.includes(d));
    }
    results.push({
      id: item.id,
      caller: item.caller,
      passKeywords,
      passCitations,
      raw,
      missingKeywords,
    });
  }
  return results;
}

async function main(): Promise<void> {
  const results = await runEval();
  const total = results.length;
  const passKw = results.filter((r) => r.passKeywords).length;
  const passCt = results.filter((r) => r.passCitations).length;
  const accuracy = total === 0 ? 0 : passKw / total;
  const citationRate = total === 0 ? 0 : passCt / total;

  const report = {
    runAt: new Date().toISOString(),
    total,
    passKeywords: passKw,
    passCitations: passCt,
    accuracy: Number(accuracy.toFixed(3)),
    citationRate: Number(citationRate.toFixed(3)),
    results,
  };

  const outDir = path.join(__dirname, "results");
  await mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `${Date.now()}.json`);
  await writeFile(file, JSON.stringify(report, null, 2), "utf8");

  console.log("--- LLM eval report ---");
  console.log(`Total: ${total}`);
  console.log(`Accuracy (keywords): ${(accuracy * 100).toFixed(1)}%`);
  console.log(`Citation pass rate:  ${(citationRate * 100).toFixed(1)}%`);
  console.log(`Saved: ${file}`);

  // Phase 1 没有 ≥80% 阈值；Phase 2 的版本会在低于阈值时 process.exit(1)
  if (total === 0) {
    console.warn("[eval] 0 题跑通，请检查 lib/mocks/llm-mocks.ts 的 fixture 配置");
  }
}

main().catch((err) => {
  console.error("[eval] failed:", err);
  process.exit(1);
});
