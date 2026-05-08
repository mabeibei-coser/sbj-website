# STATE — sbj-website

> 项目记忆。每次切换 phase / 完成关键节点时更新。

---

## Current State

**Phase:** Phase 1 — 脚手架 + 工程基建（W1）代码完成，待部署
**Status:** CODE COMPLETE — 等待 W0 前置条件（腾讯云 + API key + GitHub secrets）后部署验收
**Last Updated:** 2026-05-08

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
  - 关键发现：上游 `llm-wiki-compiler` 是 Claude Code 插件不可直接用 → 改走"拆 prompt + DeepSeek 重写最简版"
  - 实现：`experiments/llm-wiki-poc/`（2666+ 行 + 4 commits），DeepSeek `deepseek-v4-flash` + MinerU Agent API
  - 评估：3 份政策素材（创卡 PDF + 2 微信文章）→ 1 主题 / 111 行文章 / 15k tokens / 44s
  - 评分：D1=5/5（中文政策准确性）+ D2=5/5（引用回链正确性） → 加权 100/100，PASS
  - 详见：`experiments/llm-wiki-poc/EVAL.md` + `docs/W0-LLM-Wiki-eval.md`
- [x] **W2 build path 锁定**：fork `experiments/llm-wiki-poc/prompts/` + `scripts/compile.ts`，工程化为 `app/api/wiki/compile` + 审计日志 + token 预算
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
- [x] **Codex security review**：iron-session 静态密码降级漏洞修复（proxy.ts）+ hashField 改 HMAC-SHA256（encryption.ts）

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
- **前置**：从甲方拿政策 PDF 原件（QA-02/03 知识库素材）；确认 Q3 黄浦创卡来源（QA-10）

## Blockers

| Blocker | Impact | Mitigation |
|---|---|---|
| 腾讯云 CDB 未开通 | `prisma migrate deploy` 阻塞 | W0 第一步 |
| LLM API key 未到手 | T4 多供应商 fallback 无法验证 | W0 申请 3 家 |
| GitHub Secrets 未配 | deploy.yml 触发后 SSH 失败 | 开通 Lighthouse 后配 |
| ~~ICP 备案未下来~~ | ~~外网域名访问不了~~ | **已解除**：部署在 h100.jsai100.com，jsai100.com 主体已备案 |
| 等保是否要求未确认 | 影响后续 phase 安全要求 | 本周问甲方 |
| SOW 未签 | 合同层面交付风险 | 整理 V8 plan 走读给甲方 |
| 政策 PDF 原件未到手 | Phase 2 wiki KB 阻塞 | 问甲方要文件清单 |

## Phase Transitions

| 时间 | 从 | 到 | 备注 |
|---|---|---|---|
| 2026-05-08 | (init) | Phase 0 Slice B PASS | LLM Wiki PoC D1+D2 100/100 |
| 2026-05-08 | Phase 0 | Phase 1（代码完成） | 11 个 task 完成，12 个 commits，等待 W0 前置条件后可部署验收 |

## Decisions Log

| 决策 | 选择 | 理由 |
|---|---|---|
| 用 llm-wiki-compiler 作 W2 wiki 工具 | **部分推翻** — 改"拆 prompt + DeepSeek 重写最简版" | 上游是 Claude Code 插件不可直接换 DeepSeek；路径合规且 W2 production 可直接复用 |
| LLM Wiki 编译方案的可行性 | **Validated** — D1+D2 加权 100/100，W2 不切 RAG fallback | 3 文件 / 111 行 / 44s |
| DB 访问层 | Prisma | 类型安全 + 自动 migration + AI 熟悉 |
| Fork 策略 | 新建 + 选择性 pull from career-report | 避免引入无关代码 |
| 监控方案 | 腾讯云监控 only（暂不接 Sentry） | CLB/CDB/Lighthouse 自带；Sentry 推后续 phase |
| LLM 供应商 | DeepSeek 主 + 豆包 + 讯飞 备 | INF-03 跨厂商真 fallback |
| Next.js 版本 | 16.2.3（当前 latest） | T7 发现 middleware.ts 已废弃，改用 proxy.ts |
| 包管理器 | npm（非 pnpm） | 本机只有 npm，与 career-report 一致 |
| hashField 算法 | HMAC-SHA256（keyed on FIELD_ENCRYPTION_KEY） | 手机号 37-bit 熵，裸 SHA-256 可枚举；HMAC 需同时拿到密钥才能枚举 |
| iron-session 密码缺失策略 | 返回 503 / redirect with error | 静态降级密码可被攻击者利用伪造 session；缺失时直接报错更安全 |

---

*Last updated: 2026-05-08 — Phase 1 代码完成 + Codex security review 修复，推送 GitHub*
