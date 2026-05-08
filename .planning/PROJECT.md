# PROJECT — 社保局 智能就业创业小程序（sbj-website）

> 项目代号：sbj-website
> 创建日期：2026-05-08
> 来源：从 `~/.claude/plans/1-giggly-cat.md` V8 plan 转化
> 项目主推人：用户（永升服务集团 HR 薪酬福利岗，副业身份独立交付）
> 主要工具：Claude Code（Vibe Coding）

---

## What This Is

为上海黄浦区社保局合作开发的就业/创业辅助 Web 应用，包含三个模块：

1. **政策与智能问答**（双知识库 + AI 回答 + 3 热点问题预设）
2. **智能职业诊断**（输入 + 12 量表题 + 4 AI 访谈 + 5 章报告 + 5 级帮扶标签）
3. **智能创业诊断**（4 项输入 + 6 维度 AI 访谈 + 3 章报告 + 雷达图）

加上工作人员后台 CRM 子系统（市民简档 + 服务跟踪 + 数据看板）。

部署形态：**纯 Web（H5）+ 响应式**，单 Next.js 应用承载市民端 + 工作人员后台。**不做小程序**。

## Core Value

让黄浦区社保局工作人员能用一套工具，给不同帮扶等级的市民提供差异化的就业/创业服务。

副业母版价值：第一单跑通后，代码所有权归用户，可以低成本复制到其他社保局（300+ 地级市市场）。

## Context

- **客户**：黄浦区社保局（已签约甲方，副业项目）
- **使用者**：双端——市民（自助使用）+ 工作人员（后台审阅、CRM、知识库管理）
- **地点**：上海黄浦区中山南一路 555 号；服务电话 63011095 / 63137613
- **用户**：永升服务集团 HR 薪酬福利岗，社保领域 domain 专业，Vibe Coding 初学者，独立交付
- **周期**：W0-W10，11 周（含 W0 备案+试跑）
- **预算/合规**：副业项目，**默认不需要等保**（仍需 ICP + PIPL）；具体要等本周问甲方确认

## Requirements

### Validated

（暂无 — 项目尚未交付）

### Active

详见 `REQUIREMENTS.md`。核心 v1 范围：
- [ ] 政策问答（双页签 + 3 热点 + 自由问 + 1000 字+引用+免责）
- [ ] 职业诊断（输入 + 量表 + 访谈 + 5 章报告 + 5 级标签）
- [ ] 创业诊断（输入 + 6 维度访谈 + 3 章报告 + 雷达图）
- [ ] 工作人员后台（市民管理 / 诊断审阅 / 知识库编辑 / 数据看板）
- [ ] 工程基建（多供应商 LLM / 审计层 / 字段加密 / PIPL stub / middleware / 备份 / 监控 / CI-CD）

### Out of Scope（v1 明确不做）

- ❌ 微信/支付宝小程序（只做 Web；如甲方坚持要小程序走变更，预报价 10-15 万）
- ❌ 实名认证（手机号字段保留供 CRM 使用；不接公安身份认证）
- ❌ 接入社保局现有内网/SSO（独立账号体系）
- ❌ 创业诊断报告页前台下载/预约按钮（移到"另一个管理后台"二期）
- ❌ "行动建议" / "政策匹配" 等创业诊断报告扩展章节（已限定 3 章）
- ❌ 等保 2.0/3.0 测评（默认不做，但本周必问甲方确认）
- ❌ 其他地区社保局复制（第一单先做完）

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| 不做小程序，纯 Web | 副业 Vibe Coding 单兵交付，省 uni-app + 微信审核 ~1 周 | Pending |
| LLM Wiki 而非 RAG | 30 篇政策文档量级 + 政府场景需要"答案可追溯" + 工作人员可编辑 wiki | Pending |
| DeepSeek 主+多供应商 fallback | 单供应商两个 key 不算真 fallback（监管/限流一起死）；豆包/讯飞兜底 | Pending |
| 三模块顺序：政策→职业→CRM→创业 | 政策业务链路最短先验证 LLM 路径；职业诊断 fork career-report 90% 复用；CRM 依赖职业诊断输出的 5 级标签 | Pending |
| 创业访谈状态机由代码控制 | LLM 只回布尔，避免 LLM 漂移破坏整体流程 | Pending |
| 副业自购腾讯云华东（上海）| 配合甲方所在地黄浦；带"信息安全责任险 + 合同切割"风险缓解 | Pending |

## Project Layout

- 仓库根：`D:\workspace\01_项目-Coding\sbj-website\`
- 复用源：
  - `D:\career-report\` — 职业/创业诊断引擎基座（90% 复用）
  - `D:\workspace\01_项目-Coding\resume-tailor\` — PDF/Word 解析 + DOCX 生成
  - LLM Wiki 编译：[ussumant/llm-wiki-compiler](https://github.com/ussumant/llm-wiki-compiler)
- 设计文档：`.planning/research/V8-design-doc.md`（V8 plan 副本）

## External References

- **V8 Plan 主文档**：`C:\Users\admin\.claude\plans\1-giggly-cat.md`（含完整方案、风险、对齐清单、商业模式）
- **autoplan review 报告**：V8 plan 第 17-25 节（CEO + Eng 双视角审阅记录）
- **patch 清单**：V8 plan 第 26 节（V7 → V8 14 条 mechanical 应用记录）

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-05-08 after initialization (from V8 plan)*
