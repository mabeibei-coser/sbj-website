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
 * Replaces <details>/<summary> to avoid iOS Safari < 16 / WeChat browser
 * incompatibility with display:flex on <summary>.
 */
export function HotCardItem({ index, title, body, updatedAt }: HotCardItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card border border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full cursor-pointer flex items-center gap-4 px-6 py-4 bg-transparent rounded-none appearance-none border-0 text-left"
      >
        {/* 序号 */}
        <span
          className="shrink-0 w-6 h-6 rounded-full bg-[var(--blue-100)] text-[var(--blue-700)] text-[11px] font-medium flex items-center justify-center tabular-nums"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {index + 1}
        </span>
        <h3 className="flex-1 text-[15px] font-medium text-[var(--text-primary)] leading-snug">
          {title}
        </h3>
        {/* chevron indicator */}
        <span
          className="shrink-0 text-[var(--text-muted)] transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
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
      </button>
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
