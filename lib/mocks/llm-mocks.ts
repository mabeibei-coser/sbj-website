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

  // ── Phase 2 LLM eval fixtures (QA-11) ─────────────────────────────────────
  // Category: hot（5 题）

  "qa.eval.qa-policy-hot-1": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 失业人员每月领取的失业保险金标准，按本市月最低工资标准的80%发放。具体金额以社保局公布为准。",
          citations: ["/wiki/policy/unemployment-insurance"],
        }),
        tokensIn: 120,
        tokensOut: 60,
      },
    },
  ],
  "qa.eval.qa-policy-hot-2": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 高校毕业生离校未就业可申请灵活就业社保补贴，需在离校后一定期限内完成失业登记并从事灵活就业。",
          citations: ["/wiki/policy/youth-employment"],
        }),
        tokensIn: 130,
        tokensOut: 65,
      },
    },
  ],
  "qa.eval.qa-policy-hot-3": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 黄浦区共有16家经认定的创业孵化基地，分布于全区各街道，欢迎创业团队申请入驻黄浦孵化基地。",
          citations: ["/wiki/policy/incubator"],
        }),
        tokensIn: 110,
        tokensOut: 55,
      },
    },
  ],
  "qa.eval.qa-policy-hot-4": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 黄浦创卡福利包含：6个月零成本工位、最高4万元一次性创业补贴、创业担保贷款、落地补贴等。",
          citations: ["/wiki/policy/huangpu-card"],
        }),
        tokensIn: 115,
        tokensOut: 58,
      },
    },
  ],
  "qa.eval.qa-policy-hot-5": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 求职创业补贴申请条件：本市户籍或在本市参保的离校未就业高校毕业生，完成失业登记并求职。",
          citations: ["/wiki/policy/youth-employment"],
        }),
        tokensIn: 125,
        tokensOut: 62,
      },
    },
  ],

  // Category: detail（10 题）

  "qa.eval.qa-policy-detail-1": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 黄浦创卡场地扶持：6个月零成本办公工位，位于市中心黄金地段孵化基地。",
          citations: ["/wiki/policy/huangpu-card"],
        }),
        tokensIn: 100,
        tokensOut: 50,
      },
    },
  ],
  "qa.eval.qa-policy-detail-2": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 持黄浦创卡入驻孵化基地，在本区创业并带动就业的，符合条件可申请最高3万元孵化补贴。",
          citations: ["/wiki/policy/huangpu-card"],
        }),
        tokensIn: 105,
        tokensOut: 52,
      },
    },
  ],
  "qa.eval.qa-policy-detail-3": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 自获得创卡18个月内在黄浦区成功创办创业组织并带动就业的，给予最高4万元一次性创业补贴。",
          citations: ["/wiki/policy/huangpu-card"],
        }),
        tokensIn: 110,
        tokensOut: 55,
      },
    },
  ],
  "qa.eval.qa-policy-detail-4": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 黄浦创卡申请对象：全日制高校在读或毕业五年内的高校毕业生创业者，有意向在黄浦区注册创业。",
          citations: ["/wiki/policy/huangpu-card"],
        }),
        tokensIn: 115,
        tokensOut: 57,
      },
    },
  ],
  "qa.eval.qa-policy-detail-5": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 在黄浦区首次创业并带动就业，可申请1万元的一次性开办费补贴。",
          citations: ["/wiki/policy/huangpu-card"],
        }),
        tokensIn: 100,
        tokensOut: 50,
      },
    },
  ],
  "qa.eval.qa-policy-detail-6": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 在黄浦区注册3年内可获最高5万元/年创业带动就业补贴，最多补贴3年。",
          citations: ["/wiki/policy/huangpu-card"],
        }),
        tokensIn: 105,
        tokensOut: 52,
      },
    },
  ],
  "qa.eval.qa-policy-detail-7": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 黄浦区现有16家经区人社部门认定的创业孵化基地，总孵化面积19.3万平方米。",
          citations: ["/wiki/policy/incubator"],
        }),
        tokensIn: 110,
        tokensOut: 55,
      },
    },
  ],
  "qa.eval.qa-policy-detail-8": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 进驻黄浦创业孵化基地可申请工位补贴，最高申请时长6个月，补贴金额最高不超过3万元。",
          citations: ["/wiki/policy/incubator"],
        }),
        tokensIn: 108,
        tokensOut: 54,
      },
    },
  ],
  "qa.eval.qa-policy-detail-9": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 创业担保贷款可通过一网通办进入上海市人力资源和社会保障自助经办系统申请办理。",
          citations: ["/wiki/policy/startup-loan"],
        }),
        tokensIn: 110,
        tokensOut: 55,
      },
    },
  ],
  "qa.eval.qa-policy-detail-10": [
    {
      response: {
        content: JSON.stringify({
          status: "hit",
          answer: "[mock] 合伙创业重点就业群体包括：退役军人、35岁及以下青年大学生，以及城镇登记失业人员、就业困难人员等。",
          citations: ["/wiki/policy/startup-loan"],
        }),
        tokensIn: 115,
        tokensOut: 58,
      },
    },
  ],

  // Category: fabrication（5 题）— 返回 miss + 空 citations

  "qa.eval.qa-policy-fab-1": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，未能在知识库中找到相关政策内容，建议拨打021-63137613或前往黄浦区就业促进中心咨询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],
  "qa.eval.qa-policy-fab-2": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，未能在知识库中找到相关政策内容，建议拨打官方热线或前往就业促进中心咨询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],
  "qa.eval.qa-policy-fab-3": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，未能在知识库中找到相关政策内容，建议拨打官方热线或前往就业促进中心咨询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],
  "qa.eval.qa-policy-fab-4": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，未能在知识库中找到相关政策内容，建议拨打官方热线或前往就业促进中心咨询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],
  "qa.eval.qa-policy-fab-5": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，未能在知识库中找到相关政策内容，建议拨打官方热线或前往就业促进中心咨询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],

  // Category: injection（5 题）— 返回 miss + 空 citations

  "qa.eval.qa-policy-inj-1": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，未能在知识库中找到相关政策内容，建议拨打官方热线或前往就业促进中心咨询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],
  "qa.eval.qa-policy-inj-2": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，未能在知识库中找到相关政策内容，建议拨打官方热线或前往就业促进中心咨询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],
  "qa.eval.qa-policy-inj-3": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，未能在知识库中找到相关政策内容，建议拨打官方热线或前往就业促进中心咨询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],
  "qa.eval.qa-policy-inj-4": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，未能在知识库中找到相关政策内容，建议拨打官方热线或前往就业促进中心咨询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],
  "qa.eval.qa-policy-inj-5": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，未能在知识库中找到相关政策内容，建议拨打官方热线或前往就业促进中心咨询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],

  // Category: irrelevant（5 题）— 返回 miss + 空 citations

  "qa.eval.qa-policy-unrel-1": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，该问题不在就业创业政策服务范围内，建议通过其他渠道查询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],
  "qa.eval.qa-policy-unrel-2": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，该问题不在就业创业政策服务范围内，建议通过其他渠道查询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],
  "qa.eval.qa-policy-unrel-3": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，该问题不在就业创业政策服务范围内，建议通过其他渠道查询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],
  "qa.eval.qa-policy-unrel-4": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，该问题不在就业创业政策服务范围内，建议通过其他渠道查询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],
  "qa.eval.qa-policy-unrel-5": [
    {
      response: {
        content: JSON.stringify({
          status: "miss",
          answer: "抱歉，该问题不在就业创业政策服务范围内，建议通过其他渠道查询。",
          citations: [],
        }),
        tokensIn: 80,
        tokensOut: 40,
      },
    },
  ],
  // USER_OWN 题（qa-policy-user-001~020）不加 fixture — run.ts 会 skip 这些占位题
};
