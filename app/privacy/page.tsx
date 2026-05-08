/**
 * 隐私政策页 (INF-07)
 * 路径: /privacy
 *
 * 渲染 content/privacy-policy-draft.md。
 * Phase 1 草稿版本；上线前需用户法律审阅，定稿版替换 markdown 文件。
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import ReactMarkdown from "react-markdown";

export const metadata = {
  title: "隐私政策 | 上海黄浦区 智能就业创业服务",
};

async function loadPolicy(): Promise<string> {
  const filePath = path.join(process.cwd(), "content", "privacy-policy-draft.md");
  return readFile(filePath, "utf8");
}

export default async function PrivacyPage() {
  const md = await loadPolicy();
  return (
    <main className="flex-1 p-8">
      <article className="prose prose-zinc max-w-3xl mx-auto">
        <ReactMarkdown>{md}</ReactMarkdown>
      </article>
    </main>
  );
}
