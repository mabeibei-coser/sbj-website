import { getHotQuestions } from "@/lib/qa/hot-questions";
import { QaSearchBox } from "./qa-search-box";

export default async function QaPage() {
  const [policy, biz] = await Promise.all([
    getHotQuestions("policy").catch(() => []),
    getHotQuestions("biz").catch(() => []),
  ]);

  return (
    <main style={{ minHeight: "100vh", background: "#fbfcfd" }}>
      <section
        style={{
          position: "relative",
          background: "linear-gradient(180deg, #eff6fb 0%, #f7fbfd 60%, #ffffff 100%)",
          borderBottom: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        {/* AI 装饰：右上角散光斑 + 左下角光晕 */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "-6rem",
            right: "-6rem",
            width: "20rem",
            height: "20rem",
            background: "radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0) 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "-4rem",
            left: "-4rem",
            width: "16rem",
            height: "16rem",
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, rgba(99, 102, 241, 0) 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            maxWidth: "56rem",
            margin: "0 auto",
            padding: "4.5rem 1.5rem 3.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* AI 状态条：脉动绿点 + 实时检索 */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.375rem 0.875rem",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.7)",
              border: "1px solid #dbeafe",
              fontSize: "12px",
              fontWeight: 500,
              color: "#1e293b",
              marginBottom: "1.75rem",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <span
              className="qa-ai-pulse"
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#22c55e",
                flexShrink: 0,
              }}
            />
            <span style={{ color: "#475569" }}>AI 助理在线</span>
            <span style={{ color: "#cbd5e1" }}>·</span>
            <span style={{ color: "#1e40af", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              黄浦区政策库
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2.25rem, 6.5vw, 4rem)",
              fontWeight: 600,
              color: "#0f172a",
              lineHeight: 1.05,
              letterSpacing: "-0.045em",
              margin: 0,
              marginBottom: "2.25rem",
            }}
          >
            黄浦区就业创业问答
          </h1>

          <div style={{ width: "100%", maxWidth: "44rem" }}>
            <QaSearchBox
              variant="hero"
              hotByKb={{ policy, biz }}
              initialKb="policy"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
