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
        <div
          style={{
            maxWidth: "56rem",
            margin: "0 auto",
            padding: "5rem 1.5rem 4rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "#2563eb",
              marginBottom: "1rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            上海黄浦区社保局 · 智能政策助理
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 6vw, 3.75rem)",
              fontWeight: 600,
              color: "#0f172a",
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              margin: 0,
            }}
          >
            黄浦区就业创业问答
          </h1>

          <p
            style={{
              fontSize: "15px",
              color: "#64748b",
              marginTop: "1rem",
              marginBottom: "2.5rem",
              maxWidth: "32rem",
              lineHeight: 1.6,
            }}
          >
            查询黄浦区就业、创业政策；命中知识库时给出真实引用与免责声明。
          </p>

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
