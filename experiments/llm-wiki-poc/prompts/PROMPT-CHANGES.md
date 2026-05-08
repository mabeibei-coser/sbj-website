# Prompts 改动记录 — vs upstream llm-wiki-compiler

本目录的 prompts 来源于 [ussumant/llm-wiki-compiler](https://github.com/ussumant/llm-wiki-compiler) 的 `plugin/skills/wiki-compiler/SKILL.md`，**为中文政府政策场景重写**。

## 关键差异

| 项 | Upstream | 本 PoC |
|---|---|---|
| 语言 | English | 中文（prompt + 输出全程中文） |
| 领域 | Generic（codebase / knowledge） | 政府政策（社保/就业/创业） |
| 引用约束 | "Sources" section with backlinks | **强约束**：每条事实必须可追溯到 source markdown 的具体行号区间，禁止编造 |
| 编造容忍度 | 一般 | **零容忍**：不在源里就不要写，要写就 quote 原文措辞 |
| 主题分类提示 | topic_hints from config | 政策领域种子词（失业保险/就业补贴/创业扶持/...） |
| article_sections | 通用模板 | 政策专用：概述/适用对象与资格/办理流程/补贴标准/常见疑问/出处 |
| 时效性注解 | 全套 [as of YYYY-MM] + ⚠️ stale 标记 | **跳过**（W0 PoC 简化） |
| 概念文章（concepts/） | Phase 3.5 自动生成 | **跳过**（W0 PoC 只做 topics） |
| schema.md 演化 | Phase 3.7 维护 | **跳过**（3 个文件级别用不上） |
| 并发编译 | 鼓励多 subagent 并发 | **串行**（避免 DeepSeek 限流；3 主题工作量也不大） |

## 跳过的 phases（W0 PoC 简化）

| Phase | upstream | 本 PoC |
|---|---|---|
| 1 扫描 sources | ✓ | ✓ |
| 2 主题分类 | ✓ | ✓ |
| 3 主题文章生成 | ✓ | ✓ |
| 3.5 跨主题概念 | ✓ | ✗（W0 不需要，3 文件没必要） |
| 3.7 schema.md | ✓ | ✗ |
| 4 INDEX.md | ✓ | ✓ |
| 5 .compile-state.json | ✓ | ✓（但简化） |
| 6 CONTEXT.md (codebase) | ✓ | ✗（不是 codebase mode） |
| 时效注解 | ✓ | ✗ |
| coverage 标签 | ✓ | ✗（W0 不需要，3 文件 1 主题就 100%） |
| 并发 subagent | ✓ | ✗（DeepSeek 串行） |

## 引用约束的强化（关键）

upstream 的"Sources"段是 file-level（"这篇文章引用了 a.md / b.md"），本 PoC 改为**行号级别**：

```markdown
## 出处
- `policy-1.md:23-45` — 失业金标准条款原文
- `policy-1.md:67-72` — 申领材料清单
- `policy-2.md:10-15` — 办理窗口地址
```

为什么？因为 W2 政策问答会用 wiki 给市民答疑，**引用必须能点回原文具体段落**，否则市民/工作人员无法核实，AI 答错政策的风险无法兜底。

D2（引用回链正确性）评分时，会按 file:行号去 source markdown 里抽样核对。
