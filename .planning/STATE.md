# STATE — sbj-website

> 项目记忆。每次切换 phase / 完成关键节点时更新。

---

## Current State

**Phase:** Phase 2 — 政策问答（W2）规划完成，等待执行
**Status:** PLAN READY — 7 plans / 5 waves，全部 4 blockers + 6 warnings 已修（含 autoplan B1/F2/F3）。等 W0 部署完成（腾讯云 + LLM key + GitHub secrets）即可 `/gsd-execute-phase 2`
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

## What's Next

### Phase 2 执行需要的前置（W0 用户做）
- [ ] 腾讯云 Lighthouse + PostgreSQL CDB 实例创建
- [ ] DeepSeek + 豆包 + 讯飞 三家 LLM API key 充值开通
- [ ] GitHub Secrets 配 5 项（DATABASE_URL / SESSION_SECRET / ENCRYPTION_KEY / SSH_PRIVATE_KEY / DEPLOY_HOST）
- [ ] `prisma migrate deploy` 跑通（创 9 张表）
- [ ] 政策与办事库 3 个核心 PDF（甲方 P1） + Q1/Q2 微信文章 URL（家人/甲方）

### Phase 2 wave 执行顺序
- Wave 1: 02-01 wiki-compile（CLI + Prisma 写库 + 微信抓取）
- Wave 2: 02-02 qa-foundation（自由问 API + 三层防线）+ 02-03 hot-questions（并行）
- Wave 3: 02-04 citizen-ui（/qa 双页签）+ 02-05 admin-wiki-editor（并行）
- Wave 4: 02-06 llm-eval（50 题 golden + ≥80% 阈值）
- Wave 5: 02-07 e2e（Playwright 双 spec + WikiPage fixture）

### 用户先做（Phase 1 部署 + Phase 2 启动需要的前置）

- [ ] 腾讯云华东（上海）账号开通 + **Lighthouse 实例** + **PostgreSQL CDB 实例**创建
- [ ] **DeepSeek API key**（`DEEPSEEK_API_KEY`）+ 充值 ≥100 元测试额度
- [ ] **豆包 API key**（`DOUBAO_API_KEY`）+ 配置 `DOUBAO_BASE_URL` / `DOUBAO_MODEL`
- [ ] **讯飞 API key**（`IFLYTEK_API_KEY`）+ 配置 `IFLYTEK_BASE_URL` / `IFLYTEK_MODEL`
- [ ] GitHub 仓库创建 + 配置 5 个 Actions Secrets（见 RUNBOOK.md 第 1 节）
- [ ] `.env.production.local` 在 Lighthouse 服务器上配好（DATABASE_URL 指 CDB 内网）
- [ ] 政策与办事库 3 个核心文件 + biz-kb 政策来源（甲方提供）
- [ ] Q3「黄浦创卡」答案来源（甲方/家人，已提供《黄浦创卡》PDF 手册）

### AI 可做（等用户 W0 完成后）

- [ ] `npm run prisma migrate deploy`（连 CDB，创建 9 张表）
- [ ] 腾讯云控制台手动配 3 条监控告警（RUNBOOK.md 第 3 节）
- [ ] 截图归档：CDB 自动备份 / 跨区冷备 / 3 条告警策略 / 安全组
- [ ] Playwright e2e 全跑通（需真实 DB + ADMIN env）
- [ ] SOW 给甲方签（含 V8 全部 20 项对齐）

## Blockers

| Blocker | Impact | Mitigation |
|---|---|---|
| 腾讯云 CDB 未开通 | `prisma migrate deploy` 阻塞 | W0 第一步 |
| LLM API key 未到手 | T4 多供应商 fallback 无法验证 + Phase 2 自由问 API 跑不通 | W0 申请 3 家 |
| GitHub Secrets 未配 | deploy.yml 触发后 SSH 失败 | 开通 Lighthouse 后配 |
| ~~ICP 备案未下来~~ | ~~外网域名访问不了~~ | **已解除**：部署在 h100.jsai100.com，jsai100.com 主体已备案 |
| 等保是否要求未确认 | 影响后续 phase 安全要求 | 本周问甲方 |
| SOW 未签 | 合同层面交付风险 | 整理 V8 plan 走读给甲方 |
| 政策 PDF 原件未到手 | Phase 2 wiki KB 阻塞 | 问甲方要文件清单 |
| 创业与行业库文件数量未确认 | 影响 Phase 2 biz-kb 编译工作量 | 本周拿到清单 |

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

## Phase Transitions

| 时间 | 从 | 到 | 备注 |
|---|---|---|---|
| 2026-05-08 | (init) | Phase 0 Slice B PASS | LLM Wiki D1+D2 100/100 |
| 2026-05-08 | Phase 0 | Phase 1 代码完成 | 11 tasks / 12 commits / 待 W0 前置条件后部署验收 |
| 2026-05-09 | Phase 1 | Phase 2 规划完成 | 7 plans / 5 waves / autoplan B1+F2+F3 修复 |

---

*Last updated: 2026-05-09 — Phase 2 规划完成 + autoplan review pass + 推送 GitHub*
