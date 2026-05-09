/**
 * lib/qa/hot-questions.ts 单元测试 (QA-08 / D-15)
 *
 * TDD: RED → GREEN → REFACTOR
 * node:fs/promises 被 vi.mock 拦截，不需要真实文件系统。
 */

import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "node:fs/promises";
import { getHotQuestions, __resetHotCacheForTest } from "@/lib/qa/hot-questions";

function makeMd(id: string, title: string, sources: string[], body: string): string {
  return `---
id: ${id}
title: ${title}
updated: 2026-05-08
sources:
${sources.map((s) => `  - ${s}`).join("\n")}
---
${body}`;
}

describe("getHotQuestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetHotCacheForTest();
  });

  it("解析 3 个文件返回结构化对象（按 q1/q2/q3 顺序）", async () => {
    vi.mocked(readFile)
      .mockResolvedValueOnce(makeMd("q1", "Q1 标题", ["s1", "s2"], "# Q1 标题\n\n正文 1\n\n## 出处\n- a\n") as never)
      .mockResolvedValueOnce(makeMd("q2", "Q2 标题", ["s3"], "# Q2 标题\n\n正文 2\n\n## 出处\n- b\n") as never)
      .mockResolvedValueOnce(makeMd("q3", "Q3 标题", [], "# Q3 标题\n\n正文 3\n\n## 出处\n- c\n") as never);

    const items = await getHotQuestions("policy");
    expect(items).toHaveLength(3);
    expect(items[0].id).toBe("q1");
    expect(items[0].title).toBe("Q1 标题");
    expect(items[0].citations).toEqual(["s1", "s2"]);
    expect(items[0].updatedAt).toBe("2026-05-08");
    expect(items[0].body).toContain("正文 1");
    expect(items[0].body).toContain("## 出处");
    expect(items[1].id).toBe("q2");
    expect(items[2].citations).toEqual([]);
  });

  it("frontmatter 缺失时 fallback 用 id 当 title", async () => {
    vi.mocked(readFile).mockResolvedValue("# 无 frontmatter 的文件\n正文" as never);
    const items = await getHotQuestions("policy");
    expect(items[0].title).toBe("q1");
    expect(items[0].citations).toEqual([]);
  });

  it("readFile 抛错时整体 throw（让 caller 兜底）", async () => {
    vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));
    await expect(getHotQuestions("policy")).rejects.toThrow("ENOENT");
  });

  it("第二次调用走 cache 不再读文件", async () => {
    vi.mocked(readFile)
      .mockResolvedValueOnce(makeMd("q1", "T1", [], "body") as never)
      .mockResolvedValueOnce(makeMd("q2", "T2", [], "body") as never)
      .mockResolvedValueOnce(makeMd("q3", "T3", [], "body") as never);
    await getHotQuestions("policy");
    await getHotQuestions("policy");
    expect(readFile).toHaveBeenCalledTimes(3); // 只有第一次 3 次 IO
  });
});
