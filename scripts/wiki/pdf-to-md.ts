#!/usr/bin/env tsx
/**
 * PDF → markdown via MinerU
 *
 * Default: Agent API (免费, 10MB / 20 页限制, 无需 token)
 * 配 MINERU_API_KEY 后切到 Precision API（200MB / 200 页, 1000 页/天 priority）
 *
 * Usage:
 *   npm run wiki:pdf-to-md -- knowledge/policy-sources-raw/policy-1.pdf
 *   npm run wiki:pdf-to-md -- some.pdf --slug=unemployment-rules --sources=knowledge/policy-sources
 */
// 优先加载 .env.local（与 Next.js 行为一致），再 fallback 到 .env
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });
loadDotenv({ path: ".env" });
import fs from "node:fs/promises";
import path from "node:path";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const args = process.argv.slice(2);
const inputPath = args.find((a) => !a.startsWith("--"));
const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
const sourcesArg = args.find((a) => a.startsWith("--sources="))?.split("=")[1];
const SOURCES_DIR = sourcesArg
  ? path.resolve(process.cwd(), sourcesArg)
  : path.join(process.cwd(), "knowledge", "policy-sources");

if (!inputPath) {
  console.error(
    "Usage: tsx scripts/wiki/pdf-to-md.ts <pdf-path> [--slug=name] [--sources=<dir>]"
  );
  process.exit(1);
}

const apiKey = process.env.MINERU_API_KEY?.trim();
const usePrecision = Boolean(apiKey);
const baseURL = usePrecision
  ? process.env.MINERU_BASE_URL ?? "https://mineru.net/api/v4"
  : "https://mineru.net/api/v1/agent";

const inputAbs = path.resolve(inputPath);
const fileName = path.basename(inputAbs);
const slug =
  slugArg ??
  path
    .basename(fileName, path.extname(fileName))
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase();
const outPath = path.join(SOURCES_DIR, `${slug}.md`);

main().catch((err) => {
  console.error("[pdf-to-md] 失败：", err instanceof Error ? err.message : err);
  process.exit(1);
});

async function main() {
  console.log(`[pdf-to-md] tier: ${usePrecision ? "Precision (token)" : "Agent (free)"}`);
  console.log(`[pdf-to-md] input:  ${inputAbs}`);
  console.log(`[pdf-to-md] output: ${outPath}`);

  const fileBuf = await fs.readFile(inputAbs);
  const sizeMB = fileBuf.byteLength / (1024 * 1024);
  console.log(`[pdf-to-md] size: ${sizeMB.toFixed(2)} MB`);

  if (!usePrecision && sizeMB > 10) {
    throw new Error(
      `Agent API 限 10MB，本文件 ${sizeMB.toFixed(2)} MB。配 MINERU_API_KEY 切 Precision API。`
    );
  }

  const taskId = await uploadAndStartTask(fileName, fileBuf);
  console.log(`[pdf-to-md] task: ${taskId}`);

  const markdownUrl = await pollUntilDone(taskId);
  console.log(`[pdf-to-md] markdown URL: ${markdownUrl}`);

  const md = await fetchMarkdown(markdownUrl);
  const annotated = annotateLineNumbers(md);

  await fs.mkdir(SOURCES_DIR, { recursive: true });
  await fs.writeFile(outPath, annotated, "utf-8");
  console.log(`[pdf-to-md] 完成 → ${outPath}（${annotated.split("\n").length} 行）`);
}

async function uploadAndStartTask(name: string, buf: Buffer): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (usePrecision && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const initRes = await fetch(`${baseURL}/parse/file`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      file_name: name,
      language: "ch",
      enable_table: true,
      is_ocr: false,
      enable_formula: false,
    }),
  });

  if (!initRes.ok) {
    throw new Error(`MinerU init 失败 ${initRes.status}: ${await initRes.text()}`);
  }

  const initData = (await initRes.json()) as {
    task_id?: string;
    file_url?: string;
    data?: { task_id?: string; file_url?: string };
  };
  const taskId = initData.task_id ?? initData.data?.task_id;
  const uploadUrl = initData.file_url ?? initData.data?.file_url;

  if (!taskId || !uploadUrl) {
    throw new Error(`MinerU 返回缺字段：${JSON.stringify(initData)}`);
  }

  // Node.js 18+ fetch 接受 Buffer 作为 BodyInit；TS lib.dom 类型不全，用 unknown 转换
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    body: buf as unknown as BodyInit,
  });
  if (!uploadRes.ok) {
    throw new Error(`PUT 上传失败 ${uploadRes.status}: ${await uploadRes.text()}`);
  }

  return taskId;
}

async function pollUntilDone(taskId: string): Promise<string> {
  const headers: Record<string, string> = {};
  if (usePrecision && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const start = Date.now();
  let attempts = 0;
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    attempts++;
    await sleep(POLL_INTERVAL_MS);
    const res = await fetch(`${baseURL}/parse/${taskId}`, { headers });
    if (!res.ok) {
      throw new Error(`轮询失败 ${res.status}`);
    }
    const data = (await res.json()) as {
      state?: string;
      markdown_url?: string;
      data?: { state?: string; markdown_url?: string };
      err_msg?: string;
    };
    const state = data.state ?? data.data?.state;
    const markdownUrl = data.markdown_url ?? data.data?.markdown_url;
    process.stdout.write(`\r[pdf-to-md] poll #${attempts} state=${state ?? "unknown"}    `);
    if (state === "done" && markdownUrl) {
      console.log();
      return markdownUrl;
    }
    if (state === "failed" || state === "error") {
      throw new Error(`MinerU 任务失败：${data.err_msg ?? JSON.stringify(data)}`);
    }
  }
  throw new Error(`MinerU 轮询超时（${POLL_TIMEOUT_MS / 1000}s）`);
}

async function fetchMarkdown(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`下载 markdown 失败 ${res.status}`);
  }
  return res.text();
}

function annotateLineNumbers(md: string): string {
  // 在每一行前注入 `<!-- L:N -->`，让后续 LLM 引用时能用 file:line-line 形式
  return md
    .split("\n")
    .map((line, i) => `<!-- L:${i + 1} -->${line}`)
    .join("\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
