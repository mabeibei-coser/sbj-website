---
phase: 02-policy-qa
plan: 02
subsystem: qa-foundation
tags: [qa, llm, policy, tdd, security, citations, sanitizer, retrieval]
dependency_graph:
  requires: [02-01]
  provides: [POST /api/qa/answer, lib/qa/*, prompts/qa-answer-*]
  affects: [02-03, 02-04, 02-05, 02-06, 02-07]
tech_stack:
  added: [pg_trgm, word_similarity, GIN index]
  patterns: [三层防护, 显式两次callLlm, TDD RED/GREEN/REFACTOR]
key_files:
  created:
    - lib/qa/config.ts
    - lib/qa/disclaimer.ts
    - lib/qa/citations.ts
    - lib/qa/sanitizer.ts
    - lib/qa/retrieve.ts
    - lib/qa/wiki.ts
    - lib/qa/answer.ts
    - app/api/qa/answer/route.ts
    - prompts/qa-answer-system.md
    - prompts/qa-answer-user-template.md
    - tests/qa/citations.test.ts
    - tests/qa/sanitizer.test.ts
    - tests/qa/retrieve.test.ts
    - tests/qa/answer.test.ts
    - prisma/migrations/20260509010000_pg_trgm_wiki/migration.sql
  modified: []
decisions:
  - "threshold 改为 <= 判定（score 等于阈值视为 miss），确保 score=0.1 时不调 LLM"
  - "regex s 标志不用（TypeScript target ES2017），测试改用 split 切割 disclaimer"
  - "pg_trgm migration 直接用 Prisma $executeRawUnsafe 执行（无 pg 包）"
metrics:
  duration: ~15min
  completed: "2026-05-09"
  tasks_completed: 5
  files_created: 15
---

# Phase 02 Plan 02: QA Foundation Summary

**One-liner**: 三层防护政策问答核心（sanitizer D-13 + pg_trgm 检索 D-08/09 + 白名单 citations D-12）+ 两次显式 callLlm（qa.answer / qa.answer.retry）+ POST /api/qa/answer 完整编排。

## Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 0 | pg_trgm migration | DONE | 3c361b1 |
| 1 | 纯函数层 citations/sanitizer/config/disclaimer (TDD) | DONE | 3c361b1 |
| 2 | retrieve.ts + wiki.ts (TDD) | DONE | 3c361b1 |
| 3a | prompts + answer.ts 编排 | DONE | 3c361b1 |
| 3b | route.ts + answer.test.ts (TDD) | DONE | 3c361b1 |

## Implementation Summary

### 三层防护架构

**第 1 层 — sanitizer.ts (D-13)**
- `detectPromptInjection(question)`: 6 条 INJECTION_PATTERNS regex，命中直接 miss 不调 LLM
  - 覆盖: 忽略上述指令 / Ignore previous instructions / 你现在是 DAN / system: 行首 / pretend you are
- `wrapQuestionXml(question)`: 转义 `&<>` 后用 `<user_question>` 包裹，防 closing tag injection
- `truncateAnswerToLimit(answer, max=1000)`: 按中文句号回退截断，末尾加省略提示

**第 2 层 — retrieve.ts (D-08/D-09)**
- `retrieveTopK(question, kbType, k=3)`: pg_trgm `word_similarity` 主路径 + ILIKE 降级
- SQL 初筛阈值 0.05；caller 按 `QA_CONFIG.RETRIEVAL_THRESHOLD=0.1` 决定 hit/miss（`<= 0.1` 为 miss）
- 降级 fallback score 常量 `ILIKE_FALLBACK_SCORE = 0.5`

**第 3 层 — citations.ts (D-12)**
- `isAllowedCitation(url)`: 白名单 = gov.cn 系政府域名 + `/wiki/policy|biz/<slug>` 本系统路径
- `filterCitations(citations[])`: 返回 `{ kept, dropped }` 两路

### 核心编排 answer.ts

编排顺序:
1. `detectPromptInjection` → miss + audit(injection_blocked)
2. `retrieveTopK` → hits 为空或 score ≤ threshold → miss
3. 第一次 `callLlm({ caller: "qa.answer" })`
4. `filterCitations` → 有 dropped → 第二次 `callLlm({ caller: "qa.answer.retry" })`（含 retry context 提示非白名单引用）
5. 二次 `filterCitations` → kept=[] → partial; kept>0 → hit
6. `truncateAnswerToLimit` + append `QA_DISCLAIMER`
7. `logAudit(action="qa.answer", after={status, citationCount, vendor, retried})`

**BLOCKER 3 关键设计**: 两次 callLlm 显式，caller 不同 → 运营可 `SELECT WHERE caller='qa.answer.retry'` 直接出"所有验证失败重试记录"。

### callLlm caller 使用清单

| caller | 时机 | LlmCallLog 查询 |
|--------|------|-----------------|
| `qa.answer` | 每次正常问答第一次调用 | `WHERE caller='qa.answer'` |
| `qa.answer.retry` | 白名单校验失败后显式第二次调用 | `WHERE caller='qa.answer.retry'` |

### wiki.ts Service

- `listWikiPages(kbType?, titleQuery?)`: kbType 筛选 + title 模糊搜，take 200
- `getWikiPage(id)`: 按 id 查单页
- `getWikiPageBySlug(kbType, slug)`: 按 (kbType, slug) 复合 unique 查
- `updateWikiContent(input)`: **stub**，抛 Error，实现留给 Plan 02-05 admin wiki editor

## TDD Gate Compliance

| Task | RED | GREEN | REFACTOR |
|------|-----|-------|----------|
| Task 1 (citations + sanitizer) | FAIL (module not found) | 22/22 pass | 22/22 pass |
| Task 2 (retrieve) | FAIL (module not found) | 5/5 pass | 5/5 pass |
| Task 3b (answer) | 1 FAIL (threshold bug) | 8/8 pass after fix | 8/8 pass |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 阈值判定符号 < 改为 <=**
- **Found during**: Task 3b RED gate
- **Issue**: `hits[0].score < RETRIEVAL_THRESHOLD` 时 score=0.1 不触发 miss（等于不小于）；plan behavior 期望 score=0.1（等于 threshold）为 miss
- **Fix**: 改为 `hits[0].score <= QA_CONFIG.RETRIEVAL_THRESHOLD`
- **Files modified**: lib/qa/answer.ts
- **Commit**: 3c361b1

**2. [Rule 1 - Bug] 测试 regex /s flag 在 TS target ES2017 报错**
- **Found during**: typecheck after Task 3b
- **Issue**: `/\*以上信息.*/s` dotAll flag 需 ES2018+，项目 target ES2017
- **Fix**: 改为 `r.answer.split("*以上信息")[0]`
- **Files modified**: tests/qa/answer.test.ts
- **Commit**: 3c361b1

**3. [Rule 1 - Bug] meta.ip 类型 `string | null` 不匹配 AnswerInput.ip `string | undefined`**
- **Found during**: typecheck after Task 3b
- **Fix**: `meta.ip ?? undefined`
- **Files modified**: app/api/qa/answer/route.ts
- **Commit**: 3c361b1

**4. [Rule 3 - Blocking] pg 包不存在，改用 Prisma `$executeRawUnsafe`**
- **Found during**: Task 0 migration execution
- **Issue**: 项目无 pg 包，计划用 psql CLI 也不在 PATH
- **Fix**: 用 `prisma.$executeRawUnsafe()` 直接执行 migration SQL（等效）
- **Files modified**: none（runtime action，migration.sql 已创建）
- **Commit**: 3c361b1

## Retrieval Scheme Note

已改用 `pg_trgm` 字符三元组（autoplan B1 修正）：
- SQL 内 0.05 初筛，caller 按 0.1 决定 hit/miss
- GIN 索引 `wiki_pages_content_trgm` 已建立（Task 0）
- 30 篇量级性能无忧（GIN 极快）
- 后续如需更细粒度中文分词可加 zhparser 或 jieba 扩展

## Known Stubs

| File | Line | Stub | Resolved by |
|------|------|------|-------------|
| lib/qa/wiki.ts | updateWikiContent | throws "实现见 Plan 02-05" | Plan 02-05 admin wiki editor |

## Test Results

- 新增 qa 测试: 35 (citations 12 + sanitizer 10 + retrieve 5 + answer 8)
- 全部 unit tests: **67/67 passed**
- TDD gate: Task 1/2/3b 均有 RED → GREEN → REFACTOR 留痕

## Self-Check: PASSED

- [x] lib/qa/config.ts exists, contains RETRIEVAL_THRESHOLD, FALLBACK_PHRASE_MISS, 63011095
- [x] lib/qa/disclaimer.ts exists, contains QA_DISCLAIMER, 63011095
- [x] lib/qa/citations.ts exports isAllowedCitation, filterCitations, gov.cn regex present
- [x] lib/qa/sanitizer.ts exports detectPromptInjection, wrapQuestionXml, truncateAnswerToLimit
- [x] lib/qa/retrieve.ts contains server-only, retrieveTopK, word_similarity, ILIKE fallback
- [x] lib/qa/wiki.ts contains server-only, listWikiPages, getWikiPage, getWikiPageBySlug, updateWikiContent stub
- [x] lib/qa/answer.ts contains answerQuestion, "qa.answer", "qa.answer.retry", all 6 hooks
- [x] app/api/qa/answer/route.ts exports POST, Zod schema, consent check, catch fallback
- [x] prompts/qa-answer-system.md contains 引用必须真实可追溯, ≤ 1000 中文字符, <user_question>
- [x] prompts/qa-answer-user-template.md contains {{kbType}}, {{retrievedBlocks}}, {{userQuestionXml}}
- [x] commit 3c361b1 exists
- [x] 67 unit tests pass
