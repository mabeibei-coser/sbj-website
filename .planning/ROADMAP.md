# ROADMAP — sbj-website

> 来源：V8 plan 第七节（修订后的里程碑）+ 第七·五节（模块开发优先级分析）
> 总周期：W0-W10 ≈ 11 周（用户感知 10 周，因为 W0 等备案不算执行）
> 项目模式：Vertical MVP（每个 phase 交付端到端用户能力）

---

## 总览

```
①政策问答(W2) → ②职业诊断(W3-W4) → ③CRM(W5) → ④创业诊断(W6)
        前置 W0+W1: 备案+试跑+脚手架
        收尾 W7-W10: 联调+合规+UAT+交付
```

**8 个 phase | 60+ 个 v1 requirement 全覆盖**

| # | Phase | 周次 | Goal | Requirements | Success Criteria |
|---|-------|------|------|--------------|------------------|
| 0 | 前期准备 | W0 | ICP 备案启动 + LLM Wiki 编译方案验证 | INF-01, INF-02 | 2 |
| 1 | 脚手架 + 工程基建 | W1 | 单 Next.js 应用 + 多供应商 LLM + 审计层 + middleware + PIPL stub | INF-03~12 | 5 |
| 2 | 政策问答 | W2 | 双页签 + 3 热点 + 自由问 + LLM eval ≥ 80% | QA-01~12 | 4 |
| 3 | 职业诊断 | W3-W4 | 输入 → 量表 → AI 访谈 → 5 章报告 → 5 级标签 | CAR-01~15 | 5 |
| 4 | CRM 子系统 | W5 | 市民管理 + 服务跟踪 + 数据看板（仅工作人员后台）| CRM-01~09 | 4 |
| 5 | 创业诊断 | W6 | 4 输入 + 6 维度访谈（代码状态机）+ 3 章报告 + 雷达图 | BIZ-01~09 | 4 |
| 6 | 端到端联调 + 响应式 | W7 | 双端打通 + 手机访问 OK | FE-01~05 | 3 |
| 7 | PIPL 验收 + 安全压测 | W8 | 数据删除/导出工单 + Cookie + 安全扫描 + 备份/灾备验收 | COMP-01~08 | 4 |
| 8 | UAT + 交付 | W9-W10 | 甲方反馈调整 → 文档完整 → 转维 | - | 3 |

---

## Phase Details

### Phase 0: 前期准备
**Goal:** 把 ICP 备案这种长等待期事项前置启动；先用 3 个政策 PDF 试跑 LLM Wiki，确认编译方案可行
**Mode:** mvp
**Weeks:** W0
**Requirements:** INF-01, INF-02
**Success Criteria:**
1. 腾讯云华东（上海）账号开通 + 占位站 ICP 备案已提交
2. llm-wiki-compiler 用 3 政策 PDF 编译，质量评估 ≥ 80%（中文解析准确 / 引用回链正确 / 增量编译可用）

**Risks & Notes:**
- ICP 备案 7-20 工作日是 W2 demo 的硬阻塞，必须 W0 启动
- LLM Wiki 失败的 fallback 是 LangChain RAG（+1-2 周）
- DeepSeek 主+备 + 第三家备用 LLM API key 在 W0 申请并跑通最简调用

---

### Phase 1: 脚手架 + 工程基建
**Goal:** Fork career-report → sbj-website；建工程基建（多供应商 LLM、字段加密、审计、middleware、PIPL、监控、CI/CD）
**Mode:** mvp
**Weeks:** W1
**Requirements:** INF-03 ~ INF-12
**Success Criteria:**
1. 单 Next.js 应用 monorepo 结构跑起来（市民端路由 + /admin 路由)
2. `lib/llm-client.ts` 多供应商抽象层跑通最简调用（DeepSeek 主成功 + 切换备成功）
3. 4 张审计表 + 业务表都建好（含字段加密 phone / 简历内容）
4. middleware.ts 鉴权生效（/api/admin/* 必须 staff token）
5. CI/CD（GitHub Actions + 腾讯云 webhook）+ 备份 + 监控告警都跑起来

**Risks & Notes:**
- W1 是整个项目最重的"地基周"。后面 4 个模块都依赖 W1 的工程基建
- 不能省。CEO 视角看 W1 工作量被低估，单兵单周可能要溢出到 W2
- PIPL stub 必须在 W1（不是 W8），否则后期补改成本翻倍

---

### Phase 2: 政策问答
**Goal:** 政策问答全功能上线（双页签 + 3 热点预设 + 自由问 + 1000 字+引用+免责 + LLM eval suite ≥ 80%）
**Mode:** mvp
**Weeks:** W2
**Requirements:** QA-01 ~ QA-12
**Success Criteria:**
1. 双页签切换正常（policy-kb / biz-kb），各自加载独立 wiki
2. 3 热点问题（Q1/Q2/Q3）一键问展示预设答案，不调 LLM
3. 自由问命中 wiki 时给出真实引用 + 1000 字内 + 免责声明；未命中时给兜底转窗口文案
4. LLM eval suite 50 题 golden Q&A 准确率 ≥ 80% + 出处校验通过率 ≥ 80%

**Plans:** 7 plans

Plans:
- [x] 02-01-wiki-compile-PLAN.md — Wiki 编译 CLI + Prisma 写库 + audit（QA-02 / QA-03 / QA-09）— 2026-05-09 PASS（commits a063b7b + b651755）
- [ ] 02-02-qa-foundation-PLAN.md — QA 三层防护 + 自由问 API + 4 测试套件（QA-04 / QA-05 / QA-06 / QA-07）
- [ ] 02-03-hot-questions-PLAN.md — 3 热点 .md + GET /api/qa/hot（QA-08 / QA-10）
- [ ] 02-04-citizen-ui-PLAN.md — globals.css + shadcn ui + /qa 页面 + wiki 详情（QA-01 / QA-04 / QA-05 / QA-08 / FE-01 / FE-03）
- [ ] 02-05-admin-wiki-editor-PLAN.md — /admin/wiki 列表 + 编辑器 + PUT API（QA-12）
- [ ] 02-06-llm-eval-PLAN.md — 50 题 golden Q&A + run.ts 阈值卡死 + USER OWN checkpoint（QA-11）
- [ ] 02-07-e2e-PLAN.md — Playwright 市民 + admin e2e 全流程（QA-01 / QA-04~08 / QA-12）

**Wave 结构（5 个 wave）:**
- Wave 1: 02-01（Wiki 编译 — 数据基础设施）
- Wave 2 (并行): 02-02（QA 三层防护）+ 02-03（热点 .md / API）
- Wave 3 (并行): 02-04（市民端 UI）+ 02-05（admin 编辑器）
- Wave 4: 02-06（LLM eval suite，需 02-02 service 已就位）
- Wave 5: 02-07（e2e 全集成）

**Risks & Notes:**
- W2 末出 demo 给甲方，是建立项目信心的关键节点
- LLM 越界编造政策是 critical 风险：system prompt 硬约束 + 链接白名单校验 + 未命中强制兜底，三层防线
- 微信公众号文章本地存档（M13）防原文删除/失效

---

### Phase 3: 职业诊断
**Goal:** 职业诊断完整链路（输入→简历解析→量表→AI 访谈→5 章报告→5 级标签）
**Mode:** mvp
**Weeks:** W3-W4
**Requirements:** CAR-01 ~ CAR-15
**Success Criteria:**
1. 完整链路打通（市民走完输入→量表→访谈→生成 5 章报告→显示 + PDF 下载）
2. 量表 5 级标签真实数据分布合理（W3 末用 50-100 模拟数据校准）
3. 第四章简历快诊直接复用 career-report 的 ResumeDiagnosis（100% 复用度）
4. HR 直觉评分（用户自评）≥ 7/10
5. 5 级帮扶标签 AI 自动生成 + 工作人员后台可手动覆盖 + 留痕

**Risks & Notes:**
- 量表题终稿由用户拟（HR 专业），AI 不准
- 一致性检测题防止市民应付答完
- 这 phase 是 CRM 的输入数据源，不能跳过

---

### Phase 4: CRM 子系统
**Goal:** 工作人员后台市民管理 + 诊断审阅 + 服务跟踪 + 数据看板
**Mode:** mvp
**Weeks:** W5
**Requirements:** CRM-01 ~ CRM-09
**Success Criteria:**
1. 市民列表（按 5 级标签筛 + 搜索手机号/姓名）跑通
2. 市民详情（简档 + 历史诊断 + 服务记录时间线）跑通
3. 工作人员可添加服务记录、调整 5 级标签（带留痕）
4. 数据看板（5 级标签分布 + 月度服务量）展示合理

**Risks & Notes:**
- CRM 是甲方的 daily driver，必须给甲方看到价值
- audit_logs 留痕生效是合规验收点
- W1 已建审计表 + 业务表，这 phase 主要补 UI

---

### Phase 5: 创业诊断
**Goal:** 4 项输入 + 6 维度 AI 访谈（代码状态机）+ 3 章报告 + 雷达图 + 联动政策 wiki
**Mode:** mvp
**Weeks:** W6
**Requirements:** BIZ-01 ~ BIZ-09
**Success Criteria:**
1. 4 项输入页 + 6 维度 AI 访谈最多 8 轮（代码控制状态机，LLM 只回布尔）
2. 3 章报告生成（综合评估 / 项目概览 / 6 维创业评估）
3. 6 维度雷达图（复用 career-report `PositionInfo`，改维度轴）
4. 创业政策推送（biz-kb 联动）

**Risks & Notes:**
- 创业诊断是"组装"而非"创造"——80% 复用职业诊断引擎
- 报告 3 章已限定，"行动建议"和"政策匹配"扩展不在本期范围（合同已写）
- 状态机由代码控制（M9），避免 LLM 漂移

---

### Phase 6: 端到端联调 + 响应式
**Goal:** 双端打通 + 手机访问 OK + 触屏适配
**Mode:** standard
**Weeks:** W7
**Requirements:** FE-01 ~ FE-05
**Success Criteria:**
1. 市民走完三个模块（政策问答 / 职业诊断 / 创业诊断），数据流转到工作人员后台
2. 手机端访问无 UI 错乱（量表题、雷达图、报告页都能看）
3. 工作人员后台 PC 优先显示

---

### Phase 7: PIPL 验收 + 安全压测
**Goal:** 合规验收 + 安全扫描 + 备份/灾备/监控验收
**Mode:** standard
**Weeks:** W8
**Requirements:** COMP-01 ~ COMP-08
**Success Criteria:**
1. PIPL 删除/导出工单实测可用（数据真删 / 真导出）
2. Cookie 同意横幅 + 第三方 SDK 清单完整
3. 安全扫描通过（SQL 注入 / XSS / 越权访问）
4. 备份恢复演练成功（删数据库 → 从备份恢复，记录 RTO）

**Risks & Notes:**
- 等保如果甲方要求 → 单独走流程（成本高，让甲方付测评费）
- 信息安全责任险（约 1 万/年）用户购买，对冲数据泄露个人责任

---

### Phase 8: UAT + 交付
**Goal:** 甲方 UAT 反馈调整 → 文档完整 → 转维
**Mode:** standard
**Weeks:** W9-W10
**Requirements:** 无新增（之前 phase 的 UAT 反馈调整）
**Success Criteria:**
1. UAT 反馈关键问题 fixed
2. 文档齐全（README / API doc / 运维 runbook / 数据库迁移 log）
3. 长期运维费 + 知识库年度维护费方案签字

---

## Dependency Graph

```
W0 备案 + LLM Wiki 试跑
  │
W1 脚手架 + 工程基建（所有模块共同地基）
  │
  ├──▶ W2 政策问答（独立模块）
  │       │
  │       └──▶ W6 创业诊断（biz-kb 联动）
  │
  └──▶ W3-W4 职业诊断 ──▶ W5 CRM（依赖 5 级标签数据）
          │
          └──▶ W6 创业诊断（复用访谈+报告引擎）
  │
W7 联调 → W8 合规 → W9-W10 交付
```

---

## Cross-Cutting Risks

详见 V8 plan 第九节风险清单。最 critical 的 3 条：
1. **数据安全个人责任**（自购服务器）— 信息安全责任险 + 合同切割
2. **AI 越界编造政策** — system prompt 约束 + 链接白名单 + 未命中兜底
3. **CRM 被甲方视为免费送** — 必须在合同里写清范围

---

*Generated: 2026-05-08, from V8 plan*
*Phase 2 plans added: 2026-05-08*
