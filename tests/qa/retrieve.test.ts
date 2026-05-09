import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    wikiPage: { findMany: vi.fn() },
  },
}));

import { retrieveTopK } from "@/lib/qa/retrieve";
import { prisma } from "@/lib/db";

describe("retrieveTopK", () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRaw).mockReset();
    vi.mocked(prisma.wikiPage.findMany).mockReset();
  });

  it("空 question 返回 []", async () => {
    const r = await retrieveTopK("", "policy");
    expect(r).toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("$queryRaw 返回 0 行 → 返回 []", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);
    const r = await retrieveTopK("test query", "policy");
    expect(r).toEqual([]);
  });

  it("$queryRaw 返回行 → map 成 RetrievalResult 并保持顺序", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { id: "p1", slug: "a", title: "失业保险", content: "X", source_url: null, score: 0.9 },
      { id: "p2", slug: "b", title: "就业补贴", content: "Y", source_url: "https://gov.cn/y", score: 0.5 },
    ] as never);

    const r = await retrieveTopK("失业", "policy");
    expect(r).toHaveLength(2);
    expect(r[0].page.id).toBe("p1");
    expect(r[0].score).toBe(0.9);
    expect(r[1].page.sourceUrl).toBe("https://gov.cn/y");
  });

  it("$queryRaw 抛错时降级到 ILIKE", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("tsvector lang missing"));
    vi.mocked(prisma.wikiPage.findMany).mockResolvedValue([
      {
        id: "p3", kbType: "policy", slug: "c", title: "T", content: "C",
        sourceUrl: null, version: 1, publishedAt: null,
        createdAt: new Date(), updatedAt: new Date(),
      } as never,
    ]);
    const r = await retrieveTopK("test", "policy");
    expect(r).toHaveLength(1);
    expect(r[0].score).toBe(0.5); // 降级固定分
  });

  it("kbType=biz 时 $queryRaw 收到 biz 参数", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);
    await retrieveTopK("test", "biz");
    const call = vi.mocked(prisma.$queryRaw).mock.calls[0];
    expect(call.slice(1)).toContain("biz");
  });
});
