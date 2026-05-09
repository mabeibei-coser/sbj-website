---
phase: 02-policy-qa
plan: "03"
subsystem: qa
tags: [hot-questions, preset-answer, no-llm, tdd, file-io]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [content/qa-hot/*.md, lib/qa/hot-questions.ts, app/api/qa/hot/route.ts]
  affects: [02-04-hot-cards-ui]
tech_stack:
  added: []
  patterns:
    - "手写 frontmatter parser（regex，不引入 gray-matter）"
    - "module-scope cache + __resetXxxForTest 测试重置模式"
    - "vi.mock('node:fs/promises') Vitest 单元测试模式"
key_files:
  created:
    - content/qa-hot/q1.md
    - content/qa-hot/q2.md
    - content/qa-hot/q3.md
    - lib/qa/hot-questions.ts
    - app/api/qa/hot/route.ts
    - tests/qa/hot-questions.test.ts
  modified: []
decisions:
  - "frontmatter 用手写 regex 解析，避免引入 gray-matter 依赖（plan 既定）"
  - "module-scope cache 使 getHotQuestions() 第二次调用不读 IO（process 重启失效，dev hot reload 前调 __resetHotCacheForTest）"
  - "route.ts 错误信息固定为'热点暂时不可用'，不暴露 err.message（T-02-10 信息泄露防护）"
metrics:
  duration: "~6 min"
  completed_date: "2026-05-09"
  tasks_completed: 3
  files_created: 6
---

# Phase 2 Plan 03: hot-questions 预设答案 + GET API Summary

**一句话总结**：3 个人工编辑预设答案 .md（摘自 PoC source 原文）+ 文件解析 service + GET /api/qa/hot 路由，全程 0 LLM 调用，4 个单元测试全部通过，总测试数从 67 增至 71。

## 任务执行情况

| Task | 名称 | Commit | 状态 |
|------|------|--------|------|
| 1 | 写 3 个热点 .md 文件 | ba30b27 | DONE |
| 2 | hot-questions service + TDD | fd8ff99 | DONE |
| 3 | GET /api/qa/hot 路由 | 363c623 | DONE |

## 内容文件统计

| 文件 | 字符数（含标点） | 引用数 | 占位符数 |
|------|-----------------|--------|---------|
| content/qa-hot/q1.md | ~2674 chars | 2 个 source | 0 |
| content/qa-hot/q2.md | ~2780 chars | 2 个 source | 1（q2 申请流程待审校）|
| content/qa-hot/q3.md | ~2631 chars | 1 个 source | 0 |

### 占位符位置清单

- **q2.md — "申请流程"段**：`_<待用户/家人审校：申请流程及所需材料>_`
  - 原因：ji-she-kong-jian.md source 中未包含入驻申请流程说明，无法摘录
  - 数据来源不足处：q2 "## 基地名单" 提及 16 家中 source 仅提供 9 家，注释已标明

### 数据来源摘录说明

- **q1.md**：从 `chuangka-shouce.md`（行 35-101）摘取创卡补贴 / 融资支持 / 落地补贴；从 `jiu-zheng-ce-2.md`（行 28-40）摘取合伙创业 / 重点就业群体定义
- **q2.md**：从 `ji-she-kong-jian.md`（行 20-410）摘取 9 家基地名单、工位补贴金额；从 `chuangka-shouce.md` 补充孵化补贴
- **q3.md**：从 `chuangka-shouce.md`（行 1-101）完整摘取 4 大类福利（场地 / 创卡补贴 / 融资 / 落地）

## service 关键行为

### 缓存行为

`getHotQuestions()` 使用模块级 `cache` 变量：
- 第一次调用：并发读 3 个文件（`Promise.all`），写入 cache
- 第二次调用：直接返回 cache，不读文件（单测 `readFile` 调用次数 = 3 验证）
- 进程重启 / dev hot reload：cache 失效，下次调用重新读文件
- 测试重置：`__resetHotCacheForTest()` 清零 cache

### frontmatter 解析

手写 regex，支持：
- 标量：`key: value`
- 数组：`key:` 后跟缩进 `  - item` 行（用于 sources 字段）
- frontmatter 缺失时 fallback：title=id，citations=[]，updatedAt=""

## API 错误降级路径

```
GET /api/qa/hot
  └─ getHotQuestions()
       ├─ 成功 → 200 { items: [q1, q2, q3] }
       └─ 文件丢失 / 解析异常
            → console.error("[qa/hot] failed:", err)  // 仅在 server log 输出，不暴露给客户端
            → 500 { items: [], error: "热点暂时不可用" }  // 固定文案，T-02-10
```

## 单测覆盖

**tests/qa/hot-questions.test.ts** — 4 个 it 全部通过：

| # | 测试描述 | 验证点 |
|---|---------|--------|
| 1 | 解析 3 个文件返回结构化对象（按 q1/q2/q3 顺序） | id / title / citations / updatedAt / body 字段 |
| 2 | frontmatter 缺失时 fallback 用 id 当 title | title=id，citations=[] |
| 3 | readFile 抛错时整体 throw | rejects.toThrow("ENOENT") |
| 4 | 第二次调用走 cache 不再读文件 | readFile.toHaveBeenCalledTimes(3) |

**整体测试计数**：71 tests passing（67 原有 + 4 新增）

## TDD Gate Compliance

- RED gate: `Cannot find module '@/lib/qa/hot-questions'` — 确认为 RED 状态
- GREEN gate: `4 passed` — 最小实现通过所有 it
- REFACTOR gate: typecheck exit 0，71 tests 仍全部通过

## 0 LLM 验证

```
grep -r "callLlm|llm-client" app/api/qa/hot/ lib/qa/hot-questions.ts content/qa-hot/
→ 无匹配（0 refs）
```

项目"绝不允许 AI 编造政策"硬约束在本 plan 完整落地：
- 内容文件：人工从 PoC source 摘录原文
- service：纯文件 I/O，无 LLM 调用
- API：调 service，无 LLM 调用

## 已知后续事项

1. **Q2 申请流程补全**：`content/qa-hot/q2.md` 中入驻申请流程段（1 个占位符）需要用户/家人在 W2 Demo 前补全。数据应来自黄浦区就业促进中心官方说明或申请表格。
2. **Q3 验证**：q3.md 的 9 项福利基于 chuangka-shouce.md PDF 转 md 版本，建议用户对照原始 PDF 手册逐项确认数字金额（尤其是融资上限金额）。
3. **UI 对接**：02-04 plan 的 `hot-cards.tsx` 将消费 `GET /api/qa/hot`，接口已就绪。

## 偏差记录

**无偏差**——本 plan 按计划执行：
- 3 个 .md 文件全部从 PoC source 原文摘录，未 LLM 生成
- TDD 严格按 RED → GREEN → REFACTOR 执行
- 0 新依赖引入（frontmatter 手写 regex）

## Self-Check: PASSED

- content/qa-hot/q1.md: EXISTS
- content/qa-hot/q2.md: EXISTS
- content/qa-hot/q3.md: EXISTS
- lib/qa/hot-questions.ts: EXISTS
- app/api/qa/hot/route.ts: EXISTS
- tests/qa/hot-questions.test.ts: EXISTS
- commit ba30b27: EXISTS (Task 1)
- commit fd8ff99: EXISTS (Task 2)
- commit 363c623: EXISTS (Task 3)
- 71 tests passing: VERIFIED
