# sbj-website 运维 Runbook

> Phase 1 W1 初版。覆盖部署、备份、监控告警的腾讯云控制台具体配置项。
> 后续 phase 按需补充。

---

## 1. 部署架构

```
GitHub repo (sbj-website)
        │ push to main
        ▼
GitHub Actions CI (.github/workflows/ci.yml)
        │ 全绿
        ▼
GitHub Actions Deploy (.github/workflows/deploy.yml)
        │ SSH
        ▼
腾讯云 Lighthouse (华东·上海)
   ├── Node.js 20 + pm2 + Next.js 16
   ├── 域名 (待 ICP 备案)
   └── PostgreSQL 16 (CDB) ← 字段加密 / 审计日志 / 业务数据
```

### 服务器初始化清单 (W0 一次性)

```bash
# SSH 到 Lighthouse
ssh ubuntu@<TENCENT_HOST>

# 装 Node.js 20 (官方 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 装 PM2
sudo npm i -g pm2

# clone repo
cd /home/ubuntu
git clone <YOUR_GITHUB_REPO_URL> sbj-website
cd sbj-website

# 配 .env.production.local (从凭证清单复制 + 改 DATABASE_URL 为 CDB 内网地址)
cp .env.example .env.production.local
vim .env.production.local

# 第一次启动
npm ci --no-audit --no-fund
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # 跟着提示装开机自启 systemd 单元

# 配 nginx 反向代理 + ssl (备案后)
# 略, 见后续 Phase 7
```

### GitHub Secrets (Repo Settings → Secrets and variables → Actions)

| Secret | 用途 |
|---|---|
| `TENCENT_HOST` | Lighthouse 公网 IP 或备案域名 |
| `TENCENT_USER` | SSH 用户 (默认 `ubuntu`) |
| `TENCENT_SSH_KEY` | SSH 私钥整段文本 (`-----BEGIN OPENSSH PRIVATE KEY-----` ... `-----END OPENSSH PRIVATE KEY-----`) |
| `TENCENT_PORT` | SSH 端口 (默认 22, Lighthouse 安全组要放通) |
| `TENCENT_DEPLOY_PATH` | 服务器代码路径, e.g. `/home/ubuntu/sbj-website` |

---

## 2. 数据备份 (INF-09)

### 2.1 自动每日全量备份

**位置**: 腾讯云 CDB 控制台 → 实例 → 备份恢复 → 自动备份设置

**配置**:
- 备份周期: **每天**
- 备份开始时间: **凌晨 02:00 - 06:00** (业务低峰)
- 备份保留: **7 天**
- 备份方式: 物理备份 (默认)

### 2.2 跨区冷备 (灾备)

**位置**: 腾讯云 CDB 控制台 → 实例 → 备份恢复 → 跨地域备份

**配置**:
- 目标地域: **华南广州**
- 备份保留: **30 天**
- 频率: **每天 (随主备份)**

### 2.3 备份恢复演练

**频率**: Phase 7 上线前一次 + 每季度一次

**步骤**:
1. CDB 控制台 → 备份恢复 → 选择最近一次备份 → 恢复到新实例
2. 改 `.env.production.local` 的 `DATABASE_URL` 指向新实例
3. 重启 pm2 (`pm2 restart sbj-website`)
4. 跑 `e2e/admin-login.spec.ts + e2e/pipl-flow.spec.ts` 验证
5. 记录 RTO (Recovery Time Objective) 到本文档

---

## 3. 监控告警 (INF-10)

### 3.1 腾讯云监控告警 (控制台配)

**位置**: 腾讯云监控 → 告警管理 → 告警策略 → 新建

#### 策略 1: API 错误率 > 5%

- 关联资源: **CLB 实例 (sbj-clb)**
- 触发条件: `5xx 比例 > 5%` 持续 **5 分钟**
- 通知方式: **邮件 + 短信** (用户手机号)

#### 策略 2: DB CPU > 80%

- 关联资源: **CDB 实例 (sbj-prod)**
- 触发条件: `CPU 利用率 > 80%` 持续 **5 分钟**
- 通知方式: **邮件**

#### 策略 3: LLM 月度成本 > 100 元

- 数据源: 自建 dashboard (`/admin/dashboard/llm` 月度累计)
- 触发条件: 当 monthCostCents > 10000 时, 通过 webhook 发送
- Phase 1 暂手动巡查; Phase 2 加 cron 接入腾讯云 webhook

### 3.2 自建 dashboard

**位置**: `/admin/dashboard/llm` (登录后访问)

**包含**:
- 本月累计 LLM 成本 (跨 vendor 总和)
- 最近 7 天调用次数 / 失败次数 / 失败率 (按 vendor)

**数据源**: `llm_call_logs` 表 (T5 lib/audit.ts logLlmCall 写入)

**关键 SQL** (Phase 1 用 Prisma groupBy, Phase 2 改 raw SQL 加性能):
```sql
SELECT vendor, status, COUNT(*) as total, SUM(cost_cents) as cost
FROM llm_call_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY vendor, status;
```

### 3.3 健康检查接口 (W1.5 待补)

- `GET /api/health`: 返回 200 + 简单状态 (DB ping + LLM vendor reachable)
- 用于 CLB 健康检查 + 部署后冒烟

---

## 4. 常见运维场景

### 4.1 部署失败回滚

```bash
# SSH 到 Lighthouse
cd /home/ubuntu/sbj-website
git log --oneline -5             # 看最近 5 个 commit
git reset --hard <last-good-sha> # 回到上一个稳定版
npm ci --no-audit --no-fund
npm run build
pm2 restart sbj-website
```

### 4.2 LLM key 失效紧急切换

`.env.production.local` 是单一真相. 改对应 vendor 的 `XXX_API_KEY` 即可:

```bash
vim .env.production.local
# 改完
pm2 restart sbj-website  # PM2 重启时重新读 env
```

如某档 vendor 长期故障, 让 `lib/llm-client.ts` 跳过该档:

```bash
# 临时把 KEY 设为空, fallback 自动绕过
DEEPSEEK_API_KEY=
```

### 4.3 数据库快速排查

```bash
# 进 psql (CDB 内网地址)
psql $DATABASE_URL

# 看连接数
SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();

# 看慢查询
SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

# 看表大小
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;
```

### 4.4 PIPL 工单处理

用户来电要求删除/导出数据:

1. 核对来电号码 = 注册手机号 (Phase 2 后接 OTP 自助)
2. POST `/api/citizen/data/export` 拿 JSON, 整理给用户 (邮件)
3. 等用户确认后 POST `/api/citizen/data/delete`
4. 在 `audit_logs` 中 grep `pipl.delete.success` 留证

---

## 5. 截图归档

腾讯云控制台配置项截图统一放: `<COS bucket>/sbj-website/runbook-screenshots/<日期>-<场景>.png`

W1 待截:
- [ ] CDB 自动备份配置截图
- [ ] CDB 跨区冷备配置截图
- [ ] 监控告警 3 条策略截图
- [ ] Lighthouse 安全组规则截图

---

*最后更新: Phase 1 (W1) 初版, 2026-05-08*
