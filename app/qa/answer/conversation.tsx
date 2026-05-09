"use client";

/**
 * 对话流容器（client）。
 *
 * 接受 SSR 渲染的首屏 turn 作为初始 state。
 * 用户在底部 sticky 输入框提交后，client 调 /api/qa/answer 拿新答案，
 * 追加到 turns 列表末尾，URL 不变（与 SSR 首屏区分：URL 只代表会话起点）。
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

import { QaSearchBox } from "../qa-search-box";
import { AnswerView, type AnswerResult } from "../answer-view";
import type { KbType } from "@/lib/qa/hot-questions";

export interface Turn {
  id: number;
  question: string;
  kb: KbType;
  result: AnswerResult | null; // null = 正在加载
  error?: string;
}

const KB_LABEL: Record<KbType, string> = { policy: "就业", biz: "创业" };

export function Conversation({ initialTurn }: { initialTurn: Turn }) {
  const [turns, setTurns] = useState<Turn[]>([initialTurn]);
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新 turn 出现时滚动到底
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, pending]);

  async function handleSubmit(question: string, kb: KbType) {
    if (pending) return;
    const nextId = turns.length + 1;
    setTurns((prev) => [...prev, { id: nextId, question, kb, result: null }]);
    setPending(true);
    try {
      const res = await fetch("/api/qa/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, kbType: kb }),
      });
      const data = (await res.json()) as Partial<AnswerResult> & { error?: string };
      if (!res.ok || !data.status || !data.answer) {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === nextId
              ? { ...t, error: data.error ?? "服务暂时不可用，请稍后重试" }
              : t
          )
        );
        return;
      }
      setTurns((prev) =>
        prev.map((t) =>
          t.id === nextId
            ? {
                ...t,
                result: {
                  status: data.status as AnswerResult["status"],
                  answer: data.answer as string,
                  citations: data.citations ?? [],
                },
              }
            : t
        )
      );
    } catch (err) {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === nextId
            ? { ...t, error: err instanceof Error ? err.message : "网络错误" }
            : t
        )
      );
    } finally {
      setPending(false);
    }
  }

  const lastKb = turns[turns.length - 1]?.kb ?? initialTurn.kb;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        maxWidth: "48rem",
        width: "100%",
        margin: "0 auto",
        padding: "1.5rem 1.5rem 0",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", paddingBottom: "8rem" }}>
        {turns.map((turn) => (
          <TurnBlock key={turn.id} turn={turn} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* sticky 底部输入框 */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          paddingTop: "1rem",
          paddingBottom: "1.5rem",
          background:
            "linear-gradient(180deg, rgba(251, 252, 253, 0) 0%, rgba(251, 252, 253, 0.95) 30%, #fbfcfd 70%)",
          marginTop: "auto",
        }}
      >
        <QaSearchBox
          variant="footer"
          initialKb={lastKb}
          onSubmit={handleSubmit}
          pending={pending}
        />
      </div>
    </div>
  );
}

function TurnBlock({ turn }: { turn: Turn }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.875rem",
      }}
    >
      {/* 提问气泡 */}
      <div
        style={{
          alignSelf: "flex-end",
          maxWidth: "85%",
          padding: "0.75rem 1rem",
          background: "#2563eb",
          color: "#ffffff",
          fontSize: "14px",
          lineHeight: 1.55,
          borderRadius: "14px 14px 4px 14px",
          boxShadow: "0 1px 2px rgba(37, 99, 235, 0.2)",
          display: "inline-flex",
          flexDirection: "column",
          gap: "0.375rem",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            opacity: 0.75,
            fontFamily: "var(--font-mono)",
          }}
        >
          我的提问 · {KB_LABEL[turn.kb]}
        </span>
        <span style={{ wordBreak: "break-word" }}>{turn.question}</span>
      </div>

      {/* 答案区 */}
      <div
        style={{
          padding: "1.25rem",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px 14px 14px 4px",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        }}
      >
        {turn.result ? (
          <AnswerView result={turn.result} />
        ) : turn.error ? (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
              fontSize: "13px",
              color: "#b91c1c",
              padding: "0.75rem",
              background: "#fef2f2",
              borderRadius: "8px",
              border: "1px solid #fecaca",
            }}
          >
            <AlertCircle style={{ width: "14px", height: "14px", marginTop: "1px", flexShrink: 0 }} />
            <span>{turn.error}</span>
          </div>
        ) : (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            <Loader2 style={{ width: "14px", height: "14px" }} className="animate-spin" />
            正在查询知识库...
          </div>
        )}
      </div>
    </div>
  );
}
