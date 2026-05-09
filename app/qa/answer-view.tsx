/**
 * 答案视图组件 — 由原 free-ask.tsx 内的 AnswerView 抽出。
 * 输入 { status, answer, citations }，输出 hit/partial/miss 徽章 + Markdown 答案 + 引用列表。
 * 同时被 SSR 答案页（首屏 turn）和 client conversation（后续 turn）复用。
 */

import ReactMarkdown from "react-markdown";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

export type AnswerStatus = "hit" | "partial" | "miss";

export interface AnswerResult {
  status: AnswerStatus;
  answer: string;
  citations: string[];
}

export function AnswerView({ result }: { result: AnswerResult }) {
  const badge =
    result.status === "hit"
      ? {
          Icon: CheckCircle2,
          label: "已命中知识库",
          color: "#15803d",
          bg: "#f0fdf4",
          border: "#bbf7d0",
        }
      : result.status === "partial"
        ? {
            Icon: AlertTriangle,
            label: "需窗口确认",
            color: "#b45309",
            bg: "#fffbeb",
            border: "#fde68a",
          }
        : {
            Icon: Info,
            label: "未命中（建议联系窗口）",
            color: "#475569",
            bg: "#f1f5f9",
            border: "#e2e8f0",
          };

  return (
    <div role="region" aria-label="回答结果" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.375rem 0.75rem",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: 500,
          color: badge.color,
          background: badge.bg,
          border: `1px solid ${badge.border}`,
          alignSelf: "flex-start",
        }}
      >
        <badge.Icon style={{ width: "14px", height: "14px" }} />
        {badge.label}
      </div>

      <article
        className="prose prose-zinc max-w-none text-sm"
        style={{ color: "#0f172a", fontSize: "14px", lineHeight: 1.7 }}
      >
        <ReactMarkdown>{result.answer}</ReactMarkdown>
      </article>

      {result.citations.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "#64748b",
              marginBottom: "0.5rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            引用来源
          </div>
          <ul style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "0.25rem", listStyle: "none", margin: 0, padding: 0 }}>
            {result.citations.map((c) => (
              <li key={c}>
                {c.startsWith("/wiki/") || c.startsWith("/qa/wiki/") ? (
                  <a href={c} style={{ color: "#2563eb", textDecoration: "none" }}>
                    {c}
                  </a>
                ) : (
                  <a
                    href={c}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#2563eb", textDecoration: "none", wordBreak: "break-all" }}
                  >
                    {c}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
