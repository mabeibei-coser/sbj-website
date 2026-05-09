---
phase: 02-policy-qa
plan: "06"
subsystem: llm-eval
tags: [testing, golden-questions, mock, tdd, ci-gate]
dependency_graph:
  requires: [02-02]
  provides: [llm-eval-pipeline, golden-50-questions, mock-fixtures]
  affects: [CI, QA-11]
tech_stack:
  added: []
  patterns: [TDD-RED-GREEN-REFACTOR, mock-fixture-routing, threshold-gate]
key_files:
  created:
    - tests/llm-eval/golden-questions.json
    - tests/llm-eval/run.test.ts
    - tests/llm-eval/vitest.config.ts
    - tests/llm-eval/results/.gitkeep
    - .planning/phases/02-policy-qa/USER_OWN_GOLDEN_QUESTIONS.md
  modified:
    - tests/llm-eval/run.ts
    - lib/mocks/llm-mocks.ts
    - vitest.config.ts
decisions:
  - "run.test.ts 用独立 vitest.config.ts 跑，同时去掉根 vitest.config 的 exclude 让 test:unit 也覆盖"
  - "hasUserTodo 用三条件判断：question=placeholder OR slug=placeholder OR (user_own category AND 空keywords)"
  - "checkCitations 优先 expectedSourceSlug，兼容 Phase1 expectedCitationDomains，miss题默认通过"
metrics:
  duration: "~20min"
  completed: "2026-05-09"
  tasks_completed: 2
  files_changed: 8
---

# Phase 2 Plan 06: llm-eval 50题 golden + mock/real双模式 + 阈值卡死 Summary

**一句话**：50题 golden-questions.json 落地（5热点+10细节+5诱导+5注入+5无关+20占位），run.ts 双模式(mock/REAL_LLM=1) + accuracy/citation 阈值80%卡死，mock模式CI 100% PASSED。

## 50题 category 分布

| Category    | 数量 | expectedStatus | 说明                     |
|-------------|------|----------------|--------------------------|
| hot         | 5    | hit            | 热点政策问题，验证检索阈值 |
| detail      | 10   | hit            | 政策具体细节（金额/流程） |
| fabrication | 5    | miss           | 诱导编造，验证不编造      |
| injection   | 5    | miss           | prompt injection 防护验证 |
| irrelevant  | 5    | miss           | 无关问题兜底验证          |
| user_own    | 20   | miss（占位）   | 用户HR专业题，D-20待填    |
| **合计**    | **50** |              |                          |

## mock 模式 PASS 率

- **totalCounted**: 30（20题 USER TODO → skipped）
- **accuracy**: 100.0%（keyword match）
- **citationRate**: 100.0%（slug match）
- **skipped**: 20
- **exit code**: 0（PASSED）

## run.ts 阈值常量

```typescript
const ACCURACY_THRESHOLD = 0.8;  // 80%
const CITATION_THRESHOLD = 0.8;  // 80%
```

低于任一阈值 → `process.exit(1)`（CI 失败）。

## TDD Gate Compliance

- **RED gate**: `tests/llm-eval/run.test.ts` 写完后，Phase1 skeleton 无 exports → 9 FAIL（confirmed）
- **GREEN gate**: run.ts 整文件覆盖后，9 tests PASS + `npm run llm-eval` exit 0
- **REFACTOR gate**: vitest.config.ts 更新后，`npm run test:unit` 83 passed，`npm run typecheck` exit 0

## USER_OWN 填空进度

- **已填**: 0/20
- **状态**: 20题全部 `<USER TODO>` 占位，run.ts 会 skip 并 warn
- **下一步**: 用户按 USER_OWN_GOLDEN_QUESTIONS.md 指引填写，推荐覆盖创卡4大福利/孵化基地/就业补贴5类/劳动权益

## 已知阻塞

- **REAL_LLM 模式**：需要 W0 完成（DATABASE_URL + 真 LLM key + 已 publish 的 WikiPage 数据）；`npm run llm-eval:real` 由开发者本地 W0 后手动跑
- **USER_OWN 20题**：CI 仍 PASSED（30题mock通过），但 citationRate 和 accuracy 仅基于 30题计算；填完20题后需补 mock fixture 或直接用 REAL_LLM 模式跑

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest.config.ts 将 tests/llm-eval/** 全部 exclude**
- **Found during**: Task 2 RED phase
- **Issue**: `npx vitest run tests/llm-eval/run.test.ts` 显示 "No test files found"，因为根 vitest.config 有 `exclude: ["tests/llm-eval/**"]`
- **Fix**: 
  1. 新建 `tests/llm-eval/vitest.config.ts` 专用配置（用于独立跑 llm-eval tests）
  2. 修改根 `vitest.config.ts` 去掉 `tests/llm-eval/**` exclude，让 `npm run test:unit` 也覆盖 run.test.ts
- **Files modified**: vitest.config.ts, tests/llm-eval/vitest.config.ts（new）
- **Result**: test:unit 从 74 增到 83 passed（+9 helper tests）

## Self-Check

- [x] `tests/llm-eval/golden-questions.json` 存在，长度50
- [x] `tests/llm-eval/run.ts` 含 `process.exit(1)` + `REAL_LLM` + `answerQuestion` + `ACCURACY_THRESHOLD = 0.8`
- [x] `tests/llm-eval/run.test.ts` 存在（9 tests）
- [x] `.planning/phases/02-policy-qa/USER_OWN_GOLDEN_QUESTIONS.md` 存在
- [x] `lib/mocks/llm-mocks.ts` 含 30个 qa-policy- fixture
- [x] `npm run llm-eval` exit 0，输出 "Mode: mock" + "PASSED"
- [x] `npm run typecheck` exit 0
- [x] `npm run test:unit` 83 passed（≥75）
- [x] Task1 commit: 40089f0
- [x] Task2 commit: 83842d2
