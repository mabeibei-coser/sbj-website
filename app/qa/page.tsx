import { Suspense } from "react";
import { QaTabs, type KbType } from "./qa-tabs";
import { HotCards } from "./hot-cards";
import { WikiList } from "./wiki-list";
import { FreeAsk } from "./free-ask";

interface PageProps {
  searchParams: Promise<{ kb?: string }>;
}

function parseKb(kb: string | undefined): KbType {
  return kb === "biz" ? "biz" : "policy";
}

export default async function QaPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const active = parseKb(sp.kb);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Hero (短型，左对齐) */}
      <section className="relative border-b border-[var(--border)] overflow-hidden">
        {/* 背景：蓝白渐变 + 极细网格 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--blue-50)] via-[var(--blue-50)] to-transparent" />
        <div className="absolute inset-0 hero-grid opacity-40" />
        <div className="relative max-w-5xl mx-auto px-6 py-[88px]">
          {/* Eyebrow — mono uppercase */}
          <div
            className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--blue-500)] mb-4"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            上海黄浦区社保局 · 智能政策助理
          </div>
          <h1
            className="text-4xl md:text-5xl font-semibold text-[var(--text-primary)] leading-tight"
            style={{ letterSpacing: "-0.04em" }}
          >
            政策问答
          </h1>
          <p className="text-[15px] text-[var(--text-muted)] mt-4 max-w-xl leading-relaxed">
            查询黄浦区就业、创业政策；命中知识库时给出真实引用与免责声明。
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Tabs */}
        <Suspense fallback={null}>
          <QaTabs active={active} />
        </Suspense>

        {/* 热点 cards */}
        <Suspense fallback={<div className="text-sm text-[var(--text-muted)]">载入热点...</div>}>
          <HotCards />
        </Suspense>

        {/* 自由问 */}
        <FreeAsk kbType={active} />

        {/* Wiki list */}
        <Suspense fallback={<div className="text-sm text-[var(--text-muted)]">载入知识库...</div>}>
          <WikiList kbType={active} />
        </Suspense>
      </div>
    </main>
  );
}
