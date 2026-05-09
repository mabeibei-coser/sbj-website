/**
 * lib/qa/hot-questions.ts (QA-08 / D-14 / D-15)
 *
 * 读取 content/qa-hot/{q1,q2,q3}.md，解析 frontmatter + 正文，返回结构化对象。
 * 全程不调 LLM（D-15 硬约束：热点答案由人工编辑写入）。
 * 使用模块级 cache，process 重启失效；提供 __resetHotCacheForTest 供测试使用。
 */

import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface HotQuestion {
  id: "q1" | "q2" | "q3";
  title: string;
  body: string; // 去掉 frontmatter 的整段 markdown（含 ## 出处）
  citations: string[]; // 从 frontmatter sources 解析
  updatedAt: string; // ISO date string from frontmatter `updated`
}

const HOT_IDS: ReadonlyArray<"q1" | "q2" | "q3"> = ["q1", "q2", "q3"] as const;

let cache: HotQuestion[] | null = null;

/**
 * 测试专用：重置 module-scope cache。
 * 生产代码不应调用此函数。
 */
export function __resetHotCacheForTest() {
  cache = null;
}

/**
 * 解析 markdown 顶部 frontmatter（手写 regex，避免引入 gray-matter）。
 * 仅支持：标量 (key: value) 和数组 (key: 后跟每行 `  - item`)。
 */
function parseFrontmatter(md: string): { fm: Record<string, string | string[]>; body: string } {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: md };
  const fmText = m[1];
  const body = m[2];
  const fm: Record<string, string | string[]> = {};
  const lines = fmText.split("\n");
  let currentArrayKey: string | null = null;
  for (const line of lines) {
    const arrItem = line.match(/^\s+-\s+(.+?)\s*$/);
    if (arrItem && currentArrayKey) {
      (fm[currentArrayKey] as string[]).push(arrItem[1]);
      continue;
    }
    const kv = line.match(/^([a-zA-Z_][\w]*)\s*:\s*(.*)$/);
    if (!kv) {
      currentArrayKey = null;
      continue;
    }
    const [, key, value] = kv;
    if (value === "") {
      // 后续行可能是数组
      fm[key] = [];
      currentArrayKey = key;
    } else {
      fm[key] = value;
      currentArrayKey = null;
    }
  }
  return { fm, body };
}

async function loadOne(id: "q1" | "q2" | "q3"): Promise<HotQuestion> {
  const filePath = path.join(process.cwd(), "content", "qa-hot", `${id}.md`);
  const md = await readFile(filePath, "utf8");
  const { fm, body } = parseFrontmatter(md);
  const title = typeof fm.title === "string" ? fm.title : id;
  const updatedAt = typeof fm.updated === "string" ? fm.updated : "";
  const citations = Array.isArray(fm.sources) ? fm.sources : [];
  return { id, title, body: body.trim(), citations, updatedAt };
}

/**
 * 返回 3 个热点问题，按 q1/q2/q3 顺序。
 * 第二次调用走 module-scope cache，不再读文件（进程重启失效）。
 */
export async function getHotQuestions(): Promise<HotQuestion[]> {
  if (cache) return cache;
  const items = await Promise.all(HOT_IDS.map(loadOne));
  cache = items;
  return items;
}
