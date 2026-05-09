import { getHotQuestions } from "@/lib/qa/hot-questions";
import ReactMarkdown from "react-markdown";

export async function HotCards() {
  let items;
  try {
    items = await getHotQuestions();
  } catch (err) {
    console.error("[hot-cards] failed:", err);
    return (
      <section aria-label="热点问题">
        <p className="text-sm text-[var(--text-muted)]">热点暂时不可用，请稍后再试。</p>
      </section>
    );
  }

  return (
    <section aria-label="热点问题" className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((q) => (
        <details key={q.id} className="glass-card p-6 group">
          <summary className="cursor-pointer list-none">
            <div className="text-xs text-[var(--text-muted)] mb-1">热点 {q.id.toUpperCase()}</div>
            <h3 className="text-lg font-medium text-[var(--text-primary)]">{q.title}</h3>
            <span className="text-xs text-[var(--blue-500)] mt-2 inline-block group-open:hidden">点击展开</span>
            <span className="text-xs text-[var(--blue-500)] mt-2 hidden group-open:inline-block">收起</span>
          </summary>
          <article className="prose prose-zinc max-w-none mt-4 text-sm">
            <ReactMarkdown>{q.body}</ReactMarkdown>
          </article>
          {q.updatedAt && (
            <p className="text-xs text-[var(--text-muted)] mt-3">最近更新：{q.updatedAt}</p>
          )}
        </details>
      ))}
    </section>
  );
}
