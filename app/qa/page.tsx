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
      <section className="relative border-b border-[var(--border)] bg-gradient-to-b from-[var(--blue-50)] to-transparent">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-xs text-[var(--blue-500)] uppercase tracking-wider mb-2">
            上海黄浦区社保局 · 智能政策助理
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-[var(--text-primary)]">
            政策问答
          </h1>
          <p className="text-base text-[var(--text-muted)] mt-3 max-w-2xl">
            双库切换查询黄浦区就业、创业相关政策；3 个常见热点一键展开；其他问题用自由问，命中知识库时给出真实引用与免责声明。
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
