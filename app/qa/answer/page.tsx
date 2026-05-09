import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { ArrowLeft } from "lucide-react";

import { answerQuestion, type AnswerOutput } from "@/lib/qa/answer";
import type { KbType } from "@/lib/qa/hot-questions";
import { Conversation, type Turn } from "./conversation";

interface PageProps {
  searchParams: Promise<{ q?: string; kb?: string }>;
}

function parseKb(value: string | undefined): KbType {
  return value === "biz" ? "biz" : "policy";
}

export default async function AnswerPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const rawQ = (sp.q ?? "").trim();
  const kb = parseKb(sp.kb);

  if (rawQ.length < 2) {
    redirect("/qa");
  }

  const reqHeaders = await headers();
  const mockReq = { headers: reqHeaders } as unknown as NextRequest;

  let firstAnswer: AnswerOutput;
  try {
    firstAnswer = await answerQuestion({ question: rawQ, kbType: kb }, mockReq);
  } catch (err) {
    console.error("[qa/answer] SSR uncaught:", err);
    firstAnswer = {
      status: "miss",
      answer: "服务暂时不可用，请稍后重试或拨打黄浦区就业促进中心热线 021-63137613。",
      citations: [],
    };
  }

  const initialTurn: Turn = {
    id: 1,
    question: rawQ,
    kb,
    result: firstAnswer,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fbfcfd",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #e5e7eb",
          background: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <div
          style={{
            maxWidth: "48rem",
            margin: "0 auto",
            padding: "0.875rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <Link
            href="/qa"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              fontSize: "13px",
              color: "#475569",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            <ArrowLeft style={{ width: "14px", height: "14px" }} />
            返回首页
          </Link>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "#94a3b8",
              fontFamily: "var(--font-mono)",
            }}
          >
            黄浦区就业创业问答
          </div>
        </div>
      </header>

      <Conversation initialTurn={initialTurn} />
    </main>
  );
}
