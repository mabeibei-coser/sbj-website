"use client";

import { useRouter, useSearchParams } from "next/navigation";

export type KbType = "policy" | "biz";

interface QaTabsProps {
  active: KbType;
}

const TABS: Array<{ id: KbType; label: string; description: string }> = [
  { id: "policy", label: "政策与办事库", description: "失业保险 / 就业补贴 / 社保办理" },
  { id: "biz", label: "创业与行业库", description: "创业孵化 / 创业贷款 / 政企对接" },
];

export function QaTabs({ active }: QaTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setKb(kb: KbType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("kb", kb);
    router.replace(`/qa?${params.toString()}`, { scroll: false });
  }

  return (
    <div
      role="tablist"
      aria-label="知识库切换"
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "0.5rem",
        borderBottom: "1px solid #e5e7eb",
        overflowX: "auto",
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onClick={() => setKb(tab.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setKb(tab.id);
              }
            }}
            style={{
              flexShrink: 0,
              padding: "0.75rem 1rem",
              cursor: "pointer",
              background: "transparent",
              border: "none",
              borderBottom: isActive ? "2px solid #2563eb" : "2px solid transparent",
              marginBottom: "-1px",
              color: isActive ? "#1d4ed8" : "#64748b",
              fontSize: "14px",
              fontWeight: 500,
              transition: "color 150ms, border-color 150ms",
              userSelect: "none",
            }}
          >
            <span style={{ display: "block" }}>{tab.label}</span>
            <span
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 400,
                color: "#94a3b8",
                marginTop: "2px",
              }}
            >
              {tab.description}
            </span>
          </div>
        );
      })}
    </div>
  );
}
