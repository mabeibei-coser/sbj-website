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

  return (
    <section aria-label="自由问" className="glass-card p-6 space-y-4">
      <div>
        <h2 className="text-lg font-medium">自由问</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          输入您的问题，命中知识库时给出真实引用 + 1000 字内 + 免责声明；未命中时建议联系窗口。
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label htmlFor="qa-question" className="sr-only">问题</label>
        <textarea
          id="qa-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION_LEN))}
          maxLength={MAX_QUESTION_LEN}
          disabled={submitting}
          rows={3}
          placeholder={kbType === "policy" ? "例：青年初次就业有哪些补贴？" : "例：黄浦区有哪些创业孵化基地？"}
          className="w-full p-3 rounded-md border border-[var(--border)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue-500)] disabled:opacity-50"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            {question.length} / {MAX_QUESTION_LEN}
          </span>
          <button
            type="submit"
            disabled={submitting || question.trim().length < 2}
            className="px-5 py-2 bg-[var(--blue-500)] text-white text-sm rounded-md font-medium disabled:opacity-50 hover:bg-[var(--blue-600)] transition-colors flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "查询中..." : "提交"}
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="text-sm text-[var(--negative)] bg-[var(--negative-bg)] p-3 rounded-md">
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
