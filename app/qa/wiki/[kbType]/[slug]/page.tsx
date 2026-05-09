import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getWikiPageBySlug } from "@/lib/qa/wiki";
import { QA_DISCLAIMER } from "@/lib/qa/disclaimer";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ kbType: string; slug: string }>;
}

function parseKb(s: string): "policy" | "biz" | null {
  return s === "policy" || s === "biz" ? s : null;
}

export default async function WikiDetailPage({ params }: PageProps) {
  const { kbType: kbRaw, slug } = await params;
  const kbType = parseKb(kbRaw);
  if (!kbType) notFound();

  const page = await getWikiPageBySlug(kbType, slug);
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link
          href={`/qa?kb=${kbType}`}
          className="inline-flex items-center gap-1 text-sm text-[var(--blue-500)] hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          返回{kbType === "policy" ? "政策与办事库" : "创业与行业库"}
        </Link>

        <div className="text-xs text-[var(--blue-500)] uppercase tracking-wider mb-2">
          {kbType === "policy" ? "政策与办事库" : "创业与行业库"}
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">{page.title}</h1>
        <p className="text-xs text-[var(--text-muted)] mb-8">
          v{page.version} · 更新于 {page.updatedAt.toLocaleDateString("zh-CN")}
          {page.sourceUrl && (
            <>
              {" · "}
              <a href={page.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--blue-500)] hover:underline">
                源链接
              </a>
            </>
          )}
        </p>

        <article className="prose prose-zinc max-w-none">
          <ReactMarkdown>{page.content}</ReactMarkdown>
        </article>

        <p className="text-xs text-[var(--text-muted)] mt-12 pt-6 border-t border-[var(--border)] italic">
          {QA_DISCLAIMER}
        </p>
      </div>
    </main>
  );
}
