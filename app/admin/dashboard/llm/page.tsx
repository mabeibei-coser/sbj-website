/**
 * LLM 调用监控 dashboard (INF-10 自建部分)
 *
 * 路径: /admin/dashboard/llm (要登录, middleware 拦)
 *
 * Phase 1 最简版:
 * - 最近 7 天每日调用次数 + 失败率
 * - 按 vendor 聚合 (DeepSeek/豆包/讯飞 各自)
 * - 月度累计 cost (分)
 *
 * 后续 phase 美化:
 * - Phase 2 加图表 (recharts)
 * - Phase 4 加 caller 维度切片
 * - Phase 7 加月度对账接口
 *
 * 监控 API 错误率 / DB CPU / 备份等走腾讯云控制台 (见 docs/RUNBOOK.md)
 */

import { prisma } from "@/lib/db";
import Link from "next/link";

// 每次请求都查 DB, 不要静态化 (会缓存陈旧数据)
export const dynamic = "force-dynamic";

interface DailyStat {
  date: string;
  vendor: string;
  total: number;
  failed: number;
  costCents: number;
}

async function loadStats(): Promise<{ daily: DailyStat[]; monthCostCents: number }> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // 用 raw SQL 聚合更快; Phase 1 用 Prisma groupBy 简单点
  const rows = await prisma.llmCallLog.groupBy({
    by: ["vendor", "status"],
    where: { createdAt: { gte: sevenDaysAgo } },
    _count: { _all: true },
    _sum: { costCents: true },
  });

  // 简化: 不按 day 切，只按 vendor 聚合 7 天总和 (Phase 1 占位)
  const byVendor = new Map<string, { total: number; failed: number; costCents: number }>();
  for (const r of rows) {
    const cur = byVendor.get(r.vendor) ?? { total: 0, failed: 0, costCents: 0 };
    cur.total += r._count._all;
    if (r.status !== "success") cur.failed += r._count._all;
    cur.costCents += r._sum.costCents ?? 0;
    byVendor.set(r.vendor, cur);
  }
  const daily: DailyStat[] = [...byVendor.entries()].map(([vendor, v]) => ({
    date: "近 7 天",
    vendor,
    total: v.total,
    failed: v.failed,
    costCents: v.costCents,
  }));

  // 月度 cost (跨 vendor 总和)
  const month = await prisma.llmCallLog.aggregate({
    where: { createdAt: { gte: monthStart } },
    _sum: { costCents: true },
  });

  return { daily, monthCostCents: month._sum.costCents ?? 0 };
}

export default async function LlmDashboardPage() {
  let data: Awaited<ReturnType<typeof loadStats>>;
  try {
    data = await loadStats();
  } catch (err) {
    return (
      <main className="flex-1 p-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-2xl font-semibold">LLM 监控</h1>
          <p className="text-red-600">
            数据库不可用: {err instanceof Error ? err.message : String(err)}
          </p>
          <p className="text-sm text-gray-500">
            请检查腾讯云 CDB 实例 + DATABASE_URL 是否正确。
          </p>
        </div>
      </main>
    );
  }
  const { daily, monthCostCents } = data;

  return (
    <main className="flex-1 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">LLM 监控</h1>
          <Link href="/admin" className="text-sm text-gray-600 underline">
            ← 返回后台
          </Link>
        </header>

        <section className="rounded-lg border border-gray-200 p-6 space-y-2">
          <h2 className="text-base font-medium">本月累计成本</h2>
          <p className="text-3xl font-semibold">
            {(monthCostCents / 100).toFixed(2)}{" "}
            <span className="text-sm font-normal text-gray-500">元</span>
          </p>
          <p className="text-sm text-gray-500">
            阈值告警走腾讯云控制台配置 (RUNBOOK 第 3 节)。月度 100 元为 W1 默认告警线。
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 p-6 space-y-3">
          <h2 className="text-base font-medium">最近 7 天 (按 vendor 聚合)</h2>
          {daily.length === 0 ? (
            <p className="text-sm text-gray-500">暂无调用记录。</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-gray-600 border-b">
                <tr>
                  <th className="py-2">Vendor</th>
                  <th className="py-2 text-right">调用次数</th>
                  <th className="py-2 text-right">失败次数</th>
                  <th className="py-2 text-right">失败率</th>
                  <th className="py-2 text-right">7 日累计 (元)</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((row) => {
                  const failRate = row.total === 0 ? 0 : (row.failed / row.total) * 100;
                  return (
                    <tr key={row.vendor} className="border-b last:border-b-0">
                      <td className="py-2">{row.vendor}</td>
                      <td className="py-2 text-right">{row.total}</td>
                      <td className="py-2 text-right">{row.failed}</td>
                      <td className="py-2 text-right">
                        <span className={failRate > 5 ? "text-red-600" : ""}>
                          {failRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 text-right">{(row.costCents / 100).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
          <p className="font-medium mb-2">Phase 1 占位说明</p>
          <ul className="list-disc list-inside space-y-1">
            <li>本页面只看 vendor 维度聚合</li>
            <li>按日期切片 + 折线图留 Phase 2 (recharts)</li>
            <li>API 错误率 / DB CPU / 备份监控走腾讯云控制台告警</li>
            <li>详细配置项见 <code>docs/RUNBOOK.md</code></li>
          </ul>
        </section>
      </div>
    </main>
  );
}
