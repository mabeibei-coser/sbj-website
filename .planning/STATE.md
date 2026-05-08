# STATE — sbj-website

> 项目记忆。每次切换 phase / 完成关键节点时更新。

---

## Current State

**Phase:** Phase 1 — 脚手架 + 工程基建（W1）代码完成，待部署
**Status:** CODE COMPLETE — 等待 W0 前置条件（腾讯云 + API key + GitHub secrets）后部署验收
**Last Updated:** 2026-05-08

## What's Done

- [x] V8 plan 完成（C:\Users\admin\.claude\plans\1-giggly-cat.md）
- [x] V8 plan 经 autoplan 双视角审阅（CEO + Eng），14 条 mechanical patch 全应用
- [x] 项目目录创建：D:\workspace\01_项目-Coding\sbj-website\
- [x] git init
- [x] .planning/ 结构（PROJECT.md / config.json / REQUIREMENTS.md / ROADMAP.md / STATE.md）
- [x] **Phase 1 — T1 工程脚手架**：Next.js 16.2.3 + TypeScript + Tailwind + app router 初始化
- [x] **Phase 1 — T2 PostgreSQL + Prisma schema**：9 张表（业务表 4 + 审计表 4 + wiki_page_versions），docker-compose 本地开发
- [x] **Phase 1 — T3 字段加密**：`lib/encryption.ts` AES-256-GCM，格式 `v1:iv:ciphertext:authTag`，`hashField()` SHA-256 索引列
- [x] **Phase 1 — T4 多供应商 LLM 抽象层**：`lib/llm-client.ts` DeepSeek→豆包→讯飞三档 fallback，OpenAI 兼容协议
- [x] **Phase 1 — T5 审计写入 helper**：`lib/audit.ts` logAudit / logLlmCall / logConsent 三函数，写失败 silent
- [x] **Phase 1 — T6 /admin 登录 + iron-session**：`lib/admin-session.ts` adapt career-report，加 role:'admin'|'reviewer'
- [x] **Phase 1 — T7 proxy.ts 鉴权**：Next.js 16 proxy（原 middleware），路径前缀 + 角色双重校验
- [x] **Phase 1 — T8 PIPL stub**：consent POST/GET + data export + data delete（真删联级）+ 隐私政策草稿
- [x] **Phase 1 — T9 CI/CD**：GitHub Actions ci.yml (typecheck/lint/unit/build) + deploy.yml (SSH→Lighthouse)
- [x] **Phase 1 — T10 备份 + 监控**：docs/RUNBOOK.md + `/admin/dashboard/llm` 最简版 dashboard
- [x] **Phase 1 — T11 测试基建**：Vitest 32 单元测试全过 + Playwright e2e 骨架 + LLM eval 1 样本 100%

## What's Next

### 用户先做（部署前 W0 前置条件）

- [ ] 腾讯云华东（上海）账号开通 + **Lighthouse 实例** + **PostgreSQL CDB 实例**创建
- [ ] **DeepSeek API key**（`DEEPSEEK_API_KEY`）+ 充值 ≥100 元测试额度
- [ ] **豆包 API key**（`DOUBAO_API_KEY`）+ 配置 `DOUBAO_BASE_URL` / `DOUBAO_MODEL`
- [ ] **讯飞 API key**（`IFLYTEK_API_KEY`）+ 配置 `IFLYTEK_BASE_URL` / `IFLYTEK_MODEL`
- [ ] GitHub 仓库创建 + 配置 5 个 Actions Secrets（见 RUNBOOK.md 第 1 节）
- [ ] ICP 备案提交（不必下来，但外网访问需要）
- [ ] `.env.production.local` 在 Lighthouse 服务器上配好（DATABASE_URL 指 CDB 内网）

### AI 可做（等用户 W0 完成后）

- [ ] `npm run prisma migrate deploy`（连 CDB，创建 9 张表）
- [ ] 腾讯云控制台手动配 3 条监控告警（RUNBOOK.md 第 3 节）
- [ ] 截图归档：CDB 自动备份 / 跨区冷备 / 3 条告警策略 / 安全组
- [ ] Playwright e2e 全跑通（需真实 DB + ADMIN env）
- [ ] 甲方问 10 件 critical 事（V8 plan 第八节）
- [ ] SOW 给甲方签（含 V8 全部 20 项对齐）

### Phase 2 入口（W1.5 或 W2）

- 政策问答 UI / 双知识库 / wiki 编辑器
- 按 ROADMAP.md Phase 2 success criteria 执行

## Blockers

| Blocker | Impact | Mitigation |
|---|---|---|
| 腾讯云 CDB 未开通 | `prisma migrate deploy` 阻塞 | W0 第一步 |
| LLM API key 未到手 | T4 多供应商 fallback 无法验证 | W0 申请 3 家 |
| GitHub Secrets 未配 | deploy.yml 触发后 SSH 失败 | 开通 Lighthouse 后配 |
| ICP 备案未下来 | 外网域名访问不了 | 备案已提交则不影响 CI/CD |
| 等保是否要求未确认 | 影响后续 phase 安全要求 | 本周问甲方 |
| SOW 未签 | 合同层面交付风险 | 整理 V8 plan 走读给甲方 |

## Phase Transitions

| 时间 | 从 | 到 | 备注 |
|---|---|---|---|
| 2026-05-08 | Phase 0（初始化） | Phase 1（代码完成） | 11 个 task 完成，12 个 commits，等待 W0 前置条件后可部署验收 |

## Decisions Log

| 决策 | 选择 | 理由 |
|---|---|---|
| DB 访问层 | Prisma | 类型安全 + 自动 migration + AI 熟悉 |
| Fork 策略 | 新建 + 选择性 pull from career-report | 避免引入无关代码 |
| 监控方案 | 腾讯云监控 only（暂不接 Sentry） | CLB/CDB/Lighthouse 自带；Sentry 推后续 phase |
| LLM 供应商 | DeepSeek 主 + 豆包 + 讯飞 备 | INF-03 跨厂商真 fallback |
| Next.js 版本 | 16.2.3（当前 latest） | T7 发现 middleware.ts 已废弃，改用 proxy.ts |
| 包管理器 | npm（非 pnpm） | 本机只有 npm，与 career-report 一致 |

---

*Last updated: 2026-05-08 — Phase 1 代码完成，全部 11 tasks done*
