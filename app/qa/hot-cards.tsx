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
    <section aria-label="热点问题" className="space-y-3">
      {/* Section eyebrow */}
      <div
        className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        常见热点
      </div>
      {items.map((q, idx) => (
        <details key={q.id} className="glass-card group border border-[var(--border)]">
          <summary className="cursor-pointer list-none flex items-center gap-4 px-6 py-4">
            {/* 序号 */}
            <span
              className="shrink-0 w-6 h-6 rounded-full bg-[var(--blue-100)] text-[var(--blue-700)] text-[11px] font-medium flex items-center justify-center tabular-nums"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {idx + 1}
            </span>
            <h3 className="flex-1 text-[15px] font-medium text-[var(--text-primary)] leading-snug">
              {q.title}
            </h3>
            {/* chevron indicator */}
            <span className="shrink-0 text-[var(--text-muted)] group-open:rotate-180 transition-transform duration-200">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </summary>
          <div className="px-6 pb-5 pt-1">
            <div className="border-t border-[var(--border)] pt-4">
              <article className="prose prose-zinc max-w-none text-sm">
                <ReactMarkdown>{q.body}</ReactMarkdown>
              </article>
              {q.updatedAt && (
                <p
                  className="text-[11px] text-[var(--text-muted)] mt-3 tabular-nums"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  最近更新：{q.updatedAt}
                </p>
              )}
            </div>
          </div>
        </details>
      ))}
    </section>
  );
}
