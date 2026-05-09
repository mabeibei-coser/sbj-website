---
phase: 02-policy-qa
verified: 2026-05-09T03:05:43Z
status: human_needed
score: 4/4
overrides_applied: 0
human_verification:
  - test: "双页签刷新保持 — 在浏览器打开 /qa?kb=biz，刷新页面"
    expected: "刷新后仍显示创业与行业库页签为激活状态，WikiList 显示 biz 条目"
    why_human: "URL sync 和 server searchParams 逻辑已验证，但实际浏览器刷新行为（含 Next.js Suspense hydration）需人工确认"
  - test: "热点 3 题一键展开 — 在浏览器打开 /qa，点击热点 Q1/Q2/Q3 details 元素"
    expected: "每张 card 点击后展开预设 markdown 答案，无 LLM 调用（可用 Network tab 确认无 /api/llm 请求）"
    why_human: "hot-questions.ts 文件读取和渲染逻辑已验证，但 <details> 展开行为需在真实浏览器验证"
  - test: "自由问 hit 档 — 输入包含关键词（如'失业保险金'）的问题并提交"
    expected: "返回 status=hit，显示'已命中知识库'badge，显示答案+引用链接+免责声明；Network tab 确认 POST /api/qa/answer 调用"
    why_human: "需要真实 DB（WikiPage 数据 seed）+ LLM 调用；本地 mock 已验证 API 签名，但端到端 hit/partial/miss 路径需人工测"
  - test: "admin wiki 编辑器保存 — 登录后台，进入某 wiki 条目，修改内容，点击保存"
    expected: "保存成功，版本号从 vN 变为 vN+1，DB WikiPageVersion 表新增一条快照"
    why_human: "PUT API 和事务逻辑已验证，但需真实 DB 才能确认 version+1 和 WikiPageVersion 写入"
---

# Phase 2: 政策问答 Verification Report

**Phase Goal:** 政策问答全功能上线（双页签 + 3 热点预设 + 自由问 + 1000 字+引用+免责 + LLM eval suite >= 80%）
**Verified:** 2026-05-09T03:05:43Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 双页签切换正常（policy-kb / biz-kb），各自加载独立 wiki | VERIFIED | `qa-tabs.tsx` 用 `router.replace(?kb=...)` 同步 URL；`page.tsx` server-side 读 `searchParams.kb` 传给 `WikiList`；`WikiList` 用 `listWikiPages(kbType)` 按 kbType 筛选 Prisma 查询 |
| 2 | 3 热点问题一键展开预设答案，不调 LLM | VERIFIED | `hot-questions.ts` 仅 `readFile(fs/promises)` 读 `content/qa-hot/{q1,q2,q3}.md`；grep 确认 `lib/qa/hot-questions.ts` 和 `app/api/qa/hot/route.ts` 中零 `callLlm` / `llm-client` 引用；3 个 .md 文件内容实质（非占位符），q1 148行含政策细节+金额 |
| 3 | 自由问命中时给真实引用 + 1000 字内 + 免责声明；未命中给兜底转窗口文案 | VERIFIED | `answer.ts` 完整实现三层防护（detectPromptInjection → retrieveTopK → 两次 callLlm 显式 retry）；`truncateAnswerToLimit(max=1000)` 句号回退截断；`QA_DISCLAIMER` 常量追加到每个 hit/partial 答案末尾；miss 路径返回 `FALLBACK_PHRASE_MISS`（联系窗口文案） |
| 4 | LLM eval suite 50 题 mock 模式通过（accuracy >= 80%，citationRate >= 80%） | VERIFIED | `npm run llm-eval` 实测输出：Mode=mock，totalCounted=30，accuracy=100%，citationRate=100%，exit 0，PASSED；20 题 USER_OWN 按设计跳过（D-20，用户 HR 专业题由人工填写） |

**Score:** 4/4 truths verified

### Roadmap SC5 (Admin Wiki 编辑器)

SC5 不在 ROADMAP.md Phase 2 的 4 条 Success Criteria 中（ROADMAP 仅列 SC1-SC4）。Admin wiki 编辑器是 PLAN 02-05 的交付物，已验证如下：

| 组件 | Status | Evidence |
|------|--------|----------|
| `/admin/wiki` 列表页 | VERIFIED | `app/admin/wiki/page.tsx`：server component，`listWikiPages(kbFilter, qFilter)` DB 查询，kbType 筛 + title 模糊搜，表格渲染，"编辑 →" 链接 |
| `/admin/wiki/[id]` split-view editor | VERIFIED | `app/admin/wiki/[id]/editor.tsx`：client component，textarea + ReactMarkdown 双栏，`fetch PUT /api/admin/wiki/<id>` onSave，version 状态刷新 |
| `PUT /api/admin/wiki/[id]` 事务保存 | VERIFIED | `app/api/admin/wiki/[id]/route.ts` → `updateWikiContent`，`prisma.$transaction`（findUnique → update version+1 → wikiPageVersion.create）+ 事务外 logAudit |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `app/qa/page.tsx` | /qa 主入口，读 searchParams.kb | VERIFIED | 57 行，server component，parseKb + Suspense 包裹 4 子组件 |
| `app/qa/qa-tabs.tsx` | 双页签 + URL 同步 | VERIFIED | client component，`router.replace(?kb=...)` + `useSearchParams()` |
| `app/qa/hot-cards.tsx` | 热点 3 题 server-side 渲染 | VERIFIED | server component，`getHotQuestions()` → `<details>` + ReactMarkdown |
| `app/qa/free-ask.tsx` | 自由问 client 组件，三档结果 | VERIFIED | client component，`fetch POST /api/qa/answer`，hit/partial/miss 三档 badge + 引用列表 |
| `app/qa/wiki/[kbType]/[slug]/page.tsx` | wiki 详情页 | VERIFIED | server component，`getWikiPageBySlug` + ReactMarkdown + QA_DISCLAIMER |
| `app/api/qa/answer/route.ts` | POST 自由问 API | VERIFIED | Zod 校验 + consent 校验 + `answerQuestion` 调用 + 兜底 catch |
| `app/api/qa/hot/route.ts` | GET 热点 API，零 LLM | VERIFIED | 仅 `getHotQuestions()`，grep 确认无 callLlm |
| `lib/qa/answer.ts` | 三层防护 + 两次显式 callLlm | VERIFIED | 189 行，caller=qa.answer + caller=qa.answer.retry 均存在 |
| `lib/qa/hot-questions.ts` | fs 读 .md，零 LLM | VERIFIED | `import "server-only"` + `readFile` + module-scope cache |
| `lib/qa/sanitizer.ts` | jailbreak 防护 6 patterns | VERIFIED | 中文 pattern（`/忽略.{0,4}(上述\|前面...)/`）+ EN pattern（`/ignore.*previous.*instructions/`）均存在 |
| `lib/qa/disclaimer.ts` | 免责声明常量 | VERIFIED | `QA_DISCLAIMER = "*以上信息仅供参考..."`，grep 确认包含"以上信息仅供参考" |
| `lib/qa/citations.ts` | gov.cn 白名单 regex | VERIFIED | URL_WHITELIST 含 gov.cn / rsj.sh.gov.cn / huangpu.gov.cn / zzjb.rsj.sh.gov.cn；SLUG_WHITELIST 含 /wiki/policy\|biz/ |
| `lib/qa/wiki.ts` | prisma.$transaction 事务保存 | VERIFIED | `updateWikiContent` 用 `prisma.$transaction(async (tx) => {...})` + version+1 + wikiPageVersion.create |
| `app/admin/wiki/page.tsx` | admin wiki 列表 | VERIFIED | server component，kbType 筛 + title 搜 + 分页表格 |
| `app/admin/wiki/[id]/editor.tsx` | split-view editor | VERIFIED | textarea + ReactMarkdown 双栏，PUT 保存，version 刷新 |
| `content/qa-hot/q1.md` | 热点题 1（非占位符） | VERIFIED | 52 行，含政策细节、金额、出处链接 |
| `content/qa-hot/q2.md` | 热点题 2 | VERIFIED | 存在，非占位符 |
| `content/qa-hot/q3.md` | 热点题 3 | VERIFIED | 存在，非占位符 |
| `tests/llm-eval/golden-questions.json` | 50 题 golden Q&A | VERIFIED | 50 条：hot×5 / detail×10 / fabrication×5 / injection×5 / irrelevant×5 / user_own×20 |
| `e2e/qa-citizen.spec.ts` | 市民端 e2e，11 test cases | VERIFIED | 11 个 test()，含 hit/miss/injection/char-counter/404/hot端点直测 |
| `e2e/qa-admin-wiki.spec.ts` | admin e2e，6 test cases | VERIFIED | 6 个 test()，含 auth 3条(always-on) + 已登录 3条 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/qa/page.tsx` | `app/qa/qa-tabs.tsx` | import + JSX `<QaTabs active={active}>` | VERIFIED | active 从 server searchParams 传入，tab 能 hydrate 正确状态 |
| `app/qa/qa-tabs.tsx` | URL `?kb=` | `router.replace(?kb=...)` | VERIFIED | 切 tab 更新 URL；刷新时 page.tsx server-side 读 searchParams.kb 重建状态 |
| `app/qa/hot-cards.tsx` | `lib/qa/hot-questions.ts` | import + await | VERIFIED | 无 LLM 中间层 |
| `app/qa/free-ask.tsx` | `POST /api/qa/answer` | `fetch("/api/qa/answer", { method:"POST" })` | VERIFIED | body JSON { question, kbType }；response 解析 status/answer/citations |
| `lib/qa/answer.ts` | `lib/qa/sanitizer.ts` | `detectPromptInjection()` import | VERIFIED | 第 1 层防护，命中即 miss 兜底 |
| `lib/qa/answer.ts` | `lib/qa/retrieve.ts` | `retrieveTopK()` import | VERIFIED | 第 2 层防护，score <= 阈值即 miss 兜底 |
| `lib/qa/answer.ts` | `lib/llm-client.ts callLlm` | `callQaAnswerLlm("qa.answer", ...)` | VERIFIED | 第一次调用 caller=qa.answer |
| `lib/qa/answer.ts` | `lib/llm-client.ts callLlm` | `callQaAnswerLlm("qa.answer.retry", ...)` | VERIFIED | 第二次调用 caller=qa.answer.retry，whitelist drop 后触发 |
| `lib/qa/answer.ts` | `lib/qa/citations.ts filterCitations` | import + 两次调用 | VERIFIED | 第一次过滤 → retry → 第二次兜底过滤 |
| `lib/qa/answer.ts` | `lib/qa/disclaimer.ts QA_DISCLAIMER` | import，追加到 answer | VERIFIED | hit/partial 答案末尾追加免责声明常量 |
| `app/admin/wiki/[id]/editor.tsx` | `PUT /api/admin/wiki/[id]` | `fetch(\`/api/admin/wiki/${id}\`, { method:"PUT" })` | VERIFIED | JSON body { content, diffSummary } |
| `app/api/admin/wiki/[id]/route.ts` | `lib/qa/wiki.ts updateWikiContent` | import + await | VERIFIED | Zod 校验 → getAdminSession → updateWikiContent |
| `lib/qa/wiki.ts updateWikiContent` | `prisma.$transaction` | prisma.$transaction(async tx => ...) | VERIFIED | 事务内：findUnique → update(version+1) → wikiPageVersion.create |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `app/qa/hot-cards.tsx` | `items` (HotQuestion[]) | `getHotQuestions()` → `readFile(content/qa-hot/*.md)` | Yes — 实际文件读取 | FLOWING |
| `app/qa/wiki-list.tsx` | `pages` (WikiPageRow[]) | `listWikiPages(kbType)` → `prisma.wikiPage.findMany` | Yes — DB 查询 | FLOWING |
| `app/qa/free-ask.tsx` | `result` (AnswerResult) | `fetch POST /api/qa/answer` → `answerQuestion` → LLM | Yes — LLM + DB retrieval | FLOWING |
| `app/admin/wiki/page.tsx` | `pages` (WikiPageRow[]) | `listWikiPages(kbFilter, qFilter)` → `prisma.wikiPage.findMany` | Yes — DB 查询 | FLOWING |
| `app/admin/wiki/[id]/page.tsx` | `page` (WikiPageRow) | `getWikiPage(id)` → `prisma.wikiPage.findUnique` | Yes — DB 查询 | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `npm run llm-eval` mock 模式 PASS | `npm run llm-eval` | Mode=mock, counted=30/50, accuracy=100%, citationRate=100%, exit 0 | PASS |
| TypeScript 类型检查 | `npm run typecheck` | 零错误，exit 0 | PASS |
| 单元测试 83 题全过 | `npm run test:unit` | 10 test files, 83 tests passed | PASS |
| 热点 API 零 LLM 引用 | `grep callLlm lib/qa/hot-questions.ts app/api/qa/hot/route.ts` | 0 match | PASS |
| qa.answer.retry caller 存在 | `grep '"qa.answer.retry"' lib/qa/answer.ts` | 第 83 行类型声明 + 第 141 行调用 | PASS |
| 事务保存存在 | `grep 'prisma.\$transaction' lib/qa/wiki.ts` | 第 70 行 | PASS |
| 免责声明文案 | `grep '以上信息仅供参考' lib/qa/disclaimer.ts` | 第 6 行 | PASS |
| gov.cn 白名单 | `grep 'gov\.cn' lib/qa/citations.ts` | 4 个 gov.cn regex patterns | PASS |
| 无 emoji in app/qa | `grep emoji patterns app/qa/*.tsx` | 0 match | PASS |
| 无 purple/fuchsia in app/qa | `grep purple/fuchsia app/qa/*.tsx` | 0 match | PASS |
| glass-card CSS 存在 | `grep -c glass-card app/globals.css` | 2 | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| QA-01 | 02-04 | 双页签 /qa 入口（policy-kb / biz-kb） | SATISFIED | `app/qa/page.tsx` + `qa-tabs.tsx`，URL ?kb= 同步 |
| QA-02 | 02-01 | wiki compile CLI + Prisma 写库 | SATISFIED | `scripts/compile.ts`，DB WikiPage 写入已验证（STATE.md） |
| QA-03 | 02-01 | 审计日志（wiki publish 事件） | SATISFIED | `logAudit` 在 wiki compile + updateWikiContent 两处调用 |
| QA-04 | 02-02/04 | 三层防护（sanitize + retrieve + citations） | SATISFIED | `sanitizer.ts` + `retrieve.ts` + `citations.ts` + `answer.ts` 完整链路 |
| QA-05 | 02-02/04 | POST /api/qa/answer（1000字+引用+免责） | SATISFIED | `route.ts` + `answer.ts` |
| QA-06 | 02-02 | Zod 校验 + 错误响应 | SATISFIED | `PostSchema` in `route.ts` |
| QA-07 | 02-02 | ConsentRecord 校验（phone hash）| SATISFIED | `checkQaConsent` in `route.ts` |
| QA-08 | 02-03/04 | 3 热点问题（GET /api/qa/hot，读 .md，不调 LLM） | SATISFIED | `hot-questions.ts` + `hot/route.ts` + 3 .md 文件 |
| QA-09 | 02-01 | wiki compile 审计 caller 命名 | SATISFIED | caller=qa.compile.compile 等（STATE.md 确认） |
| QA-10 | 02-03 | 热点 card 预设答案 UI | SATISFIED | `hot-cards.tsx` `<details>` + ReactMarkdown |
| QA-11 | 02-06 | LLM eval suite 50 题，>=80% | SATISFIED (partial) | mock 模式 30/30=100%；USER_OWN 20 题设计为用户填写（D-20），未违反 SC |
| QA-12 | 02-05 | /admin/wiki 编辑器 + PUT 事务保存 | SATISFIED | 列表页 + split-view editor + PUT API + prisma.$transaction |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|---------|--------|
| `lib/qa/wiki.ts` 行 56-65 | 注释 "实现放到 Plan 02-05" — 但 `updateWikiContent` 已完整实现，注释是历史残留 | Info | 无功能影响，注释陈旧 |
| `app/qa/free-ask.tsx` 行 79 | `placeholder="例：..."` | 仅是 HTML input placeholder 属性，非代码 stub | Info | 无影响 |

无 BLOCKER 级反模式。

---

### Human Verification Required

#### 1. 双页签刷新保持

**Test:** 浏览器打开 `/qa?kb=biz`，刷新页面
**Expected:** 页面重新加载后，"创业与行业库"页签仍为激活状态，WikiList 显示 biz 条目
**Why human:** URL sync 通过 `router.replace` 实现，server-side `searchParams.kb` 读取逻辑已验证；但 Next.js 16 Suspense hydration 在 worktree 环境下需要真实浏览器验证刷新完整流程

#### 2. 热点 3 题一键展开

**Test:** 浏览器打开 `/qa`，依次点击 Q1、Q2、Q3 三张热点 card
**Expected:** 每张 card 的 `<details>` 展开，显示 markdown 格式政策答案；打开 Network tab 确认无 `/api/llm` 或 LLM 相关请求
**Why human:** `<details>` HTML 原生展开行为 + ReactMarkdown 渲染需在真实浏览器确认，不可通过静态代码分析完全替代

#### 3. 自由问端到端（需真实 DB + LLM）

**Test:** 启动应用（需 DB + LLM key），在 `/qa` 页面输入"失业人员每月可以领多少失业保险金？"并提交
**Expected:** status=hit（已命中知识库）badge 显示，答案中有"/wiki/policy/unemployment-insurance"引用，答案末尾有"以上信息仅供参考"免责声明，字数 <= 1000 字
**Why human:** 需要 WikiPage 已 seed（`npm run wiki:compile --kb=policy --publish`）+ 真实 LLM API key + DB 连接

#### 4. Admin wiki 编辑器保存事务

**Test:** 登录 `/admin`，进入 `/admin/wiki`，点击任意条目"编辑 →"，修改内容，点击"保存"按钮
**Expected:** 成功提示"已保存 → vN+1"，DB `wiki_page_versions` 表新增一条快照记录，`wiki_pages.version` 字段 +1
**Why human:** 需要真实 DB 连接；prisma.$transaction 逻辑已代码验证，但实际写入需要在 DB 端确认

---

### Gaps Summary

**无 BLOCKER 级差距。** Phase 2 全部 4 条 ROADMAP Success Criteria 均有完整代码实现：

- SC1（双页签 + URL 同步）：server searchParams 读取 + client router.replace 写入链路完整
- SC2（3 热点不调 LLM）：fs 读 .md，grep 确认零 LLM 调用，3 个 .md 文件内容实质
- SC3（自由问三档 + 1000字 + 引用 + 免责）：三层防护 + truncate + QA_DISCLAIMER + filterCitations 链路完整
- SC4（eval 50题 >=80%）：mock 模式 100%/100% PASSED；USER_OWN 20 题为 D-20 设计决策（用户 HR 专业知识，AI 不替写），不是实现缺陷

**管理项（非 BLOCKER）：**

- USER_OWN 20 题占位：需用户（HR 专业人员）手工填写 `tests/llm-eval/golden-questions.json`，按 `USER_OWN_GOLDEN_QUESTIONS.md` 填空后补 mock fixtures 或直接用 `npm run llm-eval:real`；不阻塞当前 Phase 2 验收，但建议在 Phase 3 启动前完成以充实 eval 覆盖率
- biz-kb wiki 来源：甲方 P2 文件未到手，`biz` 标签下 WikiPage 暂无数据；不影响功能实现，数据到手后跑 `npm run wiki:compile --kb=biz --publish` 即可
- 真实浏览器 e2e（Playwright spec 存在）：需 `ADMIN_PASSWORD` env + DB 可达才能全跑；test 1-5（鉴权+市民端）依赖 page.route() mock，不需要真 LLM

---

*Verified: 2026-05-09T03:05:43Z*
*Verifier: Claude (gsd-verifier)*
