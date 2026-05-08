# CLAUDE.md — sbj-website

> 项目级指令。Claude Code 每次进入此目录会自动加载。
> 全局指令见 `~/.claude/CLAUDE.md`，编程项目通用规则见 `D:\workspace\01_项目-Coding\CLAUDE.md`。

---

## 项目身份

- **项目代号**：sbj-website
- **业务**：上海黄浦区社保局 智能就业创业小程序（实际是 Web 应用，不做小程序）
- **三个核心模块**：政策问答 / 智能职业诊断 / 智能创业诊断 + 工作人员后台 CRM
- **主推人**：用户（永升服务集团 HR 薪酬福利岗，副业身份独立交付）
- **项目阶段**：Phase 0（W0 前期准备），见 `.planning/STATE.md`

## 主参考文档

进入 sbj-website/ 项目时，优先按这个顺序读：

1. **`.planning/PROJECT.md`** — 项目身份、core value、constraints、key decisions
2. **`.planning/STATE.md`** — 当前 phase、待办、blockers
3. **`.planning/ROADMAP.md`** — phase 顺序与每 phase 的 success criteria
4. **`.planning/REQUIREMENTS.md`** — 详细 v1 requirement 清单（按 INF/QA/CAR/BIZ/CRM/FE/COMP 分组）
5. **`C:\Users\admin\.claude\plans\1-giggly-cat.md`** — V8 plan 主文档（设计思路、风险清单、商业模式、autoplan review 记录）

## 复用源（不要重写）

- **`D:\career-report\`** — 职业/创业诊断引擎基座（90% 复用）
  - `lib/report-shared.ts` `callWithFallback()` → 改造成多供应商 LLM 路由
  - `lib/report-client.ts` 多章节并发框架
  - `lib/pdf-export.ts` PDF 分页导出（直接搬）
  - `lib/admin-session.ts` iron-session + bcrypt 认证（直接搬）
  - `app/api/interview/*` AI 访谈引擎（改 prompt + 题目）
  - 第四章 ResumeDiagnosis（直接复用作为职业诊断的简历快诊章节）
  - `PositionInfo` 雷达图组件（3 维度 / 6 维度通用）
  - `components/ui/*` shadcn 组件（直接搬）

- **`D:\workspace\01_项目-Coding\resume-tailor\`** — 仅 PDF/Word 解析 + DOCX 生成
  - `app/api/resume/parse/route.ts`（pdf-parse + mammoth）
  - `lib/docx-builder.ts`（docxtemplater）
  - `tests/` Playwright E2E 框架

- **LLM Wiki 编译工具**：[ussumant/llm-wiki-compiler](https://github.com/ussumant/llm-wiki-compiler)

## 项目级硬约束

- **不做小程序**（纯 Web；如甲方坚持，走变更签字 10-15 万）
- **不做实名认证**（手机号字段保留供 CRM）
- **不接社保局现有 SSO/OA**（独立账号体系）
- **数据存腾讯云华东（上海）**，配合甲方所在地黄浦区
- **AI 模型用国产合规**（DeepSeek 主 + 豆包/讯飞备）；不用 Claude/GPT/Gemini
- **创业访谈状态机由代码控制**（M9，LLM 只回布尔，不漂移）
- **政策问答 1000 字+引用+免责**（M10 互斥兜底：无链接重试一次再兜底）
- **绝不允许 AI 编造政策**（system prompt 硬约束 + 链接白名单 regex + 未命中转窗口）

## 工作流约定

### Phase 进度跟踪
- 每完成一个 phase 的 success criteria，更新 `.planning/STATE.md` 的 "What's Done"
- 切换到下一个 phase 时，更新 STATE.md 的 "Current State" + "What's Next"

### Git
- 每个 phase 至少一个 atomic commit
- commit 信息按 V8 plan + REQ-ID（例：`feat(QA-04): 自由问 API + 1000 字限制`）

### 测试
- LLM eval suite（QA-11）每次改 prompt 必跑 50 题 golden test，准确率 < 80% 不上线
- E2E（Playwright）覆盖三大模块完整流程
- 单元测试覆盖：量表评分边界、加密/解密、状态机计数器

## Design System — 写任何 UI 代码前必读

**Source of truth**：`DESIGN.md` v2.0（蓝白 cinematic，抽取自 career-report）。

### 写 UI 前的 5 步 checklist

1. ✅ **读 `DESIGN.md`**（本项目根目录）—— 确认 token、字体、组件、动画
2. ✅ **读 `D:\career-report\app\globals.css`** —— 完整 CSS 系统（aurora / glass-card / spotlight / report-* 等 25+ class 已就绪）
3. ✅ **检查页面类型** → DESIGN.md §8 Page Templates 对应的 fork 策略
4. ✅ **优先 fork career-report 已有页面**（80% 复用 + 20% 改 prompt/字段），不要从零写
5. ✅ **自检 DESIGN.md §9 Hard Don'ts**（emoji icon / 紫渐变 / pill / Inter / 居中 hero / AI 文案）

### 视觉血统

sbj-website ≈ career-report **fork 改 prompt + 业务字段**。颜色、字体、动画、组件全部沿用。任何"重新设计"动作都需要明确审批。

### 偏离 DESIGN.md 的处理

- **绝不允许**：引入新字体、新基础色、新动画 class
- **可以**：在 §7 Component Library 加新组件（仅当 sbj-website 业务必需，且用现有 token 组合）
- **必须**：新组件命名延续 career-report 习惯（`report-*` / `glass-*` / `frag-*`）

### 参考代码定位

| 你要做 | 看 career-report 哪个文件 |
|---|---|
| 市民端首页 hero / process / stats / features | `app/page.tsx` |
| 报告页结构 | `app/report/page.tsx` |
| 报告章节 wrapper | `components/report/section-wrapper.tsx` |
| 报告各章节示例 | `components/report/overview-section.tsx` 等 |
| AI 访谈流程 | `app/api/interview/*` + `app/interview/page.tsx` |
| Admin 后台 | `app/admin/*` + `lib/admin-session.ts` |
| 全部 CSS 系统 | `app/globals.css`（这是设计语言的源代码） |

---

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Phase planning → invoke /gsd-discuss-phase or /gsd-plan-phase

---

*Generated 2026-05-08 from V8 plan*
