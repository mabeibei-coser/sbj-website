import { getHotQuestions } from "@/lib/qa/hot-questions";
import { HotCardItem } from "./hot-card-item";

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
        <HotCardItem
          key={q.id}
          index={idx}
          title={q.title}
          body={q.body}
          updatedAt={q.updatedAt}
        />
      ))}
    </section>
  );
}
