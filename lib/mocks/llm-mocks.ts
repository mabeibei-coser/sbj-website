/**
 * LLM mock 响应 (T11 / INF-12 测试基建)
 *
 * 来源: D:\career-report\lib\mocks\report-mocks.ts (adapt)
 *
 * 用途:
 * - E2E 测试 (E2E_MOCK_MODE=true) 时，LLM 调用走这里返回，不真调 API
 * - LLM eval suite (Phase 2 才填 50 题 golden) 的 baseline 模板
 *
 * 设计:
 * - 按 caller (qa.answer / career.interview / biz.assessment) 路由 mock
 * - 同一 caller 多个 fixture 用 promptHash 取哪一条
 * - Phase 1 只放最简骨架 + 1 个示例，让 vitest/playwright 可以 import 不报错
 */

export interface MockResponse {
  /** mock 返回的 raw text (callLlm 的 data 字段) */
  content: string;
  /** 模拟 token 用量，写入 llm_call_logs */
  tokensIn: number;
  tokensOut: number;
}

/**
 * 按 caller + (可选) promptHash 查 mock。返回 null 表示无 mock，应走真实调用。
 *
 * 调用方在 E2E_MOCK_MODE=true 时优先查这里; 没命中再 fallback 真 LLM。
 * Phase 1 stub: 实际 callLlm 不读这个文件，留给 Phase 2 接 QA 时再接入。
 */
export function getMockResponse(caller: string, promptHash?: string): MockResponse | null {
  const fixtures = MOCK_FIXTURES[caller];
  if (!fixtures || fixtures.length === 0) return null;
  if (promptHash) {
    const exact = fixtures.find((f) => f.promptHash === promptHash);
    if (exact) return exact.response;
  }
  return fixtures[0].response;
}

interface Fixture {
  /** SHA256(systemPrompt+userPrompt) 取前 32 hex；undefined 视作通配 */
  promptHash?: string;
  response: MockResponse;
}

const MOCK_FIXTURES: Record<string, Fixture[]> = {
  // 示例: QA 模块的兜底 mock (Phase 2 会用更多)
  "qa.answer": [
    {
      response: {
        content: JSON.stringify({
          answer: "[mock] 您可前往黄浦区社保局 (中山南一路 555 号) 办理就业失业登记证。",
          citations: ["[mock] https://example.gov.cn/policy/1"],
          disclaimer: "本回答由 AI 生成，仅供参考；具体以现场窗口告知为准。",
        }),
        tokensIn: 100,
        tokensOut: 50,
      },
    },
  ],
  // Phase 1 smoke 测试用: 任意 caller 都能拿到 hello
  "test.smoke": [
    {
      response: {
        content: "hello from mock",
        tokensIn: 5,
        tokensOut: 5,
      },
    },
  ],
};
