# REQUIREMENTS — sbj-website v1

> 来源：V8 plan 第二、三、四、五、十一·五节
> 范围：副业交付，黄浦区社保局合作，10-11 周（W0-W10）

---

## v1 Requirements

### Infrastructure（INF）— 工程基建

- [ ] **INF-01**: ICP 备案在 W0 启动（占位站，等待期 7-20 工作日）
- [ ] **INF-02**: LLM Wiki 编译方案试跑通过（3 政策 PDF 验证质量 ≥ 80%）
- [ ] **INF-03**: 多供应商 LLM 抽象层（`lib/llm-client.ts`）：DeepSeek 主 + 豆包/讯飞备
- [ ] **INF-04**: 字段加密（`lib/encryption.ts`，AES，加密 phone/简历内容）
- [ ] **INF-05**: 审计日志（`lib/audit.ts` + 4 张审计表 audit_logs / llm_call_logs / consent_records / wiki_pages.version）
- [ ] **INF-06**: middleware.ts 鉴权（路径前缀 + 角色双重校验）
- [ ] **INF-07**: PIPL stub（consent_records + 删除/导出 API + 隐私政策草稿）
- [ ] **INF-08**: PostgreSQL（腾讯云华东上海）+ COS 存储
- [ ] **INF-09**: 备份/灾备（CDB 自动每日全量 + 跨区冷备）
- [ ] **INF-10**: 监控告警（API 错误率 / LLM 失败率 / LLM 月度成本 / DB CPU）
- [ ] **INF-11**: CI/CD（GitHub Actions + 腾讯云 Lighthouse webhook）
- [ ] **INF-12**: 测试基建（Vitest 单元 + 集成 + Playwright E2E + LLM eval suite）

### Policy QA（QA）— 政策与智能问答

- [ ] **QA-01**: 双页签结构（政策与办事库 policy-kb / 创业与行业库 biz-kb）
- [ ] **QA-02**: policy-kb 编译（3 个核心政策文件 → wiki）
- [ ] **QA-03**: biz-kb 编译（数量待甲方确认，暂按 5-10 个估）
- [ ] **QA-04**: `/api/qa/answer` 自由问 API（命中知识库 → 引用 + 1000 字 + 免责声明）
- [ ] **QA-05**: 三级回答策略（命中 / 部分命中 / 未命中转窗口；绝不编造）
- [ ] **QA-06**: 链接合法性校验（白名单 regex）+ 缺链接重试 + 兜底文案
- [ ] **QA-07**: Prompt injection 防护（敏感词过滤 + XML tag 边界）
- [x] **QA-08**: `/api/qa/hot` 3 个热点问题预设答案（不调 LLM）
- [ ] **QA-09**: Q1/Q2 微信公众号文章抓取 + 清洗 + 本地存档（防原文失效）
- [x] **QA-10**: Q3 "黄浦创卡" 答案（**待甲方提供来源**）
- [ ] **QA-11**: LLM eval suite（50 题 golden Q&A，准确率 + 出处校验通过率 ≥ 80%）
- [ ] **QA-12**: 后台 wiki markdown 编辑器（双库管理）

### Career Diagnosis（CAR）— 智能职业诊断

- [ ] **CAR-01**: 输入页（简历 PDF/Word + 最高学历 + 工作经验年限 + 目标岗位）
- [ ] **CAR-02**: 简历解析（fork resume-tailor `/api/resume/parse`）
- [ ] **CAR-03**: 量表 12 道（就业能力/条件/心态各 4 题，5 档评分）
- [ ] **CAR-04**: 量表评分 + 3 维度 × 3 档评估
- [ ] **CAR-05**: 量表阈值真实数据校准（W3 末用 50-100 条模拟数据验证分布合理）
- [ ] **CAR-06**: 量表一致性检测题（防应付答完）
- [ ] **CAR-07**: AI 访谈 4 题（简历澄清 2 + 就业想法 2，复用 career-report `/api/interview/*`）
- [ ] **CAR-08**: 报告第一章 总评（自写，量表→3 维度×3 档）
- [ ] **CAR-09**: 报告第二章 优势能力与职业性格（雷达图，复用 career-report `PositionInfo`）
- [ ] **CAR-10**: 报告第三章 就业岗位建议（复用 career-report `Salary` + `PositionInfo`）
- [ ] **CAR-11**: 报告第四章 简历快诊（直接复用 career-report 第四章 ResumeDiagnosis）
- [ ] **CAR-12**: 报告第五章 行动建议 + 免责声明（自写，30/60/90 天计划）
- [ ] **CAR-13**: 5 级帮扶标签自动生成（易/较难/难/重点/托底）
- [ ] **CAR-14**: 报告 PDF 导出（fork career-report `lib/pdf-export.ts`）
- [ ] **CAR-15**: 量表题终稿（**待用户拟**，HR 专业你比 AI 准）

### Biz Diagnosis（BIZ）— 智能创业诊断

- [ ] **BIZ-01**: 输入页（项目名称 + 启动资金区间 + 主要产品 + 个人履历）
- [ ] **BIZ-02**: 6 维度 AI 访谈（需求与定位/产品与商业模式/市场与竞争力/团队能力/项目发展现状/发展规划与风险）
- [ ] **BIZ-03**: 访谈状态机由**代码控制**（最多 8 轮 + 每个核心问题最多 1 次追问；LLM 只回布尔）
- [ ] **BIZ-04**: 报告第一章 综合评估（6 维度总分 + 整体定级 + 一句话画像）
- [ ] **BIZ-05**: 报告第二章 项目概览（4 项输入 + 访谈摘要清晰排版）
- [ ] **BIZ-06**: 报告第三章 6 维创业评估（雷达图 + 每维度的得分/优势/风险/建议）
- [ ] **BIZ-07**: 6 维度雷达图（复用 career-report `PositionInfo`，改维度轴）
- [ ] **BIZ-08**: 5 级帮扶标签（**默认沿用职业诊断分类**，待用户最终确认）
- [ ] **BIZ-09**: 与政策 wiki 联动（biz-kb 推送相关政策给市民）

### CRM 子系统（CRM）— 仅工作人员后台

- [ ] **CRM-01**: 数据库 3 表（citizen_profiles / diagnosis_records / service_logs）
- [ ] **CRM-02**: 工作人员账号体系（独立账号，iron-session + bcrypt，复用 career-report）
- [ ] **CRM-03**: 工作人员后台分级权限（管理员 / 普通审阅员）
- [ ] **CRM-04**: 市民列表（按 5 级标签筛 + 搜索手机号/姓名）
- [ ] **CRM-05**: 市民详情（简档 + 历史诊断 + 服务记录时间线）
- [ ] **CRM-06**: 添加服务记录（service_logs CRUD）
- [ ] **CRM-07**: 5 级标签调整（AI 建议 + 工作人员手动覆盖 + 留痕）
- [ ] **CRM-08**: 数据看板（5 级标签分布 / 月度服务量 / 当月新增市民 / 当月转介）
- [ ] **CRM-09**: 报表导出（DOCX，复用 resume-tailor `lib/docx-builder.ts`）

### Frontend（FE）— 市民端 UI

- [ ] **FE-01**: 单 Next.js 应用（市民端 + 工作人员后台同代码库，不同路由）
- [ ] **FE-02**: shadcn/ui 组件（复用 career-report 全部组件）
- [ ] **FE-03**: 响应式适配（手机优先，触屏量表题 + 雷达图小屏可读性）
- [ ] **FE-04**: 实名认证不做（手机号字段保留供 CRM 使用）
- [ ] **FE-05**: 独立小程序码 + 网址（不接社保局公众号 / 政务总入口）

### Compliance（COMP）— 合规

- [ ] **COMP-01**: ICP 备案完成（W2 demo 前必须就绪）
- [ ] **COMP-02**: PIPL 删除/导出工单（实测可用，W8 验收）
- [ ] **COMP-03**: Cookie 同意横幅 + 第三方 SDK 清单
- [ ] **COMP-04**: 隐私政策 + 服务条款（用户自审）
- [ ] **COMP-05**: AI 免责声明（报告每页 + 问答框 + 创业诊断报告底部）
- [ ] **COMP-06**: 安全扫描（SQL 注入 / XSS / 越权访问）
- [ ] **COMP-07**: 等保（**默认不做**；本周问甲方确认）
- [ ] **COMP-08**: 信息安全责任险（约 1 万/年，用户自购，因为副业自购服务器风险归用户）

---

## v2 Requirements（延后到二期"另一个管理后台"）

- 创业诊断报告前台下载 PDF
- 创业诊断报告前台预约服务按钮
- 二期管理后台（业务功能扩展）
- 微信小程序版（如甲方坚持要，按变更签字 10-15 万）

---

## Out of Scope（明确不做）

| 项 | 不做的理由 |
|---|---|
| 微信/支付宝小程序 | 用户决定纯 Web；如甲方坚持，走变更签字 |
| 实名认证（身份证 OCR） | 用户决定不做；手机号字段保留供 CRM |
| 接入社保局现有 SSO/OA | 用户决定独立账号 |
| 创业诊断报告"行动建议"+"政策匹配"扩展章节 | 用户限定 3 章；甲方追加走变更 |
| RAG / 向量数据库 | 30 篇文档量级用 LLM Wiki 更准更便宜 |
| 等保 2.0/3.0 测评 | 默认不做；本周问甲方；如要求，让甲方付测评费 |
| 其他社保局复制 | 第一单先做完；第二单复用代码 6 周交付 |

---

## Traceability

填充规则：每个 v1 REQ-ID 必须映射到 ROADMAP.md 中的某个 phase。

| REQ-ID 范围 | Phase | 阶段 |
|---|---|---|
| INF-01, INF-02 | Phase 0 | W0 前期准备 |
| INF-03 ~ INF-12 | Phase 1 | W1 脚手架 |
| QA-01 ~ QA-12 | Phase 2 | W2 政策问答 |
| CAR-01 ~ CAR-15 | Phase 3 | W3-W4 职业诊断 |
| CRM-01 ~ CRM-09 | Phase 4 | W5 CRM |
| BIZ-01 ~ BIZ-09 | Phase 5 | W6 创业诊断 |
| FE-01 ~ FE-05 | Phase 6 | W7 端到端联调 + 响应式 |
| COMP-01 ~ COMP-08 | Phase 7 | W8 PIPL 验收 + 安全压测 |
| - | Phase 8 | W9-W10 UAT + 交付 |

---

## Pending Inputs（必须从甲方/用户拿到的输入）

| # | 项 | 谁给 | 何时 |
|---|---|---|---|
| P1 | 政策与办事库 3 个核心文件清单 + PDF | 甲方 | 本周 |
| P2 | 创业与行业库文件清单 + 数量 | 甲方 | 本周 |
| P3 | Q3 "黄浦创卡" 答案来源链接 | 甲方 | 本周 |
| P4 | 量表 12 题终稿 | 用户 | W3 前 |
| P5 | 创业诊断 5 级标签是否沿用职业诊断分类 | 用户 | W6 前 |
| P6 | 等保是否要求 + CRM 是否在范围内 + 服务器谁提供 + 回款节奏 + 关系人变动条款 + 小程序变更价 | 甲方 | 签 SOW 前 |

---

*Generated: 2026-05-08, from V8 plan*
