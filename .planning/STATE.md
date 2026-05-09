---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-05-09T02:18:51.915Z"
progress:
  total_phases: 9
  completed_phases: 0
  total_plans: 7
  completed_plans: 5
  percent: 57
---

# STATE — sbj-website

> 项目记忆。每次切换 phase / 完成关键节点时更新。

---

## Current State

**Phase:** Phase 2 — 政策问答（W2）Wave 3 完成
**Status:** EXECUTING — 7 plans / 5 waves，**Wave 3 PASS**（02-04 + 02-05 均完成）：02-05 admin-wiki-editor：updateWikiContent 事务实现 + GET/PUT API + 列表/编辑 wrapper/client split-view editor；74 unit tests PASS / build exit 0。Wave 4 02-06 llm-eval 可启动。
**Last Updated:** 2026-05-09

## 生产 URL（甲方已分配）

| 模块 | URL | 对应路由 |
|------|-----|---------|
| 智能职业诊断 | https://h100.jsai100.com/a300 | `app/a300/` |
| 智能创业诊断 | https://h100.jsai100.com/a400 | `app/a400/` |
| 政策与智能问答 | https://h100.jsai100.com/a500 | `app/a500/` |

**域名**：`h100.jsai100.com`（jsai100.com 主体，ICP 已备案 → **ICP blocker 解除**）  
**备注**：Phase 2 路由 app/(citizen)/ 要改成 app/a300|a400|a500/ 对应上述路径

## What's Done

- [x] V8 plan 完成（C:\Users\admin\.claude\plans\1-giggly-cat.md）
- [x] V8 plan 经 autoplan 双视角审阅（CEO + Eng），14 条 mechanical patch 全应用
- [x] 项目目录创建：D:\workspace\01_项目-Coding\sbj-website\
- [x] git init
- [x] .planning/ 结构（PROJECT.md / config.json / REQUIREMENTS.md / ROADMAP.md / STATE.md）
- [x] **Phase 0 Slice B (INF-02) PASS** — LLM Wiki 编译方案验证完成（2026-05-08）
  - 实现：`experiments/llm-wiki-poc/`（DeepSeek `deepseek-v4-flash` + MinerU Agent API）
  - 评分：D1=5/5（中文政策准确性）+ D2=5/5（引用回链正确性） → 加权 100/100，PASS
  - 详见：`experiments/llm-wiki-poc/EVAL.md` + `docs/W0-LLM-Wiki-eval.md`
  - W2 build path 锁定：fork PoC prompts + scripts/compile.ts，工程化为 `app/api/wiki/compile` + 审计日志 + token 预算
- [x] **Phase 1 — T1 工程脚手架**：Next.js 16.2.3 + TypeScript + Tailwind + app router 初始化
- [x] **Phase 1 — T2 PostgreSQL + Prisma schema**：9 张表（业务表 4 + 审计表 4 + wiki_page_versions），docker-compose 本地开发
- [x] **Phase 1 — T3 字段加密**：`lib/encryption.ts` AES-256-GCM，格式 `v1:iv:ciphertext:authTag`，`hashField()` HMAC-SHA256 keyed hash
- [x] **Phase 1 — T4 多供应商 LLM 抽象层**：`lib/llm-client.ts` DeepSeek→豆包→讯飞三档 fallback，OpenAI 兼容协议
- [x] **Phase 1 — T5 审计写入 helper**：`lib/audit.ts` logAudit / logLlmCall / logConsent 三函数，写失败 silent
- [x] **Phase 1 — T6 /admin 登录 + iron-session**：`lib/admin-session.ts` adapt career-report，加 role:'admin'|'reviewer'
- [x] **Phase 1 — T7 proxy.ts 鉴权**：Next.js 16 proxy（原 middleware），路径前缀 + 角色双重校验；ADMIN_SESSION_PASSWORD 缺失时返回 503 而非降级静态密码（安全修复）
- [x] **Phase 1 — T8 PIPL stub**：consent POST/GET + data export + data delete（真删联级）+ 隐私政策草稿
- [x] **Phase 1 — T9 CI/CD**：GitHub Actions ci.yml (typecheck/lint/unit/build) + deploy.yml (SSH→Lighthouse)
- [x] **Phase 1 — T10 备份 + 监控**：docs/RUNBOOK.md + `/admin/dashboard/llm` 最简版 dashboard
- [x] **Phase 1 — T11 测试基建**：Vitest 32 单元测试全过 + Playwright e2e 骨架 + LLM eval 1 样本 100%
- [x] **Phase 1 安全 review** — codex 发现 3 issue 全部修复（commit a2e90a1）：iron-session 静态密码降级漏洞 + hashField 改 HMAC-SHA256
- [x] **Phase 2 规划完成** — 2026-05-09
  - CONTEXT.md（29 D-NN 决策）+ PATTERNS.md（38 files → analog）
  - gsd-planner 生成 7 PLAN.md / 5 waves（QA-01~12 全覆盖）
  - gsd-plan-checker 出 4 BLK + 6 WRN → 全部修复
  - autoplan CEO+Eng review → B1（pg_trgm）+ F2（consentId）+ F3（lib/citizens.ts）已修
  - 提交：`1441a76 docs(02): Phase 2 plan — 7 plans, 5 waves, all blockers/warnings resolved`
- [x] **W0 本地开发环境就绪** — 2026-05-09
  - `npm install`（Next 16.2.3 + Prisma 6.19.3 + bcryptjs + iron-session 等全部装好）
  - `npx prisma generate`（PrismaClient 生成到 node_modules/@prisma/client）
  - `.env.local` 创建：FIELD_ENCRYPTION_KEY + ADMIN_SESSION_PASSWORD（48 字节随机）+ ADMIN_PASSWORD_HASH（bcrypt(sbj-dev-2026)，base64 包装防 dotenv 截断）
  - DeepSeek key 已配（`sk-fe2547f2f338475e89b93636551b7268` + 模型 `deepseek-v4-flash`）
  - 讯飞 key 已配（career-report 同款 maas-coding 端点 + APIKey:APISecret 格式）
  - `npm run test:unit` PASS：encryption 16 + llm-client 9 + audit 7 = **32 单测全过**
- [x] **DB 基建就位（替代 CDB 方案）** — 2026-05-09
  - **决策**：放弃买 CDB（成本/时间），改用 Lighthouse `124.222.114.47` 上自建 Postgres 14（已存在）
  - 新建独立开发库 `sbj_dev`（与生产 `sbj_prod` 隔离），`sbj` 用户复用
  - 装 `pg_trgm` 扩展（autoplan B1 中文搜索方案前提）
  - 本地 `.env.local` 写入 `DATABASE_URL=postgresql://sbj:<pwd>@localhost:5432/sbj_dev?schema=public` —— 走 SSH tunnel 形式，密码与 prod 相同（生产 .env.production.local 已就位）
  - SSH tunnel 模式：`ssh -i ~/.ssh/tencent_key -N -L 5432:localhost:5432 root@124.222.114.47`（本地开发期间常驻）
  - `npx prisma migrate deploy` 在 sbj_dev 上应用 init migration，9 表全建好
  - 链路验证：本地 Prisma Client → tunnel → Lighthouse Postgres，wikiPage/auditLog/citizenProfile/consentRecord count 都返回 0 ✓
- [x] **Phase 2 Wave 3 — Plan 02-05 admin-wiki-editor** — 2026-05-09
  - 3 commits：ac83087（Task 1: updateWikiContent 事务 + 3 TDD tests）+ 1f70acb（Task 2: GET /api/admin/wiki + PUT /api/admin/wiki/[id]）+ 8f9041b（Task 3: 列表页 + 编辑页 wrapper + client split-view editor）
  - **updateWikiContent**：prisma.$transaction（findUnique → update version+1 → wikiPageVersion.create）+ 事务外 logAudit（actor=admin:editorId, action=wiki.update, before/after version）
  - **API**：GET 支持 kbType/q 筛选；PUT Zod 校验 + getAdminSession 取 editorId + 404/400/500 齐全
  - **UI**：list 页（server, segmented kb 筛 + title 搜 + table）+ 编辑页 wrapper（server, getWikiPage + notFound）+ client editor（textarea + ReactMarkdown split-view + PUT onSave + version 状态刷新）
  - **TDD**：RED（3 it FAIL）→ GREEN（3 it PASS）→ REFACTOR（typecheck exit 0）gate 全留痕
  - **STRIDE**：T-02-16 accept（audit 留痕，RBAC Phase 4）/ T-02-17~20 全 mitigate
  - **测试**：74 单测全过（+3 wiki-update）/ typecheck exit 0 / build exit 0
  - 详见：`.planning/phases/02-policy-qa/02-05-SUMMARY.md`
- [x] **Phase 2 Wave 3 — Plan 02-04 citizen-ui** — 2026-05-09
  - 2 commits：a90c930（Task 1: globals.css v2 + 6 shadcn ui 组件 + lib/utils.ts）+ c0ab0da（Task 2+3: /qa 主页 + wiki 详情页）
  - **globals.css**：643 行 DESIGN.md v2 全量（tokens 31/glass-card 2/report-17/aurora 4/spotlight+hero-grid 6）+ sbj-website semantic tokens overrides
  - **6 shadcn 组件**：button/card/input/label/scroll-area/badge（标准 Radix-based，非 career-report @base-ui）
  - **/qa 主页**：hero 左对齐 + QaTabs（client, URL 同步）+ HotCards（server, details card + react-markdown）+ WikiList（server, Prisma kbType 筛选）+ FreeAsk（client, 三档结果渲染）
  - **wiki 详情页**：/qa/wiki/[kbType]/[slug]，parseKb enum gate + getWikiPageBySlug + ReactMarkdown + QA_DISCLAIMER
  - **DESIGN.md §9 合规**：emoji 0 / purple|fuchsia 0 / text-center(hero) 0 / Inter 0 / pill 0
  - **测试**：71 单测全过（无回归）/ typecheck exit 0 / build exit 0
  - **偏差**：@base-ui → @radix-ui 标准 shadcn / prose CSS 自写 / semantic tokens 补全
  - 详见：`.planning/phases/02-policy-qa/02-04-SUMMARY.md`
- [x] **Phase 2 Wave 2 — Plan 02-02 qa-foundation** — 2026-05-09
  - 1 atomic commit：3c361b1（15 files, 931 insertions）
  - **三层防护**：sanitizer（detectPromptInjection 6 patterns）+ retrieve（pg_trgm word_similarity + ILIKE 降级）+ citations（gov.cn + /wiki/policy|biz regex 白名单）
  - **两次显式 callLlm**：caller=qa.answer 第一次 + caller=qa.answer.retry 白名单失败后显式第二次（运营遥测 BLOCKER 3 完全修复）
  - **POST /api/qa/answer**：D-06 Zod schema + D-27 ConsentRecord 校验 + D-29 双层 catch 兜底
  - **TDD**：Task 1/2/3b 三组 RED→GREEN→REFACTOR gate 全留痕通过
  - **偏差修复**：threshold <= 改正 / TS ES2017 regex s flag 替换 / meta.ip null→undefined / pg 包缺失改用 $executeRawUnsafe
  - **测试**：35 新增 qa 测试 / 总计 67 单测全过 / typecheck exit 0
  - 详见：`.planning/phases/02-policy-qa/02-02-SUMMARY.md`
- [x] **Phase 2 Wave 1 — Plan 02-01 wiki-compile** — 2026-05-09
  - 2 commits：a063b7b（4 CLI + 2 prompt + wiki-config + npm scripts + .gitignore + .gitkeep）+ b651755（拷贝 PoC 3 份 sources 到 canonical）
  - **smoke**：`npm run wiki:smoke` OK，vendor=deepseek model=deepseek-v4-flash 1376ms，LlmCallLog caller=qa.smoke 写入
  - **dry-run**：`npm run wiki:compile -- --kb=policy --sources=experiments/llm-wiki-poc/sources --dry-run` 跑通，21k tokens，47s，不写 WikiPage 表
  - **publish**：`npm run wiki:compile -- --kb=policy --sources=knowledge/policy-sources --publish` 跑通，27s 14760 tokens，CREATED policy/startup-support v1
  - **DB 状态**：WikiPage(kb=policy)=1 / WikiPageVersion=1（v1, editorId=system:wiki-compile）/ AuditLog wiki.publish=1（actor=system:wiki-compile, targetType=wiki_page）
  - **微信文章存档（Task 3 self-check）**：用 PoC 已知 URL 抓 2 篇，frontmatter 含 sourceUrl 全合规，清洗后 0 个 qrcode/script/关注公众号 残留；wechat-archives/*.md 不入 git（容量+版权）
  - **caller 命名规范（D-25）**：qa.smoke / qa.compile.classify / qa.compile.compile 三个 caller 都按规范写 LlmCallLog
  - **deviation 处理**：tsx 加 --conditions=react-server / dotenv 显式读 .env.local / Buffer→BodyInit unknown 转换 / 加 MicroMessenger UA 双档 fallback / publishTopic 实现并入 Task 1
  - 详见：`.planning/phases/02-policy-qa/02-01-wiki-compile-SUMMARY.md`

## What's Next

### Phase 2 执行需要的前置（W0 用户做）

- [ ] 腾讯云华东（上海）账号开通 + Lighthouse 实例 + PostgreSQL CDB 实例（**Wave 2 起阻塞**：API 路由要写 DB）
- [x] DeepSeek key（`deepseek-v4-flash`） — 已填 .env.local
- [x] 讯飞 key（maas-coding-api / astron-code-latest） — 已填 .env.local
- [ ] 豆包 API key + 模型名（火山引擎方舟） — `.env.local` 留空（不阻塞，主用 DeepSeek，豆包是 fallback）
- [ ] GitHub Secrets 配 5 项（**SSH 部署相关**，按 docs/RUNBOOK.md §1.2）：`TENCENT_HOST` / `TENCENT_USER` / `TENCENT_SSH_KEY` / `TENCENT_PORT` / `TENCENT_DEPLOY_PATH`（**Phase 2 完成后 deploy 时才阻塞**）
- [ ] 服务器 `.env.production.local` 配齐（**业务 env**，按 `.env.example`）：`DATABASE_URL` 指 CDB 内网 / `FIELD_ENCRYPTION_KEY` / `ADMIN_PASSWORD_HASH` / `ADMIN_SESSION_PASSWORD` / 3 家 LLM key + base url + model（**deploy 时才阻塞**）
- [ ] `prisma migrate deploy` 跑通（创 9 张表 — **Wave 2 起阻塞**）
- [ ] biz-kb 政策来源（甲方 P2，未到手）+ Q1/Q2 微信文章正式 URL（家人/甲方；knowledge-sources/ 已有 PoC 抓取版可作为 fallback）

> ⚠️ 部署 env 分两处：**SSH 部署相关 5 项进 GitHub Secrets**（CI/CD 用）；**业务 env（DB/加密/LLM key）配在服务器 `.env.production.local`**（运行时用）。两组不要搞混。

### Phase 2 wave 执行顺序

- Wave 1: 02-01 wiki-compile（CLI + Prisma 写库 + 微信抓取）
- Wave 2: 02-02 qa-foundation（自由问 API + 三层防线）+ 02-03 hot-questions（并行）
- Wave 3: 02-04 citizen-ui（/qa 双页签）+ 02-05 admin-wiki-editor（并行）
- Wave 4: 02-06 llm-eval（50 题 golden + ≥80% 阈值）
- Wave 5: 02-07 e2e（Playwright 双 spec + WikiPage fixture）

### 用户先做的细项清单（合并入上面 Phase 2 前置；保留作详细 reference）

- [ ] 腾讯云华东（上海）账号开通 + **Lighthouse 实例** + **PostgreSQL CDB 实例**创建
- [x] **DeepSeek API key**（`DEEPSEEK_API_KEY`）— 已填 .env.local（`deepseek-v4-flash`）
- [ ] **豆包 API key**（`DOUBAO_API_KEY`）+ 配置 `DOUBAO_BASE_URL` / `DOUBAO_MODEL`（不阻塞 Wave 1，主用 DeepSeek）
- [x] **讯飞 API key**（`IFLYTEK_API_KEY`）— 已填 .env.local（maas-coding-api / astron-code-latest）
- [x] GitHub 仓库创建 — `https://github.com/mabeibei-coser/sbj-website.git` 已建
- [ ] GitHub Actions Secrets 5 项配置（按 docs/RUNBOOK.md §1.2 字段名，不是 DATABASE_URL/SESSION_SECRET 那组）
- [ ] `.env.production.local` 在 Lighthouse 服务器上配好（DATABASE_URL 指 CDB 内网）
- [x] 政策与办事库核心文件（甲方 P1）— knowledge-sources/ 已有 4 文件 815 行（创卡 PDF 12 页 + 2 微信文章）
- [ ] biz-kb 政策来源（甲方 P2，未到手）
- [x] Q3「黄浦创卡」答案来源（家人提供 PDF + MinerU 全文抽取，已入 knowledge-sources/）

### AI 可做（等用户 W0 完成后）

- [ ] `npm run prisma migrate deploy`（连 CDB，创建 9 张表）
- [ ] 腾讯云控制台手动配 3 条监控告警（RUNBOOK.md 第 3 节）
- [ ] 截图归档：CDB 自动备份 / 跨区冷备 / 3 条告警策略 / 安全组
- [ ] Playwright e2e 全跑通（需真实 DB + ADMIN env）
- [ ] SOW 给甲方签（含 V8 全部 20 项对齐）

## Blockers

| Blocker | Impact | Mitigation |
|---|---|---|
| ~~腾讯云 Lighthouse + CDB 未开通~~ | ~~Wave 2+ 阻塞~~ | **已解除**：Lighthouse `124.222.114.47` 早开通；放弃买 CDB，改用 Lighthouse 自建 Postgres 14 + 独立 sbj_dev 库 + SSH tunnel；UAT/上线时再切真 CDB（连接串改一行） |
| ~~LLM API key 未到手~~ | ~~T4 多供应商 fallback 无法验证~~ | **部分解除**：DeepSeek + 讯飞已配；豆包未配（不阻塞，主用 DeepSeek，豆包是 fallback） |
| GitHub Actions Secrets 未配 | deploy.yml SSH 步骤失败 | **Phase 2 完成后 deploy 才阻塞**；按 docs/RUNBOOK.md §1.2 配 5 项 TENCENT_* |
| 服务器 .env.production.local 未配 | 应用启动即崩（FIELD_ENCRYPTION_KEY / ADMIN_SESSION_PASSWORD 缺失会 503）| **deploy 时才阻塞**；按 .env.example 全表填值 |
| ~~ICP 备案未下来~~ | ~~外网域名访问不了~~ | **已解除**：部署在 h100.jsai100.com，jsai100.com 主体已备案；详见 STATE.md 顶部生产 URL 段（注：docs/ICP-备案-跟踪.md 是基于早期 sbj.jsai100.com 假设，已过时）|
| 等保是否要求未确认 | 影响后续 phase 安全要求 | 本周问甲方 |
| SOW 未签 | 合同层面交付风险 | 整理 V8 plan 走读给甲方 |
| ~~政策 PDF 原件未到手~~ | ~~Phase 2 wiki KB 阻塞~~ | **部分解除**：knowledge-sources/ 已有 4 markdown / 815 行（创卡 PDF 12 页 + 2 微信文章），policy-kb 编译可启动；甲方追加文件随到随补 |
| 创业与行业库文件数量未确认（甲方 P2） | 影响 Phase 2 biz-kb 编译子任务 | 不阻塞 policy-kb 启动；biz-kb 部分等清单到手再跑 wiki:compile --kb=biz |

## Decisions Log

| 决策 | 选择 | 理由 |
|---|---|---|
| 用 llm-wiki-compiler 作 W2 wiki 工具 | **部分推翻** — 改"拆 prompt + DeepSeek 重写最简版" | 上游是 Claude Code 插件不可直接换 DeepSeek；路径合规且 W2 production 可直接复用 |
| LLM Wiki 编译方案的可行性 | **Validated** — D1+D2 加权 100/100，W2 不切 RAG fallback | 3 文件 / 111 行 / 44s |
| MinerU 中文 PDF 解析 | **Validated**（W2 production 升 Precision API） | PoC 用 Agent API 跑通 |
| DeepSeek `deepseek-v4-flash` 模型 | **Validated** — 串行编译 / 3 元成本 / 44s 完成 3 文件 | PoC 实测 |
| DB 访问层 | Prisma | 类型安全 + 自动 migration + AI 熟悉 |
| Fork 策略 | 新建 + 选择性 pull from career-report | 避免引入无关代码 |
| 监控方案 | 腾讯云监控 only（暂不接 Sentry） | CLB/CDB/Lighthouse 自带；Sentry 推后续 phase |
| LLM 供应商 | DeepSeek 主 + 豆包 + 讯飞 备 | INF-03 跨厂商真 fallback |
| Next.js 版本 | 16.2.3（当前 latest） | T7 发现 middleware.ts 已废弃，改用 proxy.ts |
| 包管理器 | npm（非 pnpm） | 本机只有 npm，与 career-report 一致 |
| hashField 算法 | HMAC-SHA256（keyed on FIELD_ENCRYPTION_KEY） | 手机号 37-bit 熵，裸 SHA-256 可枚举；HMAC 需同时拿到密钥才能枚举 |
| iron-session 密码缺失策略 | 返回 503 / redirect with error | 静态降级密码可被攻击者利用伪造 session；缺失时直接报错更安全 |
| Phase 2 中文全文搜索方案 | pg_trgm + word_similarity（autoplan B1） | tsvector('simple') 对中文无词界，整段变单 token，召回近零；pg_trgm 字符三元组无需分词 |
| Phase 2 consent 查询字段 | phone → HMAC hash（移除 consentId，autoplan F2） | consentId 字段冗余，统一用 phone_hash 查 ConsentRecord，API schema 简化 |
| Phase 2 开发数据库方案 | Lighthouse 自建 Postgres 14 + sbj_dev 库 + SSH tunnel | CDB 最低规格 ~50 元/月，但 Lighthouse 现成且已装 PG14；建独立 sbj_dev 与 sbj_prod 隔离避免开发污染生产；UAT 阶段再升级真 CDB |
| 检索阈值判定符号（02-02） | `<= RETRIEVAL_THRESHOLD` 而非 `<` | score 等于阈值（0.1）时不应触发 LLM 调用；`<` 会放行 score=0.1，`<=` 才符合 plan behavior |
| 两次 callLlm 显式 caller（02-02） | answer.ts 显式发两次 callLlm（qa.answer + qa.answer.retry） | 避免 lib/llm-client.ts 内部 validator 复用同 caller，运营可按 caller 精确检索"被重试的调用" |
| shadcn 组件实现（02-04） | 标准 Radix-based shadcn（非 career-report @base-ui） | career-report 用 @base-ui/react，sbj-website 不装此包；@radix-ui 标准实现 API 兼容且无需额外配置 |
| prose CSS（02-04） | globals.css 自写简版 .prose（非 @tailwindcss/typography） | Tailwind v4 typography plugin 装配复杂；60 行自写 CSS 满足 react-markdown 渲染，避免引入新依赖 |

## Phase Transitions

| 时间 | 从 | 到 | 备注 |
|---|---|---|---|
| 2026-05-08 | (init) | Phase 0 Slice B PASS | LLM Wiki D1+D2 100/100 |
| 2026-05-08 | Phase 0 | Phase 1 代码完成 | 11 tasks / 12 commits / 待 W0 前置条件后部署验收 |
| 2026-05-09 | Phase 1 | Phase 2 规划完成 | 7 plans / 5 waves / autoplan B1+F2+F3 修复 |
| 2026-05-09 | Phase 2 plan | Phase 2 **Wave 1 ready** | npm install + prisma generate + .env.local 完成（DeepSeek + 讯飞配齐） / 32 单测 PASS |
| 2026-05-09 | Wave 1 ready | Wave 1 PASS | Plan 02-01 wiki-compile 完成（2 commits a063b7b + b651755）；smoke + dry-run + publish 三档全通；WikiPage 写库链路验证；Wave 2 ready |
| 2026-05-09 | Wave 2 started | Wave 2 Plan 02-02 PASS | Plan 02-02 qa-foundation 完成（commit 3c361b1）；三层防护 + answer API + 67 单测 PASS；Wave 2 02-03 hot-questions ready |
| 2026-05-09 | Wave 3 started | Wave 3 Plan 02-04 PASS | Plan 02-04 citizen-ui 完成（commits a90c930 + c0ab0da）；globals.css v2 + 6 shadcn 组件 + /qa 主页 + wiki 详情页；71 单测 PASS；Wave 3 02-05 admin-wiki-editor ready |
| 2026-05-09 | Wave 3 02-05 started | Wave 3 PASS | Plan 02-05 admin-wiki-editor 完成（commits ac83087 + 1f70acb + 8f9041b）；updateWikiContent 事务 + GET/PUT API + 3 UI 件；74 单测 PASS；Wave 4 02-06 llm-eval ready |

---

*Last updated: 2026-05-09 — Phase 2 Wave 3 PASS：Plan 02-05 (admin-wiki-editor) PASS — updateWikiContent 事务 + GET/PUT API + 列表/编辑 UI，74 单测 PASS，build exit 0；QA-12 完成；Wave 4 (02-06 llm-eval) ready*
