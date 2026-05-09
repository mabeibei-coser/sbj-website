/**
 * LLM eval suite (Phase 2 / QA-11)
 *
 * 50 题 golden Q&A，验证：
 *   - accuracy ≥ 80%（expectedKeywords 全部命中）
 *   - citationRate ≥ 80%（expectedSourceSlug 命中 result.citations 之一）
 *
 * 模式（D-19）：
 *   - 默认 mock：getMockResponse(caller, hash) → 回归测试；CI 默认；不需要真 LLM key
 *   - REAL_LLM=1：调 lib/qa/answer.ts 的 answerQuestion 端到端测；
 *     需要 DATABASE_URL + 真 LLM key + 已 seed 的 WikiPage 数据
 *
 * 跑法：
 *   - npm run llm-eval        （mock）
 *   - npm run llm-eval:real   （REAL_LLM=1，跑真 LLM）
 */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { hashPrompt } from "../../lib/hash";
import { getMockResponse } from "../../lib/mocks/llm-mocks";

const REAL_LLM = process.env.REAL_LLM === "1";
const ACCURACY_THRESHOLD = 0.8;
const CITATION_THRESHOLD = 0.8;
const GOLDEN_PATH = path.join(__dirname, "golden-questions.json");

export interface GoldenItem {
  id: string;
  kbType: "policy" | "biz";
  question: string;
  expectedKeywords: string[];
  expectedSourceSlug?: string;
  expectedCitationDomains?: string[]; // 兼容 Phase 1
  expectedStatus: "hit" | "partial" | "miss";
  category?: string;
}

interface EvalResult {
  id: string;
  category?: string;
  kbType: string;
  status: string;
  passKeywords: boolean;
  passCitations: boolean;
  missingKeywords: string[];
  actualCitations: string[];
  raw: string;
  skipped?: boolean;
  skipReason?: string;
}

export async function loadGolden(): Promise<GoldenItem[]> {
  const raw = await readFile(GOLDEN_PATH, "utf8");
  return JSON.parse(raw) as GoldenItem[];
}

export function hasUserTodo(item: GoldenItem): boolean {
  return (
    item.question === "<USER TODO>" ||
    item.expectedSourceSlug === "<USER TODO>" ||
    (item.expectedKeywords?.length === 0 && item.category === "user_own")
  );
}

export function checkKeywords(
  text: string,
  expected: string[]
): { pass: boolean; missing: string[] } {
  const missing = expected.filter((k) => !text.includes(k));
  return { pass: missing.length === 0, missing };
}

export function checkCitations(citations: string[], item: GoldenItem): boolean {
  // 1. 优先 expectedSourceSlug：检查 citations 中是否有任意一项含此 slug
  if (item.expectedSourceSlug) {
    return citations.some((c) => c.includes(item.expectedSourceSlug as string));
  }
  // 2. 兼容 Phase 1 expectedCitationDomains：任意 domain 命中即过
  if (item.expectedCitationDomains && item.expectedCitationDomains.length > 0) {
    return item.expectedCitationDomains.some((d) => citations.some((c) => c.includes(d)));
  }
  // 3. expectedStatus=miss 时不要求 citation 命中（miss 默认无 citation）
  return item.expectedStatus === "miss";
}

async function runOneMock(item: GoldenItem): Promise<EvalResult> {
  const caller = `qa.eval.${item.id}`;
  const dummySystem = "you are a policy QA helper"; // mock 用 hash 路由，内容不影响
  const dummyUser = item.question;
  const promptHash = hashPrompt(dummySystem, dummyUser);
  const mock = getMockResponse(caller, promptHash);

  if (!mock) {
    return {
      id: item.id,
      category: item.category,
      kbType: item.kbType,
      status: "skipped",
      passKeywords: false,
      passCitations: false,
      missingKeywords: [],
      actualCitations: [],
      raw: "",
      skipped: true,
      skipReason: `no mock fixture (caller=${caller})`,
    };
  }

  const raw = mock.content;
  // mock content 可能是 plain text 或 JSON；尝试 parse
  let answer = raw;
  let citations: string[] = [];
  try {
    const parsed = JSON.parse(raw) as { answer?: string; citations?: string[] };
    if (parsed.answer) answer = parsed.answer;
    if (parsed.citations) citations = parsed.citations;
  } catch {
    // 非 JSON, 用整 raw 当 answer，citations 留空
  }

  const kw = checkKeywords(answer, item.expectedKeywords);
  const passCt = checkCitations(citations, item);

  return {
    id: item.id,
    category: item.category,
    kbType: item.kbType,
    status: "ok",
    passKeywords: kw.pass,
    passCitations: passCt,
    missingKeywords: kw.missing,
    actualCitations: citations,
    raw,
  };
}

async function runOneReal(item: GoldenItem): Promise<EvalResult> {
  // 动态 import 避免 mock 模式也加载 server-only 模块
  const { answerQuestion } = await import("../../lib/qa/answer");
  const fakeReq = {
    headers: { get: () => null },
    nextUrl: { searchParams: new URLSearchParams() },
  } as unknown as import("next/server").NextRequest;

  let result: { status: string; answer: string; citations: string[] };
  try {
    result = await answerQuestion({ question: item.question, kbType: item.kbType }, fakeReq);
  } catch (err) {
    return {
      id: item.id,
      category: item.category,
      kbType: item.kbType,
      status: "error",
      passKeywords: false,
      passCitations: false,
      missingKeywords: item.expectedKeywords,
      actualCitations: [],
      raw: err instanceof Error ? err.message : String(err),
    };
  }

  const kw = checkKeywords(result.answer, item.expectedKeywords);
  const passCt = checkCitations(result.citations, item);

  // expectedStatus 校验：实际 status 必须等于期望
  const statusMatch = result.status === item.expectedStatus;

  return {
    id: item.id,
    category: item.category,
    kbType: item.kbType,
    status: result.status,
    passKeywords: kw.pass && statusMatch,
    passCitations: passCt,
    missingKeywords: kw.missing,
    actualCitations: result.citations,
    raw: result.answer,
  };
}

async function runEval(): Promise<EvalResult[]> {
  const golden = await loadGolden();
  const results: EvalResult[] = [];
  for (const item of golden) {
    if (hasUserTodo(item)) {
      results.push({
        id: item.id,
        category: item.category,
        kbType: item.kbType,
        status: "skipped",
        passKeywords: false,
        passCitations: false,
        missingKeywords: [],
        actualCitations: [],
        raw: "",
        skipped: true,
        skipReason: "USER TODO not filled",
      });
      continue;
    }
    const r = REAL_LLM ? await runOneReal(item) : await runOneMock(item);
    results.push(r);
  }
  return results;
}

async function main(): Promise<void> {
  const results = await runEval();
  const total = results.length;
  const counted = results.filter((r) => !r.skipped);
  const totalCounted = counted.length;
  const passKw = counted.filter((r) => r.passKeywords).length;
  const passCt = counted.filter((r) => r.passCitations).length;
  const skipped = results.filter((r) => r.skipped).length;

  const accuracy = totalCounted === 0 ? 0 : passKw / totalCounted;
  const citationRate = totalCounted === 0 ? 0 : passCt / totalCounted;

  const report = {
    runAt: new Date().toISOString(),
    mode: REAL_LLM ? "real" : "mock",
    total,
    totalCounted,
    skipped,
    passKeywords: passKw,
    passCitations: passCt,
    accuracy: Number(accuracy.toFixed(3)),
    citationRate: Number(citationRate.toFixed(3)),
    thresholds: { accuracy: ACCURACY_THRESHOLD, citation: CITATION_THRESHOLD },
    results,
  };

  const outDir = path.join(__dirname, "results");
  await mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `${Date.now()}.json`);
  await writeFile(file, JSON.stringify(report, null, 2), "utf8");

  console.log("--- LLM eval report ---");
  console.log(`Mode: ${REAL_LLM ? "real" : "mock"}`);
  console.log(`Total: ${total} (counted: ${totalCounted}, skipped: ${skipped})`);
  console.log(
    `Accuracy (keywords): ${(accuracy * 100).toFixed(1)}% (threshold ${(ACCURACY_THRESHOLD * 100).toFixed(0)}%)`
  );
  console.log(
    `Citation pass rate:  ${(citationRate * 100).toFixed(1)}% (threshold ${(CITATION_THRESHOLD * 100).toFixed(0)}%)`
  );
  console.log(`Saved: ${file}`);

  // 打印失败用例详情
  const failed = counted.filter((r) => !r.passKeywords || !r.passCitations);
  if (failed.length > 0) {
    console.log("\n--- Failed cases ---");
    for (const f of failed) {
      console.log(`[${f.id}] (${f.category ?? "?"}, ${f.kbType}, status=${f.status})`);
      if (!f.passKeywords)
        console.log(`  missing keywords: ${JSON.stringify(f.missingKeywords)}`);
      if (!f.passCitations)
        console.log(`  citation failed (got: ${JSON.stringify(f.actualCitations)})`);
      console.log(`  raw: ${f.raw.slice(0, 200)}...`);
    }
  }

  // 打印 skipped
  if (skipped > 0) {
    console.warn(`\n[eval] ${skipped} items skipped (USER TODO 占位题或 mock fixture 缺失)`);
  }

  // 阈值卡死（D-19）
  if (accuracy < ACCURACY_THRESHOLD || citationRate < CITATION_THRESHOLD) {
    console.error(
      `\n FAILED — 准确率 ${(accuracy * 100).toFixed(1)}% 或出处 ${(citationRate * 100).toFixed(1)}% 低于阈值 ${(ACCURACY_THRESHOLD * 100).toFixed(0)}%`
    );
    process.exit(1);
  }

  console.log("\n PASSED");
}

main().catch((err) => {
  console.error("[eval] failed:", err);
  process.exit(1);
});
