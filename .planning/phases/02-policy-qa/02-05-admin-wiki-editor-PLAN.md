---
phase: 02-policy-qa
plan: 05
type: execute
wave: 3
depends_on: [02-02]
files_modified:
  - lib/qa/wiki.ts
  - app/api/admin/wiki/route.ts
  - app/api/admin/wiki/[id]/route.ts
  - app/admin/wiki/page.tsx
  - app/admin/wiki/[id]/page.tsx
  - app/admin/wiki/[id]/editor.tsx
  - tests/qa/wiki-update.test.ts
autonomous: true
requirements: [QA-12]
must_haves:
  truths:
    - "工作人员登录 /admin/login 后访问 /admin/wiki 看到 WikiPage 列表（按 kb_type 筛 + title 模糊搜 + updatedAt 倒序）"
    - "点击行进入 /admin/wiki/[id] 编辑页（split view：左 textarea / 右 react-markdown 预览）"
    - "保存调 PUT /api/admin/wiki/[id]，事务性写 WikiPage.content 更新（version+1）+ WikiPageVersion 历史 + audit_logs 一条 wiki.update"
    - "未登录访问 /admin/wiki 跳转到 /admin/login（proxy.ts 自动处理）"
    - "未登录 PUT /api/admin/wiki/[id] 返回 401（proxy.ts 自动处理）"
    - "保存语义不做实时协作 / 不加锁（D-22 / D-23）"
  artifacts:
    - path: "lib/qa/wiki.ts"
      provides: "updateWikiContent 实现（02-02 stub 替换为事务实现）"
      contains: "prisma.\\$transaction"
    - path: "app/api/admin/wiki/route.ts"
      provides: "GET /api/admin/wiki 列表（含 kbType 筛 + title 搜）"
      exports: ["GET"]
    - path: "app/api/admin/wiki/[id]/route.ts"
      provides: "PUT /api/admin/wiki/[id] 保存"
      exports: ["PUT"]
    - path: "app/admin/wiki/page.tsx"
      provides: "wiki 列表页（server component，sgmented control 筛 kb_type）"
    - path: "app/admin/wiki/[id]/page.tsx"
      provides: "编辑页 server wrapper（取数据 → 渲染 client editor）"
    - path: "app/admin/wiki/[id]/editor.tsx"
      provides: "split view 编辑器（textarea + react-markdown 预览 + 保存）"
    - path: "tests/qa/wiki-update.test.ts"
      provides: "updateWikiContent 事务 + audit 测试"
  key_links:
    - from: "app/admin/wiki/[id]/editor.tsx"
      to: "PUT /api/admin/wiki/[id]"
      via: "fetch + onSave"
      pattern: "/api/admin/wiki/"
    - from: "app/api/admin/wiki/[id]/route.ts"
      to: "lib/qa/wiki.ts updateWikiContent"
      via: "service 层（事务 + audit 在 service 写）"
      pattern: "updateWikiContent\\("
    - from: "lib/qa/wiki.ts updateWikiContent"
      to: "prisma.\\$transaction (WikiPage update + WikiPageVersion create)"
      via: "事务"
      pattern: "wikiPageVersion\\.create"
    - from: "lib/qa/wiki.ts updateWikiContent"
      to: "lib/audit.ts logAudit"
      via: "事务外写 wiki.update audit"
      pattern: "wiki\\.update"
---

<objective>
让工作人员通过 /admin/wiki 后台直接编辑 WikiPage 内容（D-21 ~ D-24）。每次保存事务性写 WikiPage 更新 + WikiPageVersion 历史 + audit_logs，不做实时协作 / 不加锁（按 D-22/D-23 最简化）。

Purpose: Phase 2 success criterion 4 条没有直接覆盖 admin editor，但 QA-12 是 v1 必须项；甲方在 W2 demo 后会立即问"我们怎么改/补政策"，没有这个后台他们会卡住。

Output:
- lib/qa/wiki.ts 的 updateWikiContent 完整实现（替换 02-02 留下的 stub）
- 2 个 API route（GET list / PUT update）
- 3 个页面/组件（list 页 + 编辑页 wrapper + client editor）
- 1 个事务 + audit 单元测试

不在本 plan 范围（其他 plan 处理）：
- 创建 wiki page 的 UI（编译 CLI 02-01 已能创建；admin UI 仅"编辑已有"，"创建新页"在 v2）
- 删除 wiki page UI（不在 v1）
- 版本回滚 UI（D-05 已说明 Phase 2 不做）
- biz_kb 文件的内容 — 仅提供 UI 让工作人员编辑（甲方素材到位后用编译命令导入）
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/02-policy-qa/02-CONTEXT.md
@.planning/phases/02-policy-qa/02-PATTERNS.md
@.planning/phases/02-policy-qa/02-02-SUMMARY.md
@CLAUDE.md
@DESIGN.md
@lib/qa/wiki.ts
@lib/db.ts
@lib/audit.ts
@lib/admin-session.ts
@app/api/admin/login/route.ts
@app/api/admin/whoami/route.ts
@app/admin/page.tsx
@app/admin/login/page.tsx
@app/admin/dashboard/llm/page.tsx
@proxy.ts
@prisma/schema.prisma

<interfaces>
<!-- Phase 1 + 02-02 已就位 -->

From lib/qa/wiki.ts (02-02 实现的 stub 接口):
```typescript
export interface WikiPageRow { ... }
export async function listWikiPages(kbType?, titleQuery?): Promise<WikiPageRow[]>;
export async function getWikiPage(id: string): Promise<WikiPageRow | null>;
export async function getWikiPageBySlug(kbType, slug): Promise<WikiPageRow | null>;

// 本 plan 替换实现（02-02 留的 stub 是 throw "Plan 02-05: TODO"）
export interface UpdateWikiInput { id; content; editorId; diffSummary? }
export async function updateWikiContent(input: UpdateWikiInput): Promise<WikiPageRow>;
```

From lib/admin-session.ts:
```typescript
export async function getAdminSession(): Promise<{
  isAdmin: boolean;
  userId?: string;
  role?: "admin" | "reviewer";
}>;
export async function requireAdminRole(roles: Array<"admin" | "reviewer">): Promise<{...}>;
```

From proxy.ts:
```typescript
// matcher: "/admin/:path*", "/api/admin/:path*"
// 自动拦截：未登录访问 → 重定向 /admin/login (页面) 或 401 (API)
```

From lib/audit.ts:
```typescript
export async function logAudit({ actor, action, targetType?, targetId?, before?, after?, request? }): Promise<void>;
```

From lib/db.ts:
```typescript
export const prisma: PrismaClient;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 实现 lib/qa/wiki.ts 的 updateWikiContent（事务 + audit）+ 单元测试</name>
  <files>
    lib/qa/wiki.ts (modify — 替换 stub 为实现),
    tests/qa/wiki-update.test.ts (new)
  </files>
  <read_first>
    - lib/qa/wiki.ts (02-02 创建的 stub)
    - lib/citizens.ts (整文件 — 事务 / service 风格)
    - scripts/wiki/compile.ts (publishTopic 内的 prisma.$transaction 用法 — 02-01 实现)
    - lib/audit.ts (整文件)
    - prisma/schema.prisma (WikiPage / WikiPageVersion 字段)
    - tests/llm-client.test.ts (vi.mock 顺序模板)
    - .planning/phases/02-policy-qa/02-PATTERNS.md §2 lib/qa/wiki.ts (整段 + Shared C 段)
    - .planning/phases/02-policy-qa/02-CONTEXT.md D-23 / D-26
  </read_first>
  <behavior>
    - getWikiPage 找不到 id → throw / 返 null（按 02-02 签名定的 null）
    - updateWikiContent 成功 → 返回 updated WikiPageRow（version 已 +1，content 已更新）
    - 在事务内：版本号严格 +1（先 read existing.version，再 +1 写入）
    - 事务内：写一条 WikiPageVersion，contentSnapshot=新内容，editorId=参数传入，diffSummary=参数传入
    - 事务外：写一条 audit_logs，action="wiki.update"，targetType="wiki_page"，targetId=wiki page id，before={version: old}，after={version: new, contentChars: <新内容长度>}
    - 不存在的 id → 在事务内 prisma.findUnique 返 null → throw（让 caller 决定 404）
    - audit 写失败 silent（lib/audit.ts 内部已 try/catch）
  </behavior>
  <action>
    **TDD 顺序（RED → GREEN → REFACTOR）**：
    本 task 标 `tdd="true"`。executor 必须按下面顺序执行，**先写测试看 FAIL，再写实现看 PASS**：
    1. **RED 阶段**：先写 Step 1.2（tests/qa/wiki-update.test.ts），跑 `npx vitest run tests/qa/wiki-update.test.ts`，应当 FAIL（updateWikiContent 还是 02-02 的 stub `throw "Plan 02-05: TODO"`，3 个 it 都会爆 stub 错误）。保留日志中的 `FAIL` 行作为 RED 证据。
    2. **GREEN 阶段**：写 Step 1.1（替换 stub 为事务实现），最简通过测试即可。再跑同一命令应 exit 0，3 个 it 全过。
    3. **REFACTOR 阶段**：清理（重命名 / 加注释 / 抽 helper），仍 exit 0；`npm run typecheck` 仍 exit 0。

    ---

    **Step 1.1 — 替换 lib/qa/wiki.ts 的 updateWikiContent stub**：

    ```typescript
    // 在 lib/qa/wiki.ts 末尾（替换原 stub）
    import { logAudit } from "@/lib/audit";

    export async function updateWikiContent(input: UpdateWikiInput): Promise<WikiPageRow> {
      const { id, content, editorId, diffSummary } = input;

      // ---- 事务：read → update → version snapshot ----
      const updated = await prisma.$transaction(async (tx) => {
        const existing = await tx.wikiPage.findUnique({ where: { id } });
        if (!existing) {
          throw new Error(`WikiPage not found: ${id}`);
        }

        const newVersion = existing.version + 1;
        const updated = await tx.wikiPage.update({
          where: { id },
          data: {
            content,
            version: newVersion,
            // publishedAt 不在 admin update 里改（保留原值；如要"重新发布"需要单独按钮）
          },
        });

        await tx.wikiPageVersion.create({
          data: {
            wikiPageId: id,
            version: newVersion,
            contentSnapshot: content,
            editorId,
            diffSummary: diffSummary ?? `manual edit by ${editorId}`,
          },
        });

        return updated;
      });

      // ---- 事务外：audit (D-26) ----
      await logAudit({
        actor: `admin:${editorId}`,
        action: "wiki.update",
        targetType: "wiki_page",
        targetId: id,
        before: { version: updated.version - 1 },
        after: {
          version: updated.version,
          contentChars: content.length,
          kbType: updated.kbType,
          slug: updated.slug,
        },
      });

      return toRow(updated);
    }
    ```

    确认 `toRow` helper 已在 02-02 创建（用于把 Prisma 返回类型转成 plain object）。

    **Step 1.2 — 测试 tests/qa/wiki-update.test.ts**：

    ```typescript
    import { describe, expect, it, beforeEach, vi } from "vitest";

    // 1. mock prisma + audit
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

    function setupTransactionMock(callback: (tx: typeof prisma) => Promise<unknown>) {
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: never) => {
        // cb 是用户传入的 async (tx) => ...; 我们直接传同一个 mock prisma 当 tx
        return (cb as unknown as (tx: typeof prisma) => Promise<unknown>)(prisma);
      });
    }

    describe("updateWikiContent", () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      it("成功路径：版本+1 + WikiPageVersion 写入 + audit 调用", async () => {
        setupTransactionMock(async () => undefined);
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
        setupTransactionMock(async () => undefined);
        vi.mocked(prisma.wikiPage.findUnique).mockResolvedValue(null);

        await expect(
          updateWikiContent({ id: "nope", content: "X", editorId: "user-1" })
        ).rejects.toThrow("WikiPage not found");

        expect(prisma.wikiPage.update).not.toHaveBeenCalled();
        expect(logAudit).not.toHaveBeenCalled();
      });

      it("diffSummary 缺省时填充默认值", async () => {
        setupTransactionMock(async () => undefined);
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
    ```

    **Step 1.3 — 验证**：
    `npm run typecheck && npx vitest run tests/qa/wiki-update.test.ts`
  </action>
  <acceptance_criteria>
    - `lib/qa/wiki.ts` 的 `updateWikiContent` 不再 throw "Plan 02-05: TODO"，实现完整。
    - `grep -q "prisma.\$transaction" lib/qa/wiki.ts` 在 updateWikiContent 函数体内。
    - `grep -q "wiki.update" lib/qa/wiki.ts`（audit action 名）。
    - `grep -q "admin:" lib/qa/wiki.ts`（audit actor 命名）。
    - `npx vitest run tests/qa/wiki-update.test.ts` 退 0，3 个 it 全过。
    - `npm run typecheck` 退 0。
    - **RED gate passed**：在替换 stub 实现**之前**（即 Step 1.2 测试已写、Step 1.1 实现未写时），`npx vitest run tests/qa/wiki-update.test.ts` 报 FAIL（3 个 it 全部因 "Plan 02-05: TODO" stub throw 失败）。
    - **GREEN gate passed**：写完 Step 1.1 实现后，`npx vitest run tests/qa/wiki-update.test.ts` exit 0。
    - **REFACTOR gate passed**：清理后仍 exit 0；`npm run typecheck` 仍 exit 0。
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && npx vitest run tests/qa/wiki-update.test.ts && grep -q "prisma.\$transaction" lib/qa/wiki.ts && grep -q "wiki.update" lib/qa/wiki.ts</automated>
  </verify>
  <done>
    - updateWikiContent 实现完成，事务 + audit 全套
    - 3 个测试用例覆盖：成功 / not found / diffSummary 缺省
  </done>
</task>

<task type="auto">
  <name>Task 2: API route — GET /api/admin/wiki 列表 + PUT /api/admin/wiki/[id] 更新</name>
  <files>
    app/api/admin/wiki/route.ts (new),
    app/api/admin/wiki/[id]/route.ts (new)
  </files>
  <read_first>
    - app/api/admin/login/route.ts (15-48 — Zod + service + audit 标准模板)
    - app/api/admin/whoami/route.ts (整文件 — admin GET 模板)
    - lib/admin-session.ts (整文件 — getAdminSession 用法)
    - lib/qa/wiki.ts (Task 1 已实现 listWikiPages + updateWikiContent + getWikiPage)
    - proxy.ts (54-71 — matcher 已自动拦截 /api/admin/*)
    - .planning/phases/02-policy-qa/02-PATTERNS.md §5 app/api/admin/wiki/route.ts + [id]/route.ts (整段)
  </read_first>
  <action>
    **Step 2.1 — app/api/admin/wiki/route.ts (GET list)**：

    ```typescript
    import { NextRequest, NextResponse } from "next/server";
    import { listWikiPages } from "@/lib/qa/wiki";

    /**
     * GET /api/admin/wiki?kbType=policy|biz&q=<title 模糊搜>
     *
     * 鉴权：proxy.ts matcher /api/admin/* 自动拦截未登录请求（401）。本 handler 不重复鉴权。
     */
    export async function GET(req: NextRequest) {
      const url = req.nextUrl;
      const kbTypeRaw = url.searchParams.get("kbType");
      const q = url.searchParams.get("q") ?? undefined;

      if (kbTypeRaw && kbTypeRaw !== "policy" && kbTypeRaw !== "biz") {
        return NextResponse.json(
          { error: "kbType 必须是 policy 或 biz" },
          { status: 400 }
        );
      }

      try {
        const items = await listWikiPages(
          (kbTypeRaw as "policy" | "biz" | null) ?? null,
          q
        );
        return NextResponse.json({ items });
      } catch (err) {
        console.error("[admin/wiki] list failed:", err);
        return NextResponse.json(
          { items: [], error: "查询失败" },
          { status: 500 }
        );
      }
    }
    ```

    **Step 2.2 — app/api/admin/wiki/[id]/route.ts (PUT update)**：

    沿 `app/api/admin/login/route.ts` 模板 + 用 `getAdminSession` 取 editorId：

    ```typescript
    import { NextRequest, NextResponse } from "next/server";
    import { z } from "zod";
    import { getAdminSession } from "@/lib/admin-session";
    import { updateWikiContent } from "@/lib/qa/wiki";

    const PutSchema = z.object({
      content: z.string().min(1, "内容不能为空").max(50_000, "内容超过 50000 字"),
      diffSummary: z.string().max(500).optional(),
    });

    export async function PUT(
      req: NextRequest,
      ctx: { params: Promise<{ id: string }> }
    ) {
      const { id } = await ctx.params;

      // ---- 取 session（proxy 已保证 isAdmin=true，但还要 userId 写 audit） ----
      const session = await getAdminSession();
      if (!session.isAdmin) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
      }
      const editorId = session.userId ?? "default";

      // ---- JSON 解析 + Zod ----
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
      }
      const parsed = PutSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "参数错误" },
          { status: 400 }
        );
      }

      // ---- 调 service ----
      try {
        const updated = await updateWikiContent({
          id,
          content: parsed.data.content,
          editorId,
          diffSummary: parsed.data.diffSummary,
        });
        return NextResponse.json({ ok: true, page: updated });
      } catch (err) {
        if (err instanceof Error && err.message.includes("not found")) {
          return NextResponse.json({ error: "Wiki 不存在" }, { status: 404 });
        }
        console.error("[admin/wiki PUT] failed:", err);
        return NextResponse.json({ error: "保存失败" }, { status: 500 });
      }
    }
    ```

    **Step 2.3 — 验证**：

    - `npm run typecheck` 退 0
    - 实跑（如 dev server + 已登录 session）：
      - `curl http://localhost:3000/api/admin/wiki?kbType=policy` 应返回 `{items: [...]}`（即使空数组）
      - 未登录：`curl http://localhost:3000/api/admin/wiki` 应被 proxy.ts 拦截返 401
      - PUT 已登录：`curl -X PUT http://localhost:3000/api/admin/wiki/<existing-id> -H "content-type:application/json" --cookie "iron-session..." -d '{"content":"test"}'` 应返 200 + page 新版本号
  </action>
  <acceptance_criteria>
    - 文件存在：`app/api/admin/wiki/route.ts` 含 `export async function GET`，参数解析 kbType / q，错误返 400/500。
    - 文件存在：`app/api/admin/wiki/[id]/route.ts` 含 `export async function PUT`，含 `getAdminSession()` + `updateWikiContent()` 调用 + 404 on not found。
    - `grep -q "getAdminSession" app/api/admin/wiki/\[id\]/route.ts`。
    - `grep -q "updateWikiContent" app/api/admin/wiki/\[id\]/route.ts`。
    - `npm run typecheck` 退 0。
    - **不需要在 handler 内手写 401 鉴权**（proxy.ts 已处理；handler 只需用 session.userId 取 editorId）。
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && grep -q "export async function GET" app/api/admin/wiki/route.ts && grep -q "export async function PUT" app/api/admin/wiki/\[id\]/route.ts && grep -q "getAdminSession" app/api/admin/wiki/\[id\]/route.ts && grep -q "updateWikiContent" app/api/admin/wiki/\[id\]/route.ts</automated>
  </verify>
  <done>
    - 2 个 API route 全部沿 Phase 1 模板（Zod + service + audit 由 service 内部写）
    - 401 由 proxy.ts 自动处理，handler 不重复
    - 404 / 400 / 500 错误码齐全
  </done>
</task>

<task type="auto">
  <name>Task 3: 后台 UI — list 页 + 编辑页 wrapper + client editor</name>
  <files>
    app/admin/wiki/page.tsx (new),
    app/admin/wiki/[id]/page.tsx (new),
    app/admin/wiki/[id]/editor.tsx (new)
  </files>
  <read_first>
    - app/admin/dashboard/llm/page.tsx (74-165 — server + Prisma + table 模板)
    - app/admin/page.tsx (整文件 — admin layout)
    - app/admin/login/page.tsx (9-74 — client form 模板)
    - lib/qa/wiki.ts (listWikiPages / getWikiPage 已实现)
    - .planning/phases/02-policy-qa/02-PATTERNS.md §5 app/admin/wiki/* (整段)
    - DESIGN.md §7 components + admin 视觉
    - components/ui/button.tsx + card.tsx (Plan 02-04 已 fork — 直接用)
  </read_first>
  <action>
    **Step 3.1 — app/admin/wiki/page.tsx (list)**：

    沿 `app/admin/dashboard/llm/page.tsx:74-165` 模板：

    ```tsx
    import Link from "next/link";
    import { listWikiPages } from "@/lib/qa/wiki";

    export const dynamic = "force-dynamic";

    interface PageProps {
      searchParams: Promise<{ kb?: string; q?: string }>;
    }

    function parseKb(s: string | undefined): "policy" | "biz" | null {
      return s === "policy" || s === "biz" ? s : null;
    }

    export default async function AdminWikiListPage({ searchParams }: PageProps) {
      const sp = await searchParams;
      const kbFilter = parseKb(sp.kb);
      const qFilter = sp.q?.trim() || undefined;

      let pages;
      try {
        pages = await listWikiPages(kbFilter, qFilter);
      } catch (err) {
        return (
          <main className="flex-1 p-8">
            <p className="text-sm text-red-600">加载失败：{err instanceof Error ? err.message : String(err)}</p>
          </main>
        );
      }

      return (
        <main className="flex-1 p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Wiki 编辑</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">编辑政策与办事库 / 创业与行业库</p>
              </div>
              <Link href="/admin" className="text-sm text-[var(--blue-500)] hover:underline">
                ← 返回后台
              </Link>
            </header>

            {/* 筛选 + 搜索 */}
            <form className="flex gap-3 items-center" method="get">
              <div role="tablist" className="flex border border-[var(--border)] rounded-md overflow-hidden">
                {[
                  { value: "", label: "全部" },
                  { value: "policy", label: "政策" },
                  { value: "biz", label: "创业" },
                ].map((opt) => {
                  const active = (kbFilter ?? "") === opt.value;
                  return (
                    <a
                      key={opt.value}
                      href={`/admin/wiki?${new URLSearchParams({
                        ...(opt.value ? { kb: opt.value } : {}),
                        ...(qFilter ? { q: qFilter } : {}),
                      }).toString()}`}
                      className={`px-4 py-1.5 text-sm ${active ? "bg-[var(--blue-500)] text-white" : "bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"}`}
                    >
                      {opt.label}
                    </a>
                  );
                })}
              </div>
              <input
                type="text"
                name="q"
                defaultValue={qFilter ?? ""}
                placeholder="搜索标题..."
                className="flex-1 max-w-sm px-3 py-1.5 border border-[var(--border)] rounded-md text-sm"
              />
              {kbFilter && <input type="hidden" name="kb" value={kbFilter} />}
              <button type="submit" className="px-4 py-1.5 text-sm border border-[var(--border)] rounded-md hover:bg-[var(--surface-hover)]">
                搜索
              </button>
            </form>

            <p className="text-xs text-[var(--text-muted)]">{pages.length} 篇</p>

            {/* 列表 */}
            <table className="w-full text-sm border-collapse">
              <thead className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="pb-2 pr-4">类型</th>
                  <th className="pb-2 pr-4">标题</th>
                  <th className="pb-2 pr-4">slug</th>
                  <th className="pb-2 pr-4">版本</th>
                  <th className="pb-2 pr-4">更新于</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                    <td className="py-2 pr-4 text-xs text-[var(--text-muted)] uppercase">{p.kbType}</td>
                    <td className="py-2 pr-4 font-medium">{p.title}</td>
                    <td className="py-2 pr-4 text-xs text-[var(--text-muted)] font-mono">{p.slug}</td>
                    <td className="py-2 pr-4 tabular-nums">v{p.version}</td>
                    <td className="py-2 pr-4 text-xs text-[var(--text-muted)] tabular-nums">
                      {new Date(p.updatedAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="py-2 text-right">
                      <Link href={`/admin/wiki/${p.id}`} className="text-[var(--blue-500)] hover:underline">
                        编辑 →
                      </Link>
                    </td>
                  </tr>
                ))}
                {pages.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                      暂无 wiki 内容。运行 <code className="bg-[var(--surface-muted)] px-1 rounded">npm run wiki:compile -- --kb=policy --publish</code> 编译生成。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      );
    }
    ```

    **Step 3.2 — app/admin/wiki/[id]/page.tsx (server wrapper)**：

    ```tsx
    import { notFound } from "next/navigation";
    import { getWikiPage } from "@/lib/qa/wiki";
    import { WikiEditor } from "./editor";

    export const dynamic = "force-dynamic";

    interface PageProps {
      params: Promise<{ id: string }>;
    }

    export default async function WikiEditPage({ params }: PageProps) {
      const { id } = await params;
      const page = await getWikiPage(id);
      if (!page) notFound();

      return (
        <WikiEditor
          initialPage={{
            id: page.id,
            kbType: page.kbType,
            slug: page.slug,
            title: page.title,
            content: page.content,
            version: page.version,
          }}
        />
      );
    }
    ```

    **Step 3.3 — app/admin/wiki/[id]/editor.tsx (client editor)**：

    ```tsx
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
          const data = (await res.json()) as { ok?: boolean; page?: { version: number }; error?: string };
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
                <Link href="/admin/wiki" className="text-sm text-[var(--blue-500)] hover:underline flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" /> 列表
                </Link>
                <div>
                  <div className="text-xs text-[var(--text-muted)] uppercase">{initialPage.kbType} / {initialPage.slug}</div>
                  <h1 className="text-xl font-semibold">{initialPage.title}</h1>
                </div>
              </div>
              <span className="text-xs text-[var(--text-muted)] tabular-nums">当前版本：v{currentVersion}</span>
            </header>

            <form onSubmit={onSave} className="space-y-3">
              {/* split view */}
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

              {/* diff summary + 保存按钮 */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={diffSummary}
                  onChange={(e) => setDiffSummary(e.target.value.slice(0, 500))}
                  placeholder="本次修改摘要（可选，最多 500 字）"
                  className="flex-1 px-3 py-2 border border-[var(--border)] rounded-md text-sm"
                  maxLength={500}
                />
                <span className="text-xs text-[var(--text-muted)] tabular-nums whitespace-nowrap">{diffSummary.length} / 500</span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[var(--blue-500)] text-white text-sm rounded-md font-medium disabled:opacity-50 hover:bg-[var(--blue-600)] flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {submitting ? "保存中..." : "保存"}
                </button>
              </div>

              {error && (
                <div role="alert" className="text-sm text-[var(--negative)] bg-[var(--negative-bg)] p-3 rounded-md">
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
    ```

    **Step 3.4 — 验证**：

    - `npm run typecheck` 退 0
    - `npm run build` 退 0
    - 实跑（如 dev + 已登录）：
      - `/admin/wiki` 列表显示（即使空数组也显示提示文案）
      - 切 kb 筛选 / 搜标题 → URL 同步刷新
      - 点击编辑进入 split view
      - 改 textarea → 右侧 markdown preview 实时更新
      - 点保存 → 显示"已保存 → v2" + 版本号刷新
  </action>
  <acceptance_criteria>
    - 3 个文件存在：`app/admin/wiki/page.tsx` / `app/admin/wiki/[id]/page.tsx` / `app/admin/wiki/[id]/editor.tsx`。
    - `app/admin/wiki/page.tsx` 是 server component（无 `"use client"`），含 `listWikiPages` + 表格渲染 + kb_type segmented control + title 搜索。
    - `app/admin/wiki/[id]/page.tsx` 是 server component（无 `"use client"`），含 `getWikiPage` + `notFound()`。
    - `app/admin/wiki/[id]/editor.tsx` 第一行是 `"use client"`，含 textarea + ReactMarkdown + onSave + version 状态。
    - `grep -q "PUT" app/admin/wiki/\[id\]/editor.tsx` 且 `grep -q "/api/admin/wiki/" app/admin/wiki/\[id\]/editor.tsx`。
    - `npm run typecheck` 退 0。
    - `npm run build` 退 0。
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && npm run build && grep -q "use client" app/admin/wiki/\[id\]/editor.tsx && grep -q "listWikiPages" app/admin/wiki/page.tsx && grep -q "getWikiPage" app/admin/wiki/\[id\]/page.tsx && grep -q "PUT" app/admin/wiki/\[id\]/editor.tsx</automated>
  </verify>
  <done>
    - 3 个文件实现：list 页 + 编辑页 wrapper + client split-view editor
    - 列表支持 kb 筛 + 搜索；编辑器支持 textarea + 实时 preview + diff summary + 保存
    - DESIGN.md §9 黑名单 0 触犯
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 工作人员浏览器 → /admin/wiki/* | 已登录 admin（proxy.ts 强制） |
| /api/admin/wiki/[id] PUT body | 工作人员输入的 markdown content（信任度高，因为已登录工作人员）但仍 untrusted（避免越权） |
| react-markdown 渲染（编辑预览） | 客户端渲染，潜在 XSS 风险（如 LLM 编译产物含 `<script>`） |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-16 | Tampering | 工作人员越权改另一工作人员的 wiki | accept | Phase 2 不做页面级权限（D-21：admin / reviewer 都可编辑），所有改动 audit_logs 留痕（actor=admin:<userId>，editorId 写 WikiPageVersion）；Phase 4 CRM 时再做 page-level RBAC |
| T-02-17 | XSS | wiki content 含 `<script>` 通过 react-markdown 渲染 | mitigate | react-markdown v9 默认禁用 raw HTML（无 `<script>` 解析）；如需更严，按 D-22 引入 `rehype-sanitize`（如本仓未装则在本 plan 加 dep） |
| T-02-18 | Spoofing | 通过伪造 cookie 调 PUT | mitigate | proxy.ts 已校验 iron-session cookie；getAdminSession 双重校验 isAdmin |
| T-02-19 | Information Disclosure | 错误堆栈暴露 Prisma 字段 | mitigate | route handler catch 块返回固定 `error: "保存失败"`，不返回 err.message |
| T-02-20 | Repudiation | 工作人员篡改后否认 | mitigate | wikiPageVersion 表存 contentSnapshot + editorId + diffSummary；audit_logs 留 actor=admin:<id> + before/after version |
</threat_model>

<verification>
1. **更新事务完整**：updateWikiContent 内部 `prisma.$transaction` 同时写 update + version create；事务外 logAudit。
2. **API 鉴权**：proxy.ts 自动拦截 /api/admin/* 未登录请求；handler 内仅用 `getAdminSession` 取 editorId，不重复 401 检查。
3. **测试覆盖**：tests/qa/wiki-update.test.ts 覆盖 success / not-found / diffSummary 缺省 三条路径。
4. **UI 完整**：list / edit wrapper / client editor 三件套；split view 实时 preview；save 后版本号刷新。
5. **build 通过**：`npm run build` 退 0。
</verification>

<success_criteria>
- [ ] updateWikiContent 实现完成（事务 + audit）
- [ ] GET / PUT 2 个 API route
- [ ] List 页 + 编辑页 wrapper + client editor 3 文件
- [ ] STRIDE 5 条威胁 4 mitigate 1 accept
- [ ] QA-12 完成
</success_criteria>

<output>
After completion, create `.planning/phases/02-policy-qa/02-05-SUMMARY.md` recording:
- 6 个新文件 + 1 个修改（lib/qa/wiki.ts updateWikiContent 实现）
- 单测通过数（wiki-update.test.ts 3 个 it）
- proxy.ts 自动鉴权确认（不在 handler 内手写 401）
- DESIGN.md §9 grep gate 通过
- npm run build 输出尺寸（关注 editor.tsx 是 client 组件，含 react-markdown）
- 已知 follow-up：page-level RBAC 在 Phase 4 CRM 一起做；rehype-sanitize 是否引入由 executor 在 build 时观察 react-markdown 输出后决定
</output>
</content>
</invoke>