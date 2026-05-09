"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface InitialPage {
  id: string;
  kbType: "policy" | "biz";
  slug: string;
  title: string;
  content: string;
  version: number;
}

export function WikiEditor({ initialPage }: { initialPage: InitialPage }) {
  const [content, setContent] = useState(initialPage.content);
  const [diffSummary, setDiffSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState(initialPage.version);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/admin/wiki/${initialPage.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content, diffSummary: diffSummary || undefined }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        page?: { version: number };
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "保存失败");
        return;
      }
      setCurrentVersion(data.page?.version ?? currentVersion + 1);
      setOkMsg(`已保存 → v${data.page?.version}`);
      setDiffSummary("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/wiki"
              className="text-sm text-[var(--blue-500)] hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> 列表
            </Link>
            <div>
              <div className="text-xs text-[var(--text-muted)] uppercase">
                {initialPage.kbType} / {initialPage.slug}
              </div>
              <h1 className="text-xl font-semibold">{initialPage.title}</h1>
            </div>
          </div>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            当前版本：v{currentVersion}
          </span>
        </header>

        <form onSubmit={onSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-4 h-[calc(100vh-280px)]">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              className="w-full h-full p-4 rounded-md border border-[var(--border)] bg-[var(--surface)] text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[var(--blue-500)]"
              aria-label="markdown 编辑器"
            />
            <article className="prose prose-zinc max-w-none p-4 rounded-md border border-[var(--border)] bg-[var(--surface)] overflow-auto h-full">
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={diffSummary}
              onChange={(e) => setDiffSummary(e.target.value.slice(0, 500))}
              placeholder="本次修改摘要（可选，最多 500 字）"
              className="flex-1 px-3 py-2 border border-[var(--border)] rounded-md text-sm"
              maxLength={500}
            />
            <span className="text-xs text-[var(--text-muted)] tabular-nums whitespace-nowrap">
              {diffSummary.length} / 500
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[var(--blue-500)] text-white text-sm rounded-md font-medium disabled:opacity-50 hover:bg-[var(--blue-600)] flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {submitting ? "保存中..." : "保存"}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm text-[var(--negative)] bg-[var(--negative-bg)] p-3 rounded-md"
            >
              {error}
            </div>
          )}
          {okMsg && (
            <div className="text-sm text-[var(--positive)] bg-[var(--positive-bg)] p-3 rounded-md">
              {okMsg}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
