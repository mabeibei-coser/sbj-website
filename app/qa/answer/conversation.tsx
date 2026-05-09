"use client";

/**
 * 对话流容器（client）。
 *
 * 接受 SSR 渲染的首屏 turn 作为初始 state。
 * 用户在底部 sticky 输入框提交后，client 调 /api/qa/answer 拿新答案，
 * 追加到 turns 列表末尾，URL 不变（与 SSR 首屏区分：URL 只代表会话起点）。
 * 每轮答案加载完毕后，自动调 /api/qa/follow-up 生成 3 个后续提问。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";

import { QaSearchBox } from "../qa-search-box";
import { AnswerView, type AnswerResult } from "../answer-view";
import type { KbType } from "@/lib/qa/hot-questions";

export interface Turn {
  id: number;
  question: string;
  kb: KbType;
  result: AnswerResult | null; // null = 正在加载
  error?: string;
  // AI 后续提问：undefined = 未发起，null = 加载中，string[] = 已完成（可能为空）
  followUps?: string[] | null;
}

const KB_LABEL: Record<KbType, string> = { policy: "就业", biz: "创业" };

export function Conversation({ initialTurn }: { initialTurn: Turn }) {
  const [turns, setTurns] = useState<Turn[]>([initialTurn]);
  const [pending, setPending] = useState(false);
  // 控制底部输入框的当前值（供后续提问点击填入）
  const [prefillQuestion, setPrefillQuestion] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新 turn 出现时滚动到底
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, pending]);

  // 拉后续提问（在 result 出现后调用，fire-and-forget）
  const fetchFollowUps = useCallback(async (turnId: number, question: string, answer: string, kb: KbType) => {
    // null = 加载中
    setTurns((prev) =>
      prev.map((t) => (t.id === turnId ? { ...t, followUps: null } : t))
    );
    try {
      const res = await fetch("/api/qa/follow-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, answer, kbType: kb }),
      });
      if (!res.ok) {
        setTurns((prev) =>
          prev.map((t) => (t.id === turnId ? { ...t, followUps: [] } : t))
        );
        return;
      }
      const data = (await res.json()) as { questions?: string[] };
      const qs = Array.isArray(data.questions) ? data.questions : [];
      setTurns((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, followUps: qs } : t))
      );
    } catch {
      // 静默失败，设为空数组（不显示区块）
      setTurns((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, followUps: [] } : t))
      );
    }
  }, []);

  // 首屏 turn 的后续提问（SSR 已有 result）
  useEffect(() => {
    const t = initialTurn;
    if (t.result && t.followUps === undefined) {
      void fetchFollowUps(t.id, t.question, t.result.answer, t.kb);
    }
    // 仅首次挂载时触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(question: string, kb: KbType) {
    if (pending) return;
    setPrefillQuestion(undefined); // 清掉预填值
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
      const result: AnswerResult = {
        status: data.status as AnswerResult["status"],
        answer: data.answer as string,
        citations: data.citations ?? [],
      };
      setTurns((prev) =>
        prev.map((t) => (t.id === nextId ? { ...t, result } : t))
      );
      // 答案回来后异步拉后续提问
      void fetchFollowUps(nextId, question, result.answer, kb);
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
          <TurnBlock
            key={turn.id}
            turn={turn}
            onFollowUpClick={(q) => setPrefillQuestion(q)}
          />
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
          prefillQuestion={prefillQuestion}
          onPrefillConsumed={() => setPrefillQuestion(undefined)}
        />
      </div>
    </div>
  );
}

function TurnBlock({
  turn,
  onFollowUpClick,
}: {
  turn: Turn;
  onFollowUpClick: (q: string) => void;
}) {
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
          <>
            <AnswerView result={turn.result} />
            {/* 后续提问：null=加载中显骨架，string[]=已完成（空则不显示） */}
            {(turn.followUps === null || (Array.isArray(turn.followUps) && turn.followUps.length > 0)) && (
              <FollowUpSection
                questions={turn.followUps}
                onSelect={onFollowUpClick}
              />
            )}
          </>
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

function FollowUpSection({
  questions,
  onSelect,
}: {
  questions: string[] | null;
  onSelect: (q: string) => void;
}) {
  // null = 加载中，显示骨架
  if (questions === null) {
    return (
      <div
        style={{
          marginTop: "1rem",
          paddingTop: "1rem",
          borderTop: "1px solid #f1f5f9",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "#94a3b8",
            marginBottom: "0.625rem",
            fontFamily: "var(--font-mono)",
          }}
        >
          后续提问
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {[40, 55, 45].map((w, i) => (
            <div
              key={i}
              style={{
                height: "14px",
                width: `${w}%`,
                background: "#f1f5f9",
                borderRadius: "4px",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: "1rem",
        paddingTop: "1rem",
        borderTop: "1px solid #f1f5f9",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: "#64748b",
          marginBottom: "0.625rem",
          fontFamily: "var(--font-mono)",
        }}
      >
        后续提问
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "0.5rem 0.625rem",
              background: "transparent",
              border: "1px solid transparent",
              borderRadius: "8px",
              cursor: "pointer",
              textAlign: "left",
              fontSize: "13px",
              color: "#1d4ed8",
              lineHeight: 1.5,
              transition: "background 0.12s, border-color 0.12s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#eff6ff";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#bfdbfe";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
            }}
          >
            <ArrowRight
              style={{ width: "13px", height: "13px", flexShrink: 0, color: "#60a5fa" }}
            />
            <span style={{ wordBreak: "break-word" }}>{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
