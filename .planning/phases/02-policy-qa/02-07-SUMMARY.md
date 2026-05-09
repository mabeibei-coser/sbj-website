---
phase: 02-policy-qa
plan: "07"
subsystem: e2e
tags: [e2e, playwright, qa, admin, wiki, mock]
dependency_graph:
  requires: [02-04, 02-05, 02-06]
  provides: [e2e-qa-citizen, e2e-qa-admin-wiki]
  affects: [phase-2-verification]
tech_stack:
  added: []
  patterns: [page.route-mock, describe.serial, beforeAll-seed, test.skip-graceful]
key_files:
  created:
    - e2e/qa-citizen.spec.ts
    - e2e/qa-admin-wiki.spec.ts
    - e2e/fixtures/seed-wiki.ts
  modified:
    - lib/mocks/llm-mocks.ts
decisions:
  - "e2e 用 page.route() 拦截 /api/qa/answer，不依赖真 LLM 或 DB seed（选最轻量稳定方案）"
  - "seed-wiki.ts 用 PrismaClient 直连 DB；DB 不可达时 graceful return null，test 6 用 test.skip 跳过"
  - "qa.answer mock fixture 升级为 hit 档首条 + 独立 miss/partial 命名 key（不改 getMockResponse 签名）"
metrics:
  duration: "~10 min"
  completed: "2026-05-09T02:52:56Z"
  tasks_completed: 3
  files_changed: 4
requirements: [QA-01, QA-04, QA-05, QA-06, QA-07, QA-08, QA-12]
---

# Phase 2 Plan 07: E2E Playwright 双 spec + WikiPage fixture Summary

## One-liner

Playwright e2e 覆盖市民端政策问答 10 用例（page.route mock）+ admin wiki 6 用例（DB fixture 种入/清理），Phase 2 整体 verification 闭环。

## What Was Built

### Task 1 — lib/mocks/llm-mocks.ts 扩展

`qa.answer` 首条更新为 hit 档（失业保险金 + `/wiki/policy/unemployment-insurance` 引用 + 63011095 免责）；新增两个命名 key：

- `qa.answer.mock.miss`：中山南一路 555 号 + 63011095 miss 档
- `qa.answer.mock.partial`：partial 档（无合规引用兜底）

不改 `getMockResponse` 签名，不破坏已有 83 tests + llm-eval PASSED。

### Task 2 — e2e/qa-citizen.spec.ts（10 个市民端用例）

| # | 用例 | mock 策略 |
|---|------|-----------|
| 1 | /qa 加载，policy Tab 默认 active | 真打 backend |
| 2 | 切 biz Tab → URL ?kb=biz + 刷新保持 | 真打 backend |
| 3 | 3 个热点 cards 显示 + Q1 展开 | 真打 backend（读 content/qa-hot/*.md）|
| 4 | hit：失业保险金 → 已命中 badge + 引用 + 63011095 | page.route() mock |
| 5 | miss：今天天气 → 未命中 badge + 中山南一路 + 63011095 | page.route() mock |
| 6 | prompt injection → 未命中，不暴露 LLM 名 | page.route() mock |
| 7 | char counter：ABC → 3/500 | 纯前端，无 API |
| 8 | 不存在 slug → 404 | 真打 backend |
| 9 | 非法 kbType → 404 | 真打 backend |
| 10 | GET /api/qa/hot 端点直测 schema + q3 含黄浦创卡（WRN 7 fix）| request.get |

### Task 3 — e2e/qa-admin-wiki.spec.ts（6 个 admin 用例）+ e2e/fixtures/seed-wiki.ts

**鉴权用例（always on，CI 默认跑）：**
1. 未登录 /admin/wiki → 跳 /admin/login?next=%2Fadmin%2Fwiki
2. 未登录 PUT /api/admin/wiki/test-id → 401
3. 未登录 GET /api/admin/wiki → 401

**编辑流程（需要 ADMIN_PASSWORD env）：**
4. /admin/wiki 列表页：h1 + 筛选链接（全部/政策/创业）+ 表头（标题列）
5. 切政策筛选链接 → URL ?kb=policy 同步
6. 编辑 fixture page → 保存 → "已保存 → v2"（WRN 9 fix）

**seed-wiki.ts**：
- `seedWikiFixture()` — deleteMany slug=e2e-fixture-policy 后 create，返回 `{wikiPageId, slug, initialContent}`
- `cleanupWikiFixture()` — deleteMany + $disconnect
- DB 不可达时 catch → console.warn + return null；test 6 用 `test.skip(!fixture)` 跳过

## npm test 跑通范围

| 命令 | 结果 |
|------|------|
| `npm run test:unit` | 83 tests PASSED |
| `npm run llm-eval` | PASSED (mock mode, 30/50 counted) |
| `npm run typecheck` | exit 0 |
| `npx playwright test e2e/qa-admin-wiki.spec.ts -g "鉴权"` | 3 个鉴权 test CI 默认跑通（不需 env） |
| `npx playwright test e2e/qa-citizen.spec.ts` | 需要 dev server + content/qa-hot/*.md 存在 |

## W0 完成后用户 acceptance 步骤

1. `docker compose up -d && prisma db push`
2. `npm run wiki:compile -- --kb=policy --sources=knowledge/policy-sources --publish`
3. `.env.local` 配 `ADMIN_PASSWORD=...`
4. `npm run test:e2e` — 预期全过（鉴权 3 条 always；citizen 10 条需 dev server；admin 编辑 3 条需 DB）
5. `npm run llm-eval:real` — 跑 50 题真 LLM，accuracy + citationRate ≥ 80%

## Phase 2 整体 verification 闭环

- Phase 2 success criteria #1（API 端点正确返回）→ test 4/5/6/10 覆盖
- Phase 2 success criteria #2（admin 鉴权生效）→ test 1/2/3 覆盖
- Phase 2 success criteria #3（admin 编辑保存版本）→ test 6 覆盖
- Phase 2 success criteria #4（不依赖真 LLM 跑 CI）→ page.route() 模式覆盖

## Deviations from Plan

None — plan executed exactly as written.

- Task 1: lib/mocks/llm-mocks.ts 三档 fixture 按 promptHash 命名 key，不改签名（plan 推荐轻量方案）
- Task 2: 10 个 test 全实现（含 WRN 7 fix 的 /api/qa/hot 直测）
- Task 3: seed-wiki.ts + spec 6 个 test，DB 不可达 graceful skip（WRN 9 fix）

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-02-24 已缓解 | e2e/qa-admin-wiki.spec.ts | ADMIN_PASSWORD 通过 `process.env` 读取，不写死；空时整组 skip |
| T-02-25 已缓解 | e2e/qa-citizen.spec.ts | page.route() 拦截所有 /api/qa/answer 调用，不触发真 LLM |
| T-02-26 已知 accept | e2e/fixtures/seed-wiki.ts | test 6 在真 DB 上 create + update fixture 行；e2e 只在 dev DB 跑 |

## Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1 | 5608f0a | feat(02-07): 扩 lib/mocks/llm-mocks.ts — qa.answer 三档 fixture |
| Task 2 | 89591c9 | feat(02-07): e2e/qa-citizen.spec.ts — 市民端政策问答 10 个用例 |
| Task 3 | db46833 | feat(02-07): e2e/qa-admin-wiki.spec.ts + fixtures/seed-wiki.ts — admin wiki 6 个用例 |

## Self-Check

- [x] `e2e/qa-citizen.spec.ts` 存在，含 10 个 test
- [x] `e2e/qa-admin-wiki.spec.ts` 存在，含 6 个 test
- [x] `e2e/fixtures/seed-wiki.ts` 存在，含 seedWikiFixture + cleanupWikiFixture
- [x] `lib/mocks/llm-mocks.ts` 已更新（qa.answer hit 档 + miss + partial 两个新 key）
- [x] `npm run test:unit` → 83 tests PASSED
- [x] `npm run llm-eval` → PASSED
- [x] `npm run typecheck` → exit 0
- [x] commits 5608f0a, 89591c9, db46833 均存在
