"use client";

/**
 * 共用搜索框组件 — 首页 hero 大输入框 / 答案页底部 sticky 输入框 共用一份。
 *
 * 模式由 onSubmit 控制：
 *   - 不传 onSubmit → 内部 router.push 到 /qa/answer?q=&kb=（首页用法）
 *   - 传入 onSubmit  → 调用回调，由父组件处理（答案页对话流追加 turn）
 *
 * variant：
 *   - "hero"   → 首页大号样式 + 可选热点卡片网格
 *   - "footer" → 答案页底部紧凑样式（sticky 由父容器负责）
 */

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, Loader2, Briefcase, Rocket } from "lucide-react";
import type { HotQuestion, KbType } from "@/lib/qa/hot-questions";

const MAX_QUESTION_LEN = 500;

const KB_LABEL: Record<KbType, string> = { policy: "就业", biz: "创业" };

export interface QaSearchBoxProps {
  /** 仅 variant=hero 用：传入则显示热点卡片网格 */
  hotByKb?: { policy: HotQuestion[]; biz: HotQuestion[] };
  /** 默认分类，未指定则 policy */
  initialKb?: KbType;
  /** 传入则交由父组件处理提交（答案页对话流模式）；否则 router.push 跳答案页 */
  onSubmit?: (q: string, kb: KbType) => void;
  /** 父组件标记 pending 时禁用提交（仅 footer 模式有意义） */
  pending?: boolean;
  /** 外部注入预填问题（后续提问点击）；组件消费后调 onPrefillConsumed 重置 */
  prefillQuestion?: string;
  /** 消费 prefillQuestion 后回调，父组件重置为 undefined */
  onPrefillConsumed?: () => void;
  /** 样式变体 */
  variant: "hero" | "footer";
}

export function QaSearchBox({
  hotByKb,
  initialKb = "policy",
  onSubmit,
  pending = false,
  prefillQuestion,
  onPrefillConsumed,
  variant,
}: QaSearchBoxProps) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [kb, setKb] = useState<KbType>(initialKb);

  // 外部注入后续提问时填入输入框
  useEffect(() => {
    if (prefillQuestion !== undefined && prefillQuestion !== "") {
      setQuestion(prefillQuestion);
      onPrefillConsumed?.();
    }
  }, [prefillQuestion, onPrefillConsumed]);

  const trimmed = question.trim();
  const canSubmit = !pending && trimmed.length >= 2;

  function submit() {
    if (!canSubmit) return;
    if (onSubmit) {
      onSubmit(trimmed, kb);
      setQuestion(""); // 提交后清空（对话流：让用户继续问下一个）
    } else {
      const params = new URLSearchParams({ q: trimmed, kb });
      router.push(`/qa/answer?${params.toString()}`);
    }
  }

  function onFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit();
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Enter 提交（Shift+Enter 不拦截，但本组件用 input 不是 textarea，所以 Enter 直接提交）
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const isHero = variant === "hero";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isHero ? "1.5rem" : "0.75rem" }}>
      {/* 输入框 */}
      <form onSubmit={onFormSubmit} style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            padding: isHero ? "0.5rem 0.5rem 0.5rem 1.25rem" : "0.375rem 0.375rem 0.375rem 1rem",
            boxShadow: isHero
              ? "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)"
              : "0 1px 2px rgba(15, 23, 42, 0.06)",
            transition: "border-color 150ms, box-shadow 150ms",
          }}
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION_LEN))}
            onKeyDown={onInputKeyDown}
            disabled={pending}
            maxLength={MAX_QUESTION_LEN}
            placeholder={
              isHero
                ? kb === "policy"
                  ? "例：失业保险金能领多少？"
                  : "例：黄浦区创业担保贷款怎么申请？"
                : "继续问..."
            }
            aria-label="提问"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: isHero ? "16px" : "15px",
              fontFamily: "inherit",
              color: "#0f172a",
              padding: "0.5rem 0",
              minWidth: 0,
            }}
          />
          <button
            type="submit"
            disabled={!canSubmit}
            aria-label="提交问题"
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.375rem",
              padding: isHero ? "0.625rem 1rem" : "0.5rem 0.875rem",
              background: canSubmit ? "#2563eb" : "#cbd5e1",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 500,
              borderRadius: "8px",
              border: "none",
              cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "background 150ms",
            }}
          >
            {pending ? (
              <Loader2 style={{ width: "16px", height: "16px" }} className="animate-spin" />
            ) : (
              <ArrowRight style={{ width: "16px", height: "16px" }} />
            )}
            <span style={{ display: isHero ? "inline" : "none" }}>{pending ? "查询中" : "提交"}</span>
          </button>
        </div>
        {isHero && (
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              marginTop: "0.5rem",
              paddingLeft: "0.25rem",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {question.length} / {MAX_QUESTION_LEN} · 命中知识库时给出真实引用与免责声明
          </div>
        )}
      </form>

      {/* 分类 chip */}
      <div
        role="tablist"
        aria-label="知识库分类"
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          justifyContent: isHero ? "center" : "flex-start",
        }}
      >
        {(["policy", "biz"] as KbType[]).map((id) => {
          const active = kb === id;
          const Icon = id === "policy" ? Briefcase : Rocket;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setKb(id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: isHero ? "0.625rem 1.25rem" : "0.375rem 0.75rem",
                background: active ? "#2563eb" : "#ffffff",
                color: active ? "#ffffff" : "#475569",
                fontSize: isHero ? "14px" : "13px",
                fontWeight: 500,
                border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
                borderRadius: "8px",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 150ms, color 150ms, border-color 150ms",
              }}
            >
              <Icon style={{ width: "14px", height: "14px" }} />
              {KB_LABEL[id]}
            </button>
          );
        })}
      </div>

      {/* 热点卡片（仅 hero 模式 + hotByKb 存在）*/}
      {isHero && hotByKb && (
        <div
          aria-label={`${KB_LABEL[kb]}热点问题`}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.75rem",
            marginTop: "0.5rem",
          }}
        >
          {hotByKb[kb].map((hot) => (
            <button
              key={hot.id}
              type="button"
              onClick={() => setQuestion(hot.title)}
              style={{
                textAlign: "left",
                padding: "1rem",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
                color: "#0f172a",
                lineHeight: 1.5,
                fontFamily: "inherit",
                transition: "border-color 150ms, box-shadow 150ms, transform 150ms",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#2563eb";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#2563eb",
                  marginBottom: "0.5rem",
                  fontFamily: "var(--font-mono)",
                }}
              >
                热点 · {hot.id.toUpperCase()}
              </span>
              {hot.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
