import Link from "next/link";
import { listWikiPages, type WikiPageRow } from "@/lib/qa/wiki";
import type { KbType } from "./qa-tabs";

export const dynamic = "force-dynamic";

interface WikiListProps {
  kbType: KbType;
}

export async function WikiList({ kbType }: WikiListProps) {
  let pages: WikiPageRow[] = [];
  try {
    pages = await listWikiPages(kbType);
  } catch (err) {
    console.error("[wiki-list] failed:", err);
  }

  if (pages.length === 0) {
    return (
      <section aria-label="知识库文章" className="glass-card p-6">
        <h2 className="text-lg font-medium mb-2">知识库</h2>
        <p className="text-sm text-[var(--text-muted)]">
          {kbType === "policy" ? "政策与办事库" : "创业与行业库"} 暂无内容。
        </p>
      </section>
    );
  }

  return (
    <section aria-label="知识库文章" className="glass-card p-6">
      <h2 className="text-lg font-medium mb-4">
        {kbType === "policy" ? "政策与办事库" : "创业与行业库"}（{pages.length}）
      </h2>
      <ul className="divide-y divide-[var(--border)]">
        {pages.map((p) => (
          <li key={p.id} className="py-3">
            <Link
              href={`/qa/wiki/${p.kbType}/${p.slug}`}
              className="block hover:bg-[var(--surface-hover)] rounded px-2 -mx-2 transition-colors"
            >
              <div className="text-sm font-medium text-[var(--text-primary)]">{p.title}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                更新：{p.updatedAt.toLocaleDateString("zh-CN")}
                {p.version > 1 && ` · v${p.version}`}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
