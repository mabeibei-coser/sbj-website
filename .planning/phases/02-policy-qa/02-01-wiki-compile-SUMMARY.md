---
phase: 02-policy-qa
plan: 01
subsystem: wiki-compile
tags: [wiki, llm, cli, prisma, audit, wechat]
requires: [INF-03 callLlm, INF-05 logAudit, INF-08 Prisma WikiPage/WikiPageVersion]
provides:
  - prompts/wiki-classify-topics.md
  - prompts/wiki-compile-topic.md
  - scripts/wiki/wiki-config.json
  - scripts/wiki/{smoke,pdf-to-md,url-to-md,compile}.ts
  - 6 个 npm scripts (wiki:* + llm-eval / llm-eval:real)
  - knowledge/policy-sources/{,.gitkeep,wechat-archives/.gitkeep}
  - WikiPage(kb=policy) 1 行（startup-support v1）+ WikiPageVersion 1 行 + AuditLog wiki.publish 1 行
affects: 02-02 自由问 API（消费 WikiPage 作为知识库源）/ 02-03 热点问答（引用 canonical sources）
tech-stack:
  added:
    - dotenv（已在依赖中）+ tsx --conditions=react-server（让 server-only 包放行）
  patterns:
    - PoC fork + callLlm 替换 deepseek SDK 直连（D-25）
    - 微信文章 UA fallback（桌面 Chrome → MicroMessenger 内置 UA）
    - prisma.$transaction(WikiPage upsert + WikiPageVersion create) + 事务外 logAudit
key-files:
  created:
    - prompts/wiki-classify-topics.md
    - prompts/wiki-compile-topic.md
    - scripts/wiki/wiki-config.json
    - scripts/wiki/smoke.ts
    - scripts/wiki/pdf-to-md.ts
    - scripts/wiki/url-to-md.ts
    - scripts/wiki/compile.ts
    - knowledge/policy-sources/.gitkeep
    - knowledge/policy-sources/wechat-archives/.gitkeep
    - knowledge/policy-sources/jiu-zheng-ce-2.md (拷自 PoC)
    - knowledge/policy-sources/ji-she-kong-jian.md (拷自 PoC)
    - knowledge/policy-sources/chuangka-shouce.md (拷自 PoC)
  modified:
    - package.json (新增 6 个 npm scripts)
    - .gitignore (knowledge/ 改为 knowledge/* + 给 policy-sources 开口子)
decisions:
  - tsx 跑脚本时加 --conditions=react-server，让 server-only 包走 empty.js 而非 throw
  - dotenv 显式 loadDotenv({ path: '.env.local' }) 不依赖默认 .env
  - 双档 UA fallback (Chrome → MicroMessenger) 在拦截时升级
  - publishTopic 实现写在 Task 1 的 compile.ts 里（与 publish 主流程同提交），Task 2 只是拷 sources
metrics:
  duration: 约 25 分钟（含 typecheck 调试 + 实际抓取 + publish 真跑）
  completed: 2026-05-09
  wave: 1
---

# Phase 2 Plan 01: Wiki 编译 Pipeline Summary

JWT-style 一句话：把 PoC `experiments/llm-wiki-poc/` 的 4 脚本 + 2 prompt + 1 config 工程化为 sbj-website 的 `scripts/wiki/` + `prompts/`，所有 LLM 调用替换成 `callLlm({ caller: "qa.compile.*" })`，编译产物从写本地文件改为事务性写 sbj_dev 的 WikiPage / WikiPageVersion + audit_logs，并实现微信文章端到端抓取（UA bypass + 清洗 + frontmatter）。

## Tasks Completed

| Task | Name                                                | Commit  | Files                                                 |
| ---- | --------------------------------------------------- | ------- | ----------------------------------------------------- |
| 1    | 4 CLI + 2 prompts + wiki-config + npm scripts 骨架  | a063b7b | prompts/* / scripts/wiki/* / package.json / .gitignore / 2 .gitkeep |
| 2    | 拷贝 PoC 3 份 sources 到 canonical 目录             | b651755 | knowledge/policy-sources/{jiu-zheng-ce-2,ji-she-kong-jian,chuangka-shouce}.md |
| 3    | （checkpoint，本应停下让用户给 URL；按 PLAN 显式 fallback 自动用 PoC 微信源 URL 重抓自检）| —       | knowledge/policy-sources/wechat-archives/*.md (本地文件，不入 git，符合容量+版权约束) |

## What Was Built

### 4 个 CLI 脚本（命令行用法）

```bash
# 烟雾测试 callLlm 三档 fallback
npm run wiki:smoke

# MinerU PDF → markdown
npm run wiki:pdf-to-md -- some.pdf [--slug=name] [--sources=knowledge/policy-sources]

# 微信文章 URL → markdown（UA bypass + 清洗 + frontmatter）
npm run wiki:url-to-md -- "https://mp.weixin.qq.com/s/xxx" [<url2> ...] [--output=<dir>] [--kb=policy|biz]

# 编译：scan → classify(LLM) → compile(LLM) → publish/dry-run
npm run wiki:compile -- --kb=policy --sources=knowledge/policy-sources --dry-run
npm run wiki:compile -- --kb=policy --sources=knowledge/policy-sources --publish
```

### 2 个 fork prompt 的关键改动

1. **`prompts/wiki-classify-topics.md`**：在标题段后插入 `本知识库 kb_type={{kb_type}}（由 caller 注入，取值 policy / biz）。主题分类必须只用本 kbType 范围内的素材。` —— `compile.ts` 在 `classifyTopics()` 中用 `system.replace(/{{kb_type}}/g, kbType)` 注入。
2. **`prompts/wiki-compile-topic.md`**：在 #5 章节标题段后追加一行 `如果调用方传入 article_sections，则使用 caller 的；否则使用默认 6 段（与 wiki-config.json article_sections 一致）。`。其余 PoC 严格约束（"引用必须真实可追溯" / "不要编造任何政策内容" / "原文措辞优先" / "必须含「## 出处」段"）一字不改。

### wiki-config.json 双 kb_type schema

```json
{
  "policy": {
    "domain": "上海黄浦区社保局 政策与办事库",
    "topic_hints": ["失业保险", "就业补贴", "创业扶持", "技能培训", "灵活就业", "社保关系", "职业指导"],
    "article_sections": ["概述", "适用对象与资格条件", "办理流程与材料", "补贴标准与发放", "常见疑问", "出处"]
  },
  "biz": { "domain": "上海黄浦区 创业与行业库", "topic_hints": [...], "article_sections": [...] }
}
```

删除了 PoC 原 config 的 `deepseek` 段（model/temperature 由 `lib/llm-vendors/deepseek.ts` 控制）。

### compile.ts 替换 deepseek-client → callLlm 的 diff 概要

| 原 PoC 调用                                                              | 替换为                                                                                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `import { chat, accumulate, ... } from '../lib/deepseek-client.js'`      | `import { callLlm } from '../../lib/llm-client'`                                                      |
| Phase 2 classify: `chat({ system, user, response_format: 'json_object'})` | `callLlm({ caller: 'qa.compile.classify', systemPrompt, userPrompt, jsonMode: true, parser: ... })`   |
| Phase 3 compile: `chat({ system, user })`                                | `callLlm({ caller: 'qa.compile.compile', systemPrompt, userPrompt, maxTokens: 4000 })`                |
| `accumulate(budget, usage)` token 累加                                   | 手写 `budget.used_total += result.tokensIn + result.tokensOut`                                        |
| 写 `wiki/topics/<slug>.md` 本地文件                                      | dry-run 打印；publish 走 `publishTopic()` 事务写库                                                    |

`scripts/wiki/compile.ts` 中：
- `grep -c "callLlm" scripts/wiki/compile.ts` = **8**（含 import + classify 调用 + compile 调用 + 注释）
- `grep -c "deepseek-client" scripts/wiki/compile.ts` = **0**（D-25 验收通过）

### publishTopic 事务结构 + audit 写入

```
prisma.$transaction(async (tx) => {
  const existing = await tx.wikiPage.findUnique({ where: { kbType_slug: { kbType, slug } } });
  if (!existing) {
    create wikiPage { kbType, slug, title, content, sourceUrl, version: 1, publishedAt: now }
    create wikiPageVersion { wikiPageId, version: 1, contentSnapshot, editorId: 'system:wiki-compile', diffSummary: 'initial publish' }
    return { id, version: 1, created: true }
  } else {
    update wikiPage { title, content, sourceUrl ?? existing.sourceUrl, version: +1, publishedAt: now }
    create wikiPageVersion { wikiPageId, version: newVersion, contentSnapshot, editorId, diffSummary: 'recompile to vN' }
    return { id, version: newVersion, created: false }
  }
});

// 事务外（写失败 silent）
logAudit({
  actor: 'system:wiki-compile',
  action: 'wiki.publish',
  targetType: 'wiki_page',
  targetId: result.id,
  before: result.created ? null : { version: result.version - 1 },
  after: { kbType, slug, title, version },
});
```

### url-to-md.ts 微信清洗规则清单

被删的 selector / pattern：
1. `<script>` `<style>` `<noscript>` 整段
2. `<div class="rich_media_thumb_wrp">` 整段（顶部头图块）
3. `<img class="qr_code" ...>` 二维码图片 + `<img data-type="qrcode" ...>`
4. `<section data-tools=".*qrcode.*">` 二维码区块
5. `<section data-tools="135editor">...关注...</section>` 含"关注"字样的关注公众号卡
6. `<div class="rich_media_area_extra">` 整段（底部"推荐阅读"）
7. `<nav>` `<footer>` `<aside>` `<header>` 整段（兜底）

被保留并增强的：
- 微信图片懒加载：`<img data-src="...">` 提取到 `<img src="...">` 让图片地址有效
- HTML entity 解码（&nbsp; / &amp; / &#xN; / &#N;）

UA bypass 双档（拦截时升级）：
1. 桌面 Chrome 124 UA（默认，公开微信文章一般够）
2. MicroMessenger 8.0.42 内置 UA（备档）

### canonical sources 拷贝清单

| 文件名               | 字节数 | 来源 PoC 路径                                            | 用途                                |
| -------------------- | ------ | -------------------------------------------------------- | ----------------------------------- |
| `jiu-zheng-ce-2.md`  | 1,908  | `experiments/llm-wiki-poc/sources/jiu-zheng-ce-2.md`     | 创业担保贷款政策（02-03 q1 引用）   |
| `ji-she-kong-jian.md`| 21,771 | `experiments/llm-wiki-poc/sources/ji-she-kong-jian.md`   | 黄浦创业孵化基地清单（02-03 q2 引用）|
| `chuangka-shouce.md` | 4,591  | `experiments/llm-wiki-poc/sources/chuangka-shouce.md`    | 黄浦创卡 9 项福利（02-03 q3 引用）  |

### wechat archives checkpoint 产物清单

按 PLAN Task 3 的 fallback 模式自动跑（用户没在线，使用 PoC 已知能跑通的两条 URL 自检）：

| 文件名                                                                              | sourceUrl                                                  | 大小    | 行数 |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------- | ---- |
| 创政策贷你创业一图解读上海市创业担保贷款实施办法-2026-05-08.md                    | https://mp.weixin.qq.com/s/J5GHjHKBw7_kA6nKH8FPVA          | 6,802 B | 152  |
| 黄浦-创业孵化基地办公好去处等你来翻牌-2026-05-08.md                                  | https://mp.weixin.qq.com/s/HzZFJGXS7oQPlpcRwuCscA          | 43,116 B| 552  |

清洗验证：两份产物中 `qrcode` / `<script>` / "关注公众号" 残留全部为 0。

> 这两个 URL 是 PoC W0 已经使用过的"海纳百创 + 黄浦就业"号公开文章。如用户/家人后续给到 Q1（青年初次就业补贴）/ Q2（黄浦区创业孵化基地及补贴）的真实 URL，重跑 `npm run wiki:url-to-md -- "<真实url>"` 替换产物即可。微信存档目录已被 `.gitignore` 排除（容量 + 版权），不污染 git。

## 实跑结果（DB / LLM）

```
WikiPage(kb=policy)        : 1   (slug=startup-support, title=创业扶持, version=1, contentLen=2459)
WikiPageVersion             : 1   (v1, editorId=system:wiki-compile, diffSummary=initial publish)
AuditLog action=wiki.publish: 1   (actor=system:wiki-compile, targetType=wiki_page, targetId=cmoxkjg4c0002v5ncst1afv0k)

LlmCallLog by caller:
  qa.smoke           : 1
  qa.compile.classify: 2 (1 dry-run + 1 publish)
  qa.compile.compile : 2

DeepSeek 总用量：tokensIn=29206 tokensOut=6696 costCents=1（远低于 200_000 预算）
elapsed: smoke 1.4s / dry-run on PoC 5 sources 47s / publish on canonical 3 sources 27s
```

全部成功，零 fallback（所有 callLlm 直接 DeepSeek 命中，没走豆包/讯飞）。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Build] tsx 跑 lib/* 报 server-only 抛错**
- **Found during:** Task 1 跑 dry-run 之前 `npm run wiki:compile`（无 flag 用法测试）
- **Issue:** `lib/llm-client.ts` 等都 `import "server-only"`，server-only 包默认 condition 走 `index.js` 抛 `This module cannot be imported from a Client Component`，CLI 上下文也命中。
- **Fix:** package.json 6 个 wiki:* + llm-eval scripts 都加 `--conditions=react-server`，让 tsx 走 server-only 包的 `react-server` condition（resolve 到 empty.js）。
- **Files modified:** package.json
- **Commit:** a063b7b

**2. [Rule 1 - Bug] dotenv 默认读 .env 但项目只有 .env.local**
- **Found during:** smoke 测试报 "无可用 LLM vendor"
- **Issue:** `import "dotenv/config"` 默认读 `.env`；项目只有 `.env.local`（带 DeepSeek/讯飞 key）。
- **Fix:** 4 个脚本都换成显式 `loadDotenv({ path: '.env.local' }); loadDotenv({ path: '.env' });`，与 Next.js 行为一致。
- **Files modified:** scripts/wiki/{smoke,pdf-to-md,url-to-md,compile}.ts
- **Commit:** a063b7b

**3. [Rule 1 - Bug] Buffer 不被 Next.js 16 strict TS 接受为 BodyInit**
- **Found during:** typecheck pdf-to-md.ts
- **Issue:** TS lib.dom 的 BodyInit 不接受 Node.js Buffer；试了 Uint8Array / Blob 都不行（ArrayBufferLike vs ArrayBuffer 类型冲突）。
- **Fix:** Node.js 18+ fetch 实际接受 Buffer，类型用 `as unknown as BodyInit` 绕过。
- **Files modified:** scripts/wiki/pdf-to-md.ts
- **Commit:** a063b7b

**4. [Rule 2 - 必备 functionality] url-to-md.ts 缺 MicroMessenger UA**
- **Found during:** Task 1 验收 grep `MicroMessenger`
- **Issue:** 第一版只有桌面 Chrome UA；PLAN 验收 grep `MicroMessenger`（D-16 微信反爬要求双档 UA fallback）。
- **Fix:** 加 `WECHAT_INAPP_UA` + `UA_FALLBACKS` 数组 + `fetchWithUaBypass` 在拦截时尝试下一档 UA。
- **Files modified:** scripts/wiki/url-to-md.ts
- **Commit:** a063b7b

**5. [Rule 2 - 必备 functionality] publishTopic 实现合并到 Task 1**
- **Background:** PLAN 的 Task 1 要求 `publishTopic` 是空函数 throw "Task 2: TODO"，Task 2 再补实现；但补实现属于 Rule 2（不实现 publish 不能验证 must_haves 第 3 条），且实现量很小（~50 行），分两次 commit 反而更难审。
- **Decision:** Task 1 提交里直接给 publishTopic 完整实现 + Task 2 只拷 PoC sources。两次 commit 仍然完整、各自原子。
- **Impact:** 不影响 PLAN 任何 acceptance/verify；publish 实跑验证已在 Task 2 commit message 里记录。

### Auth Gates

无（DeepSeek key + DB 都已配齐）。

## Known Issues / Deferred

1. **豆包 key 未配** — 不阻塞（DeepSeek 主路径全部命中）。STATE.md 已记录。
2. **真 Q1/Q2 微信 URL 没拿到** — Task 3 用 PLAN 显式 fallback 路径自检（用 PoC 已经验证过的 2 条 URL）。如用户/家人后续给到 Q1/Q2 真实 URL，重跑 `wiki:url-to-md` 替换即可。

## Self-Check: PASSED

- ✅ `prompts/wiki-classify-topics.md` 含 `kb_type` 字符串
- ✅ `prompts/wiki-compile-topic.md` 含 `引用必须真实可追溯` 和 `不要编造任何政策内容`
- ✅ `scripts/wiki/wiki-config.json` 是合法 JSON，policy + biz 各有 article_sections（6 段）
- ✅ `package.json` 含 wiki:smoke / wiki:pdf-to-md / wiki:url-to-md / wiki:compile / llm-eval / llm-eval:real
- ✅ `npm run typecheck` 退出 0
- ✅ `npm run wiki:compile`（无 flag）退出 2 + 打印 usage
- ✅ `npm run wiki:compile -- --kb=policy --sources=experiments/llm-wiki-poc/sources --dry-run` 跑通，21k tokens，47s，不写库
- ✅ `npm run wiki:compile -- --kb=policy --sources=knowledge/policy-sources --publish` 跑通，CREATED policy/startup-support v1，27s
- ✅ `grep -c 'callLlm' scripts/wiki/compile.ts` = 8（≥ 2）
- ✅ `grep -c 'deepseek-client' scripts/wiki/compile.ts` = 0
- ✅ `grep -c 'MicroMessenger\|js_content\|data-src' scripts/wiki/url-to-md.ts` ≥ 3（实测 13+ 命中）
- ✅ `knowledge/policy-sources/.gitkeep` + `knowledge/policy-sources/wechat-archives/.gitkeep` 都入 git
- ✅ canonical sources jiu-zheng-ce-2.md / ji-she-kong-jian.md / chuangka-shouce.md 都入 git
- ✅ wechat-archives 下 ≥2 个 .md（创政策 + 创业孵化基地），frontmatter 含 `sourceUrl: https://mp.weixin.qq.com/`
- ✅ DB 状态：WikiPage(kb=policy)=1 / WikiPageVersion=1 / AuditLog wiki.publish=1，关系一致
- ✅ LlmCallLog: qa.smoke=1, qa.compile.classify=2, qa.compile.compile=2 都按 D-25 caller 命名规范写入

所有验收项通过，Phase 2 Wave 2（02-02 / 02-03 并行）现在可以启动。
