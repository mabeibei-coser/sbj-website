import { describe, expect, it, beforeEach, vi } from "vitest";

// 1. mock prisma + audit（必须在 import 被测模块之前）
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn(),
    wikiPage: { findUnique: vi.fn(), update: vi.fn() },
    wikiPageVersion: { create: vi.fn() },
  },
}));
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(async () => undefined),
}));

import { updateWikiContent } from "@/lib/qa/wiki";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

function setupTransactionMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prisma.$transaction as any).mockImplementation(async (cb: (tx: typeof prisma) => Promise<unknown>) => {
    return cb(prisma);
  });
}

describe("updateWikiContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("成功路径：版本+1 + WikiPageVersion 写入 + audit 调用", async () => {
    setupTransactionMock();
    vi.mocked(prisma.wikiPage.findUnique).mockResolvedValue({
      id: "p1", kbType: "policy", slug: "a", title: "T", content: "old",
      sourceUrl: null, version: 3, publishedAt: null,
      createdAt: new Date(), updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.wikiPage.update).mockResolvedValue({
      id: "p1", kbType: "policy", slug: "a", title: "T", content: "new",
      sourceUrl: null, version: 4, publishedAt: null,
      createdAt: new Date(), updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.wikiPageVersion.create).mockResolvedValue({} as never);

    const r = await updateWikiContent({
      id: "p1", content: "new", editorId: "user-1", diffSummary: "fix typo",
    });

    expect(r.version).toBe(4);
    expect(r.content).toBe("new");
    expect(prisma.wikiPage.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ content: "new", version: 4 }),
    });
    expect(prisma.wikiPageVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        wikiPageId: "p1",
        version: 4,
        contentSnapshot: "new",
        editorId: "user-1",
        diffSummary: "fix typo",
      }),
    });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
      actor: "admin:user-1",
      action: "wiki.update",
      targetType: "wiki_page",
      targetId: "p1",
      before: { version: 3 },
      after: expect.objectContaining({ version: 4, contentChars: 3 }),
    }));
  });

  it("不存在的 id → throw 'WikiPage not found'", async () => {
    setupTransactionMock();
    vi.mocked(prisma.wikiPage.findUnique).mockResolvedValue(null);

    await expect(
      updateWikiContent({ id: "nope", content: "X", editorId: "user-1" })
    ).rejects.toThrow("WikiPage not found");

    expect(prisma.wikiPage.update).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("diffSummary 缺省时填充默认值", async () => {
    setupTransactionMock();
    vi.mocked(prisma.wikiPage.findUnique).mockResolvedValue({
      id: "p1", version: 1, kbType: "policy", slug: "a", title: "T", content: "old",
      sourceUrl: null, publishedAt: null, createdAt: new Date(), updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.wikiPage.update).mockResolvedValue({
      id: "p1", version: 2, kbType: "policy", slug: "a", title: "T", content: "new",
      sourceUrl: null, publishedAt: null, createdAt: new Date(), updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.wikiPageVersion.create).mockResolvedValue({} as never);

    await updateWikiContent({ id: "p1", content: "new", editorId: "alice" });

    expect(prisma.wikiPageVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        diffSummary: "manual edit by alice",
      }),
    });
  });
});
