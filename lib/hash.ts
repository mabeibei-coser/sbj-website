/**
 * 通用 hash 工具 (无 server-only 守护，client + server + tsx script 都可以 import)
 *
 * - hashPrompt: 给 llm_call_logs.promptHash 用
 *   moved out of lib/audit.ts so tests/llm-eval/run.ts (一个 tsx 脚本，不在 RSC 树里) 也能用
 */

import { createHash } from "node:crypto";

/**
 * 计算 prompt hash (SHA256 取前 32 hex = 16 字节)。
 */
export function hashPrompt(systemPrompt: string, userPrompt: string): string {
  return createHash("sha256")
    .update(systemPrompt, "utf8")
    .update(" ", "utf8")
    .update(userPrompt, "utf8")
    .digest("hex")
    .slice(0, 32);
}
