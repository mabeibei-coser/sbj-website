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
    <div className="glass-card border border-[var(--border)]">
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
        className="cursor-pointer px-6 py-4"
        style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "1rem" }}
      >
        {/* 序号 */}
        <span
          className="shrink-0 rounded-full bg-[var(--blue-100)] text-[var(--blue-700)] text-[11px] font-medium tabular-nums"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "1.5rem",
            height: "1.5rem",
            fontFamily: "var(--font-mono)",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <h3
          className="text-[15px] font-medium text-[var(--text-primary)] leading-snug"
          style={{ flex: 1, margin: 0 }}
        >
          {title}
        </h3>
        {/* chevron indicator */}
        <span
          className="text-[var(--text-muted)]"
          style={{
            flexShrink: 0,
            transition: "transform 200ms",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
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
