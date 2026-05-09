"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

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
    <div role="tablist" aria-label="知识库切换" className="flex gap-2 border-b border-[var(--border)] overflow-x-auto scrollbar-none">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => setKb(tab.id)}
            className={cn(
              "shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
              isActive
                ? "border-[var(--blue-500)] text-[var(--blue-700)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <span className="block">{tab.label}</span>
            <span className="block text-xs text-[var(--text-muted)] font-normal mt-0.5">{tab.description}</span>
          </button>
        );
      })}
    </div>
  );
}
