"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface HotCardItemProps {
  index: number;
  title: string;
  body: string;
  updatedAt?: string;
}

/**
 * Single hot question card with React-controlled expand/collapse.
 * Uses div role=button instead of <button> to avoid browser default
 * text-align:center and inconsistent flex behavior on <button>.
 */
export function HotCardItem({ index, title, body, updatedAt }: HotCardItemProps) {
  const [open, setOpen] = useState(false);

  function toggle() {
    setOpen((v) => !v);
  }

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        aria-expanded={open}
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "1rem",
          padding: "1rem 1.5rem",
          cursor: "pointer",
        }}
      >
        {/* 序号 */}
        <span
          className="tabular-nums"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "1.75rem",
            height: "1.75rem",
            borderRadius: "9999px",
            background: "#dbeafe",
            color: "#1d4ed8",
            fontSize: "12px",
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <h3
          style={{
            flex: 1,
            margin: 0,
            fontSize: "15px",
            fontWeight: 500,
            color: "#0f172a",
            lineHeight: 1.5,
          }}
        >
          {title}
        </h3>
        {/* chevron indicator */}
        <span
          style={{
            flexShrink: 0,
            color: "#64748b",
            transition: "transform 200ms",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            display: "inline-flex",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      {open && (
        <div className="px-6 pb-5 pt-1">
          <div className="border-t border-[var(--border)] pt-4">
            <article className="prose prose-zinc max-w-none text-sm">
              <ReactMarkdown>{body}</ReactMarkdown>
            </article>
            {updatedAt && (
              <p
                className="text-[11px] text-[var(--text-muted)] mt-3 tabular-nums"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                最近更新：{updatedAt}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
