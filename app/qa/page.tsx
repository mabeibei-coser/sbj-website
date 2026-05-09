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
    <main style={{ minHeight: "100vh", background: "#fbfcfd" }}>
      {/* Hero (短型，左对齐) */}
      <section
        style={{
          position: "relative",
          borderBottom: "1px solid #e5e7eb",
          overflow: "hidden",
          background: "linear-gradient(180deg, #eff6fb 0%, #eff6fb 40%, #ffffff 100%)",
        }}
      >
        <div
          style={{
            position: "relative",
            maxWidth: "64rem",
            margin: "0 auto",
            padding: "88px 1.5rem",
          }}
        >
          {/* Eyebrow — mono uppercase */}
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "#2563eb",
              marginBottom: "1rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            上海黄浦区社保局 · 智能政策助理
          </div>
          <h1
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3rem)",
              fontWeight: 600,
              color: "#0f172a",
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: "-0.04em",
            }}
          >
            政策问答
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "#64748b",
              marginTop: "1rem",
              maxWidth: "36rem",
              lineHeight: 1.6,
              marginBottom: 0,
            }}
          >
            查询黄浦区就业、创业政策；命中知识库时给出真实引用与免责声明。
          </p>
        </div>
      </section>

      <div
        style={{
          maxWidth: "64rem",
          marginLeft: "auto",
          marginRight: "auto",
          padding: "2rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
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
