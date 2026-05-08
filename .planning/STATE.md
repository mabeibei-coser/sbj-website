# STATE — sbj-website

> 项目记忆。每次切换 phase / 完成关键节点时更新。

---

## Current State

**Phase:** Phase 0 — 前期准备（W0），Slice B 已通过；Slice A 由家人 own，跟踪中
**Status:** Slice B (LLM Wiki PoC) PASS — D1+D2 加权 100/100；W2 上 LLM Wiki 路线已确定，不切 RAG。Slice A (占位站 + ICP) 待家人提交。
**Last Updated:** 2026-05-08

## What's Done

- [x] V8 plan 完成（C:\Users\admin\.claude\plans\1-giggly-cat.md）
- [x] V8 plan 经 autoplan 双视角审阅（CEO + Eng），14 条 mechanical patch 全应用
- [x] 项目目录创建：D:\workspace\01_项目-Coding\sbj-website\
- [x] git init
- [x] .planning/ 结构（PROJECT.md / config.json / REQUIREMENTS.md / ROADMAP.md / STATE.md）
- [x] **Phase 0 Slice B (INF-02) PASS** — LLM Wiki 编译方案验证完成（2026-05-08）
  - 关键发现：上游 `llm-wiki-compiler` 是 Claude Code 插件不可直接用 → 改走"拆 prompt + DeepSeek 重写最简版"
  - 实现：`experiments/llm-wiki-poc/`（2666+ 行 + 4 commits），DeepSeek `deepseek-v4-flash` + MinerU Agent API
  - 评估：3 份政策素材（创卡 PDF + 2 微信文章）→ 1 主题 / 111 行文章 / 15k tokens / 44s
  - 评分：D1=5/5（中文政策准确性）+ D2=5/5（引用回链正确性） → 加权 100/100，PASS
  - 详见：`experiments/llm-wiki-poc/EVAL.md` + `docs/W0-LLM-Wiki-eval.md`
- [x] **W2 build path 锁定**：fork `experiments/llm-wiki-poc/prompts/` + `scripts/compile.ts`，工程化为 `app/api/wiki/compile` + 审计日志 + token 预算

## What's Next

### Slice A 收尾（家人 own，本 plan 不主动推）
- [ ] 占位站上线（家人）
- [ ] ICP "新增网站接入" 提交（家人，jsai100.com 主体复用，约 1-3 工作日）
- [ ] 状态填入 `docs/ICP-备案-跟踪.md`（用户 / 家人填）

### Slice A 完成后 → 切 Phase 1（W1 脚手架）
- [ ] 跑 `/gsd-plan-phase 1` 规划 W1（INF-03 ~ INF-12）
- [ ] W1 关键工作：
  - INF-03 多供应商 LLM 抽象（**直接复用 PoC 的 deepseek-client 模式**）
  - INF-04 字段加密
  - INF-05 审计日志（4 张表）
  - INF-06 middleware.ts 鉴权
  - INF-07 PIPL stub
  - INF-08 PostgreSQL + COS
  - INF-09 备份/灾备
  - INF-10 监控告警
  - INF-11 CI/CD
  - INF-12 测试基建

### W0 平行（用户做的非编码任务，不在本 plan 范围）
- [ ] 找甲方问 10 件 critical 事（V8 plan 第八节）
- [ ] SOW 起草签字（含 V8 全部 20 项对齐）

## Blockers

| Blocker | Impact | Mitigation |
|---|---|---|
| 等保是否要求未确认 | 影响项目难度等级 | 本周问甲方 |
| CRM 是否在合同范围未确认 | 影响是否被视为免费送 | 本周问甲方 |
| 创业与行业库文件数量未确认 | 影响 W2 工作量 | 本周拿到清单 |
| 占位站 + ICP 备案 | W2 demo 硬阻塞 | 家人本周提交"新增网站接入"，jsai100.com 既有主体走快速路径（~1-3 工作日） |

（Q3 "黄浦创卡" 答案来源 blocker 已部分解除——家人已提供《黄浦创卡》PDF 手册，覆盖 12 页全套 9 项政策福利；W2 还可能需要补 3 份外部政策 PDF）

## Decisions Log

详见 PROJECT.md "Key Decisions" 章节。

### 2026-05-08 新增 / 验证

| Decision | Outcome |
|---|---|
| 用 llm-wiki-compiler 作 W2 wiki 工具 | **Outcome: 部分推翻** — 上游是 Claude Code 插件不可直接换 DeepSeek。改"拆其 prompt + DeepSeek 重写最简版"，路径合规且 W2 production 可直接复用 |
| LLM Wiki 编译方案的可行性 | **Outcome: Validated** — D1+D2 加权 100/100，W2 不切 RAG fallback |
| MinerU 中文 PDF 解析 | **Outcome: Validated**（Agent API 免费档已够 W0 验证；W2 production 升 Precision API） |
| DeepSeek `deepseek-v4-flash` 模型 | **Outcome: Validated** — 串行编译 / 3 元成本 / 44s 完成 3 文件 |
| 评估只评 D1+D2，跳过 D3 D4 | **Outcome: 决策接受** — W0 只验最大未知，编译速度+增量编译留 W2 调优 |

## Phase Transitions

| Date | From | To | Trigger |
|------|------|------|---------|
| 2026-05-08 | (init) | Phase 0 Slice B | Slice B PASS — D1+D2 100/100 |
| (待) | Phase 0 Slice A | Phase 1 | 家人确认占位站上线 + ICP 已提交 |

---

*Last updated: 2026-05-08 after Slice B PASS*
