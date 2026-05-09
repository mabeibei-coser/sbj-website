"use client";

import { useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import type { KbType } from "./qa-tabs";

type AnswerStatus = "hit" | "partial" | "miss";

interface AnswerResult {
  status: AnswerStatus;
  answer: string;
  citations: string[];
}

interface FreeAskProps {
  kbType: KbType;
}

const MAX_QUESTION_LEN = 500;

export function FreeAsk({ kbType }: FreeAskProps) {
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (question.trim().length < 2 || submitting) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/qa/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: question.trim(), kbType }),
      });
      const data = (await res.json()) as Partial<AnswerResult> & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "服务暂时不可用，请稍后重试");
        return;
      }
      if (!data.status || !data.answer) {
        setError("响应数据异常");
        return;
      }
      setResult({
        status: data.status as AnswerStatus,
        answer: data.answer,
        citations: data.citations ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  const submitDisabled = submitting || question.trim().length < 2;

  return (
    <section
      aria-label="自由问"
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04)",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div>
        {/* Section eyebrow */}
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
          智能问答
        </div>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: 600,
            color: "#0f172a",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          自由问
        </h2>
        <p style={{ fontSize: "13px", color: "#64748b", marginTop: "6px", marginBottom: 0 }}>
          命中知识库时给出真实引用与免责声明；未命中时建议联系窗口。
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        <label
          htmlFor="qa-question"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            borderWidth: 0,
          }}
        >
          问题
        </label>
        <textarea
          id="qa-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION_LEN))}
          maxLength={MAX_QUESTION_LEN}
          disabled={submitting}
          rows={3}
          placeholder={kbType === "policy" ? "例：青年初次就业有哪些补贴？" : "例：黄浦区有哪些创业孵化基地？"}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "6px",
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            fontSize: "14px",
            fontFamily: "inherit",
            resize: "vertical",
            opacity: submitting ? 0.5 : 1,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontVariantNumeric: "tabular-nums" }}>
            {question.length} / {MAX_QUESTION_LEN}
          </span>
          <button
            type="submit"
            disabled={submitDisabled}
            style={{
              padding: "0.5rem 1.25rem",
              background: submitDisabled ? "#93c5fd" : "#2563eb",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 500,
              borderRadius: "6px",
              border: "none",
              cursor: submitDisabled ? "not-allowed" : "pointer",
              opacity: submitDisabled ? 0.7 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "background 150ms",
            }}
          >
            {submitting && <Loader2 style={{ width: "1rem", height: "1rem" }} className="animate-spin" />}
            {submitting ? "查询中..." : "查询"}
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          style={{
            fontSize: "14px",
            color: "#b91c1c",
            background: "#fef2f2",
            padding: "0.75rem",
            borderRadius: "6px",
          }}
        >
          {error}
        </div>
      )}

      {result && <AnswerView result={result} />}
    </section>
  );
}

function AnswerView({ result }: { result: AnswerResult }) {
  const badge =
    result.status === "hit"
      ? { Icon: CheckCircle2, label: "已命中知识库", color: "text-[var(--positive)]", bg: "bg-[var(--positive-bg)]" }
      : result.status === "partial"
        ? { Icon: AlertTriangle, label: "需窗口确认", color: "text-[var(--warning)]", bg: "bg-[var(--warning-bg)]" }
        : { Icon: Info, label: "未命中（建议联系窗口）", color: "text-[var(--text-muted)]", bg: "bg-[var(--surface-muted)]" };

  return (
    <div role="region" aria-label="回答结果" className="space-y-3 pt-3 border-t border-[var(--border)]">
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-medium ${badge.color} ${badge.bg}`}>
        <badge.Icon className="h-3.5 w-3.5" />
        {badge.label}
      </div>

      <article className="prose prose-zinc max-w-none text-sm">
        <ReactMarkdown>{result.answer}</ReactMarkdown>
      </article>

      {result.citations.length > 0 && (
        <div>
          <div className="text-xs font-medium text-[var(--text-muted)] mb-2">引用来源</div>
          <ul className="text-xs space-y-1">
            {result.citations.map((c) => (
              <li key={c}>
                {c.startsWith("/wiki/") ? (
                  <a href={c} className="text-[var(--blue-500)] hover:underline">{c}</a>
                ) : (
                  <a href={c} target="_blank" rel="noopener noreferrer" className="text-[var(--blue-500)] hover:underline">{c}</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
