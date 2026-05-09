import Link from "next/link";
import { listWikiPages } from "@/lib/qa/wiki";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ kb?: string; q?: string }>;
}

function parseKb(s: string | undefined): "policy" | "biz" | null {
  return s === "policy" || s === "biz" ? s : null;
}

export default async function AdminWikiListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const kbFilter = parseKb(sp.kb);
  const qFilter = sp.q?.trim() || undefined;

  let pages;
  try {
    pages = await listWikiPages(kbFilter, qFilter);
  } catch (err) {
    return (
      <main className="flex-1 p-8">
        <p className="text-sm text-red-600">
          加载失败：{err instanceof Error ? err.message : String(err)}
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Wiki 编辑</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              编辑政策与办事库 / 创业与行业库
            </p>
          </div>
          <Link
            href="/admin"
            className="text-sm text-[var(--blue-500)] hover:underline"
          >
            ← 返回后台
          </Link>
        </header>

        {/* 筛选 + 搜索 */}
        <form className="flex gap-3 items-center" method="get">
          <div
            role="tablist"
            className="flex border border-[var(--border)] rounded-md overflow-hidden"
          >
            {[
              { value: "", label: "全部" },
              { value: "policy", label: "政策" },
              { value: "biz", label: "创业" },
            ].map((opt) => {
              const active = (kbFilter ?? "") === opt.value;
              return (
                <a
                  key={opt.value}
                  href={`/admin/wiki?${new URLSearchParams({
                    ...(opt.value ? { kb: opt.value } : {}),
                    ...(qFilter ? { q: qFilter } : {}),
                  }).toString()}`}
                  className={`px-4 py-1.5 text-sm ${
                    active
                      ? "bg-[var(--blue-500)] text-white"
                      : "bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {opt.label}
                </a>
              );
            })}
          </div>
          <input
            type="text"
            name="q"
            defaultValue={qFilter ?? ""}
            placeholder="搜索标题..."
            className="flex-1 max-w-sm px-3 py-1.5 border border-[var(--border)] rounded-md text-sm"
          />
          {kbFilter && <input type="hidden" name="kb" value={kbFilter} />}
          <button
            type="submit"
            className="px-4 py-1.5 text-sm border border-[var(--border)] rounded-md hover:bg-[var(--surface-hover)]"
          >
            搜索
          </button>
        </form>

        <p className="text-xs text-[var(--text-muted)]">{pages.length} 篇</p>

        {/* 列表 */}
        <table className="w-full text-sm border-collapse">
          <thead className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
            <tr>
              <th className="pb-2 pr-4">类型</th>
              <th className="pb-2 pr-4">标题</th>
              <th className="pb-2 pr-4">slug</th>
              <th className="pb-2 pr-4">版本</th>
              <th className="pb-2 pr-4">更新于</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr
                key={p.id}
                className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]"
              >
                <td className="py-2 pr-4 text-xs text-[var(--text-muted)] uppercase">
                  {p.kbType}
                </td>
                <td className="py-2 pr-4 font-medium">{p.title}</td>
                <td className="py-2 pr-4 text-xs text-[var(--text-muted)] font-mono">
                  {p.slug}
                </td>
                <td className="py-2 pr-4 tabular-nums">v{p.version}</td>
                <td className="py-2 pr-4 text-xs text-[var(--text-muted)] tabular-nums">
                  {new Date(p.updatedAt).toLocaleDateString("zh-CN")}
                </td>
                <td className="py-2 text-right">
                  <Link
                    href={`/admin/wiki/${p.id}`}
                    className="text-[var(--blue-500)] hover:underline"
                  >
                    编辑 →
                  </Link>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-[var(--text-muted)]"
                >
                  暂无 wiki 内容。运行{" "}
                  <code className="bg-[var(--surface-muted)] px-1 rounded">
                    npm run wiki:compile -- --kb=policy --publish
                  </code>{" "}
                  编译生成。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
