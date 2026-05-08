---
phase: 02-policy-qa
plan: 04
type: execute
wave: 3
depends_on: [02-02, 02-03]
files_modified:
  - app/globals.css
  - components/ui/button.tsx
  - components/ui/card.tsx
  - components/ui/input.tsx
  - components/ui/label.tsx
  - components/ui/scroll-area.tsx
  - components/ui/badge.tsx
  - app/qa/page.tsx
  - app/qa/qa-tabs.tsx
  - app/qa/free-ask.tsx
  - app/qa/hot-cards.tsx
  - app/qa/wiki-list.tsx
  - app/qa/wiki/[kbType]/[slug]/page.tsx
autonomous: true
requirements: [QA-01, QA-04, QA-05, QA-08]
must_haves:
  truths:
    - "/qa 页面加载后默认 active tab=policy，URL 带 ?kb=policy；点击 biz 切换为 ?kb=biz，刷新保持"
    - "页面包含 3 个热点 cards，点击展开预设答案 markdown（不调 LLM；GET /api/qa/hot 拉数据）"
    - "页面含自由问输入框（≤500 字 + char counter），提交后调 POST /api/qa/answer，渲染 hit/partial/miss 三档不同 UI"
    - "页面右下方含 wiki 列表，按当前 kb_type 拉 WikiPage 表，每行 Link 到 /qa/wiki/[kbType]/[slug]"
    - "/qa/wiki/[kbType]/[slug] 详情页用 react-markdown 渲染 content + 末尾 disclaimer"
    - "全部页面视觉沿用 DESIGN.md v2（蓝白 cinematic）：含 aurora / glass-card / report-* 等已有 CSS class，禁止 emoji icon / 紫渐变 / 居中 hero"
    - "市民端 /qa 页面在 1280×720 视口渲染时，hero、tab、card、background 视觉与 career-report 主页一致：左对齐 hero、glass-card 半透明面板、aurora 渐变背景、blue-tint 主色（来源：career-report app/globals.css 已 fork 到 sbj-website app/globals.css）"
    - "components/ui/* 至少 6 个 shadcn 组件 fork 到位（button/card/input/label/scroll-area/badge）"
  artifacts:
    - path: "app/globals.css"
      provides: "完整 DESIGN.md v2 CSS 系统（aurora / glass-card / report-* / spotlight / hero-grid / blue-* tokens）"
      contains: ".glass-card"
    - path: "components/ui/button.tsx"
      provides: "shadcn Button 组件（fork from career-report）"
    - path: "components/ui/card.tsx"
      provides: "shadcn Card 组件"
    - path: "components/ui/input.tsx"
      provides: "shadcn Input 组件"
    - path: "components/ui/label.tsx"
      provides: "shadcn Label 组件"
    - path: "components/ui/scroll-area.tsx"
      provides: "shadcn ScrollArea 组件"
    - path: "components/ui/badge.tsx"
      provides: "shadcn Badge（hit/partial/miss 状态显示）"
    - path: "app/qa/page.tsx"
      provides: "市民端政策问答主页（server component，组装 hero + tabs + hot + free-ask + wiki list）"
    - path: "app/qa/qa-tabs.tsx"
      provides: "双 Tab 切换（policy / biz），URL 同步 ?kb=<type>"
    - path: "app/qa/free-ask.tsx"
      provides: "自由问输入框 + POST /api/qa/answer + 三档结果渲染"
    - path: "app/qa/hot-cards.tsx"
      provides: "3 热点 cards 渲染（server component，从 getHotQuestions() 直读）"
    - path: "app/qa/wiki-list.tsx"
      provides: "wiki 列表（按 kb_type 拉 WikiPage 表，server component）"
    - path: "app/qa/wiki/[kbType]/[slug]/page.tsx"
      provides: "wiki 详情页（dynamic route，react-markdown 渲染）"
  key_links:
    - from: "app/qa/free-ask.tsx"
      to: "POST /api/qa/answer"
      via: "fetch 请求 + 渲染 status/answer/citations"
      pattern: "/api/qa/answer"
    - from: "app/qa/hot-cards.tsx"
      to: "lib/qa/hot-questions.ts getHotQuestions"
      via: "server component 直读（也可走 GET /api/qa/hot，但 server-side 直读更快）"
      pattern: "getHotQuestions\\("
    - from: "app/qa/wiki-list.tsx"
      to: "lib/qa/wiki.ts listWikiPages"
      via: "server component Prisma 查询"
      pattern: "listWikiPages\\("
    - from: "app/qa/wiki/[kbType]/[slug]/page.tsx"
      to: "lib/qa/wiki.ts getWikiPageBySlug"
      via: "动态路由 + Prisma 查询 + react-markdown"
      pattern: "getWikiPageBySlug\\("
---

<objective>
搭建市民端政策问答完整 UI：从 globals.css + shadcn ui 前置工程，到 /qa 主页（hero + 双 tab + 热点 cards + 自由问 + wiki 列表）+ /qa/wiki/[kbType]/[slug] 详情页。

Purpose: Phase 2 success criterion #1（双页签）+ #2（3 热点）+ #3（自由问）的可视化交付，是 W2 demo 给甲方看到的"政策问答"模块所有屏幕。视觉血统沿用 career-report（DESIGN.md v2）——禁止重新设计。

**注意 — 本 plan 不正式覆盖 FE-* 需求**：响应式 / 跨端体验由 Phase 6 承担（ROADMAP 已分配 FE-01 ~ FE-05 到 Phase 6）。本 plan 在写 UI 时仍可以用 Tailwind 的 `md:` 等 responsive utility（这是好习惯），但不声称完成 FE-01 / FE-03 — 这些在 Phase 6 用专门的移动视口测试 + sm: 断点全覆盖时再正式 close。

Output:
- globals.css 升级（fork career-report，预计 ~600 行）
- components/ui/* 6 个 shadcn 基础组件 fork
- app/qa/* 6 个文件（1 server entry + 4 子组件 + 1 dynamic route）

不在本 plan 范围（其他 plan 处理）：
- /admin/wiki 编辑器（02-05）
- LLM eval（02-06）
- e2e 集成（02-07）
- 自由问 API + hot API（02-02 / 02-03 已建好）
- FE-* 响应式适配（Phase 6）
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-policy-qa/02-CONTEXT.md
@.planning/phases/02-policy-qa/02-PATTERNS.md
@.planning/phases/02-policy-qa/02-02-SUMMARY.md
@.planning/phases/02-policy-qa/02-03-SUMMARY.md
@CLAUDE.md
@DESIGN.md
@app/globals.css
@app/page.tsx
@app/admin/page.tsx
@app/admin/login/page.tsx
@app/admin/dashboard/llm/page.tsx
@app/privacy/page.tsx
@D:/career-report/app/globals.css
@D:/career-report/app/page.tsx
@D:/career-report/components/ui/button.tsx
@D:/career-report/components/ui/card.tsx
@D:/career-report/components/ui/input.tsx
@D:/career-report/components/ui/label.tsx
@D:/career-report/components/ui/scroll-area.tsx
@D:/career-report/components/ui/badge.tsx

<interfaces>
<!-- 02-02 / 02-03 / 02-01 已就位的关键 service / API -->

From lib/qa/hot-questions.ts:
```typescript
export interface HotQuestion {
  id: "q1" | "q2" | "q3";
  title: string;
  body: string;
  citations: string[];
  updatedAt: string;
}
export async function getHotQuestions(): Promise<HotQuestion[]>;
```

From lib/qa/wiki.ts:
```typescript
export interface WikiPageRow { id; kbType; slug; title; content; sourceUrl; version; publishedAt; createdAt; updatedAt; }
export async function listWikiPages(kbType?: "policy"|"biz"|null, titleQuery?: string): Promise<WikiPageRow[]>;
export async function getWikiPageBySlug(kbType, slug): Promise<WikiPageRow|null>;
```

POST /api/qa/answer 请求 / 响应:
```typescript
// Request
{ question: string (2-500 char), kbType: "policy"|"biz", phone?: "11位数字", consentId?: string }

// Response (200)
{ status: "hit"|"partial"|"miss", answer: string, citations: string[] }
// Response (403) - consent 未授权
{ status: "miss", error: "请先同意服务条款", answer: "", citations: [] }
// Response (400) - 参数错误
{ error: <message> }
```

GET /api/qa/hot 响应:
```typescript
{ items: HotQuestion[] }
```

From lib/qa/disclaimer.ts:
```typescript
export const QA_DISCLAIMER: string;
```
</interfaces>

<design_constraints>
**DESIGN.md v2 (蓝白 cinematic) Hard Don'ts (§9)** — 违反将被 Plan 02-07 e2e 视为失败：
- 禁止 emoji icon（用 lucide-react，所有 icon import from lucide）
- 禁止紫渐变 / `box-shadow: 0 0 60px purple`
- 禁止 `border-radius: 9999px` 全屏 pill
- 禁止 Inter / system-ui 主西文字体（用 career-report 的字体配置）
- 禁止居中 hero（career-report style：左对齐 hero with eyebrow + h1 + sub + cta）
- 禁止 AI 陈词（"无缝/释放/Elevate/赋能/Empower"）

**视觉血统**：sbj-website /qa 页面 = career-report `app/page.tsx` fork 改 prompt + 业务字段。颜色、字体、动画、组件全部沿用。
</design_constraints>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 前置工程 — globals.css 升级 + components/ui/* 6 组件 fork from career-report</name>
  <files>
    app/globals.css (overwrite),
    components/ui/button.tsx (new),
    components/ui/card.tsx (new),
    components/ui/input.tsx (new),
    components/ui/label.tsx (new),
    components/ui/scroll-area.tsx (new),
    components/ui/badge.tsx (new)
  </files>
  <read_first>
    - app/globals.css (本仓 Phase 1 stub — 15 行，知道当前差距)
    - D:/career-report/app/globals.css (整文件 — 来源，~600+ 行)
    - D:/career-report/components/ui/button.tsx (整文件)
    - D:/career-report/components/ui/card.tsx (整文件)
    - D:/career-report/components/ui/input.tsx (整文件)
    - D:/career-report/components/ui/label.tsx (整文件)
    - D:/career-report/components/ui/scroll-area.tsx (整文件)
    - D:/career-report/components/ui/badge.tsx (整文件)
    - DESIGN.md (整文件 — §10.1 直接 fork 策略 / §9 黑名单 / §7 组件库范围)
    - .planning/phases/02-policy-qa/02-PATTERNS.md §4 §"前置工程任务"段
    - package.json (确认 tailwind / clsx / tailwind-merge / class-variance-authority 已存在)
  </read_first>
  <action>
    **Step 1.1 — globals.css 整文件覆盖**：

    用 Read 工具读 `D:/career-report/app/globals.css` 整文件内容。
    用 Write 工具完整覆盖到本仓 `app/globals.css`（不要保留 Phase 1 stub 的 15 行——直接整文件替换）。

    **如有 sbj-website 业务必需的额外 token**（例如 zh-CN 字体偏好），加在文件末尾用 `/* sbj-website overrides */` 注释段落，不修改 fork 来源行。

    **Step 1.2 — fork 6 个 shadcn ui 组件**：

    依次：
    - 读 `D:/career-report/components/ui/button.tsx` 写到本仓 `components/ui/button.tsx`
    - 读 `D:/career-report/components/ui/card.tsx` 写到本仓 `components/ui/card.tsx`
    - `input.tsx` `label.tsx` `scroll-area.tsx` `badge.tsx` 同样

    **不修改组件代码**——直接整文件 fork。如 import 路径在 career-report 用了 `@/lib/utils`，确认本仓也有 `lib/utils.ts`（含 `cn = clsx + twMerge`），如没有则创建：

    ```typescript
    // lib/utils.ts
    import { clsx, type ClassValue } from "clsx";
    import { twMerge } from "tailwind-merge";

    export function cn(...inputs: ClassValue[]): string {
      return twMerge(clsx(inputs));
    }
    ```

    **Step 1.3 — 依赖检查**：

    `package.json` 确认 deps 含：
    - `clsx` `tailwind-merge` `class-variance-authority` `@radix-ui/react-slot` `@radix-ui/react-scroll-area` `@radix-ui/react-label` `lucide-react`

    缺哪个 `npm install` 哪个（与 career-report 同版本即可）。

    **Step 1.4 — Tailwind 配置**：

    本仓 `tailwind.config.ts` 如有，确认 content paths 包含 `app/**/*.{ts,tsx}` 和 `components/**/*.{ts,tsx}`（应已正确，Phase 1 配过）。如 globals.css 引用了 career-report 自定义 CSS variable，Tailwind safelist / content 不需要额外配置（CSS variable 不被 tailwind 扫描）。

    **Step 1.5 — 验证**：

    - `npm run typecheck` 退 0
    - `npm run build` 退 0（确认 Tailwind + globals.css 编译通过，不报 unknown class）
    - 内容校验（content-based，不是行数）：
      - `grep -cE "^@layer|--blue-|--positive-|--surface-" app/globals.css` ≥20（DESIGN tokens 完整）
      - `grep -c "\.glass-card" app/globals.css` ≥1（核心组件 class）
      - `grep -c "\.report-" app/globals.css` ≥5（report-* family 完整）
      - `grep -c "aurora" app/globals.css` ≥1（背景 class）
  </action>
  <acceptance_criteria>
    - **Content-based 校验（替代脆弱的行数 gate）**：
      - `grep -cE "^@layer|--blue-|--positive-|--surface-" app/globals.css` ≥20
      - `grep -c "\.glass-card" app/globals.css` ≥1
      - `grep -c "\.report-" app/globals.css` ≥5
      - `grep -c "aurora" app/globals.css` ≥1
      - `grep -c "spotlight\\|hero-grid" app/globals.css` ≥1（DESIGN.md §7 关键 class 之一）
    - 6 个 components/ui/*.tsx 全存在且非空（每个 `wc -l` ≥10）。
    - `lib/utils.ts` 存在且导出 `cn`（如缺则创建）。
    - `npm run typecheck` 退 0。
    - `npm run build` 退 0（Tailwind + Next.js 完整编译通过）。
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && npm run build && [ "$(grep -cE '^@layer|--blue-|--positive-|--surface-' app/globals.css)" -ge "20" ] && grep -q "\.glass-card" app/globals.css && [ "$(grep -c '\.report-' app/globals.css)" -ge "5" ] && grep -q "aurora" app/globals.css && test -f components/ui/button.tsx && test -f components/ui/card.tsx && test -f components/ui/input.tsx && test -f components/ui/label.tsx && test -f components/ui/scroll-area.tsx && test -f components/ui/badge.tsx && grep -q "export function cn" lib/utils.ts</automated>
  </verify>
  <done>
    - globals.css 升级到 career-report v2 全量（content-based 校验通过：tokens ≥20 / glass-card / report-* ≥5 / aurora）
    - 6 个 shadcn 基础组件可用
    - npm run build 通过（视觉框架 ready）
  </done>
</task>

<task type="auto">
  <name>Task 2: app/qa/page.tsx 主页 + qa-tabs.tsx + hot-cards.tsx + wiki-list.tsx 组装</name>
  <files>
    app/qa/page.tsx (new),
    app/qa/qa-tabs.tsx (new),
    app/qa/hot-cards.tsx (new),
    app/qa/wiki-list.tsx (new)
  </files>
  <read_first>
    - D:/career-report/app/page.tsx (363-580 — hero + sections 框架结构)
    - app/page.tsx (本仓 Phase 1 占位)
    - app/admin/page.tsx (server component 渲染范例)
    - app/admin/dashboard/llm/page.tsx (74-165 — server + Prisma + table 模板)
    - app/admin/login/page.tsx (9-74 — "use client" + useState 模板)
    - lib/qa/hot-questions.ts (Task 02-03 实现)
    - lib/qa/wiki.ts (Task 02-02 实现)
    - DESIGN.md §7 Component Library + §8 Page Templates + §9 Hard Don'ts
    - .planning/phases/02-policy-qa/02-PATTERNS.md §4 (整段)
    - .planning/phases/02-policy-qa/02-CONTEXT.md D-01 / D-28
  </read_first>
  <action>
    **Step 2.1 — app/qa/qa-tabs.tsx（client component 双 Tab 切换）**：

    ```tsx
    "use client";

    import { useRouter, useSearchParams } from "next/navigation";
    import { cn } from "@/lib/utils";

    export type KbType = "policy" | "biz";

    interface QaTabsProps {
      active: KbType;
    }

    const TABS: Array<{ id: KbType; label: string; description: string }> = [
      { id: "policy", label: "政策与办事库", description: "失业保险 / 就业补贴 / 社保办理" },
      { id: "biz", label: "创业与行业库", description: "创业孵化 / 创业贷款 / 政企对接" },
    ];

    export function QaTabs({ active }: QaTabsProps) {
      const router = useRouter();
      const searchParams = useSearchParams();

      function setKb(kb: KbType) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("kb", kb);
        router.replace(`/qa?${params.toString()}`, { scroll: false });
      }

      return (
        <div role="tablist" aria-label="知识库切换" className="flex gap-2 border-b border-[var(--border)]">
          {TABS.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setKb(tab.id)}
                className={cn(
                  "px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                  isActive
                    ? "border-[var(--blue-500)] text-[var(--blue-700)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <span className="block">{tab.label}</span>
                <span className="block text-xs text-[var(--text-muted)] font-normal mt-0.5">{tab.description}</span>
              </button>
            );
          })}
        </div>
      );
    }
    ```

    **Step 2.2 — app/qa/hot-cards.tsx（server component，3 张 spotlight cards）**：

    ```tsx
    import { getHotQuestions } from "@/lib/qa/hot-questions";
    import ReactMarkdown from "react-markdown";

    export async function HotCards() {
      let items;
      try {
        items = await getHotQuestions();
      } catch (err) {
        console.error("[hot-cards] failed:", err);
        return (
          <section aria-label="热点问题">
            <p className="text-sm text-[var(--text-muted)]">热点暂时不可用，请稍后再试。</p>
          </section>
        );
      }

      return (
        <section aria-label="热点问题" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((q) => (
            <details key={q.id} className="glass-card p-6 group">
              <summary className="cursor-pointer list-none">
                <div className="text-xs text-[var(--text-muted)] mb-1">热点 {q.id.toUpperCase()}</div>
                <h3 className="text-lg font-medium text-[var(--text-primary)]">{q.title}</h3>
                <span className="text-xs text-[var(--blue-500)] mt-2 inline-block group-open:hidden">点击展开 ↓</span>
                <span className="text-xs text-[var(--blue-500)] mt-2 inline-block hidden group-open:inline-block">收起 ↑</span>
              </summary>
              <article className="prose prose-zinc max-w-none mt-4 text-sm">
                <ReactMarkdown>{q.body}</ReactMarkdown>
              </article>
              <p className="text-xs text-[var(--text-muted)] mt-3">最近更新：{q.updatedAt}</p>
            </details>
          ))}
        </section>
      );
    }
    ```

    **Step 2.3 — app/qa/wiki-list.tsx（server component，按 kb_type 筛选）**：

    ```tsx
    import Link from "next/link";
    import { listWikiPages, type WikiPageRow } from "@/lib/qa/wiki";
    import type { KbType } from "./qa-tabs";

    export const dynamic = "force-dynamic";

    interface WikiListProps {
      kbType: KbType;
    }

    export async function WikiList({ kbType }: WikiListProps) {
      let pages: WikiPageRow[] = [];
      try {
        pages = await listWikiPages(kbType);
      } catch (err) {
        console.error("[wiki-list] failed:", err);
      }

      if (pages.length === 0) {
        return (
          <section aria-label="知识库文章" className="glass-card p-6">
            <h2 className="text-lg font-medium mb-2">知识库</h2>
            <p className="text-sm text-[var(--text-muted)]">
              {kbType === "policy" ? "政策与办事库" : "创业与行业库"} 暂无内容。
            </p>
          </section>
        );
      }

      return (
        <section aria-label="知识库文章" className="glass-card p-6">
          <h2 className="text-lg font-medium mb-4">
            {kbType === "policy" ? "政策与办事库" : "创业与行业库"}（{pages.length}）
          </h2>
          <ul className="divide-y divide-[var(--border)]">
            {pages.map((p) => (
              <li key={p.id} className="py-3">
                <Link
                  href={`/qa/wiki/${p.kbType}/${p.slug}`}
                  className="block hover:bg-[var(--surface-hover)] rounded px-2 -mx-2 transition-colors"
                >
                  <div className="text-sm font-medium text-[var(--text-primary)]">{p.title}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    更新：{p.updatedAt.toLocaleDateString("zh-CN")}
                    {p.version > 1 && ` · v${p.version}`}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      );
    }
    ```

    **Step 2.4 — app/qa/page.tsx（server entry，组装上述 + free-ask）**：

    ```tsx
    import { Suspense } from "react";
    import { QaTabs, type KbType } from "./qa-tabs";
    import { HotCards } from "./hot-cards";
    import { WikiList } from "./wiki-list";
    import { FreeAsk } from "./free-ask";

    interface PageProps {
      searchParams: Promise<{ kb?: string }>;
    }

    function parseKb(kb: string | undefined): KbType {
      return kb === "biz" ? "biz" : "policy";
    }

    export default async function QaPage({ searchParams }: PageProps) {
      const sp = await searchParams;
      const active = parseKb(sp.kb);

      return (
        <main className="min-h-screen bg-[var(--background)]">
          {/* Hero (短型) */}
          <section className="relative border-b border-[var(--border)] bg-gradient-to-b from-[var(--blue-50)] to-transparent">
            <div className="max-w-5xl mx-auto px-6 py-12">
              <div className="text-xs text-[var(--blue-500)] uppercase tracking-wider mb-2">
                上海黄浦区社保局 · 智能政策助理
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold text-[var(--text-primary)]">
                政策问答
              </h1>
              <p className="text-base text-[var(--text-muted)] mt-3 max-w-2xl">
                双库切换查询黄浦区就业、创业相关政策；3 个常见热点一键展开；其他问题用自由问，命中知识库时给出真实引用与免责声明。
              </p>
            </div>
          </section>

          <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
            {/* Tabs */}
            <QaTabs active={active} />

            {/* 热点 cards */}
            <Suspense fallback={<div className="text-sm text-[var(--text-muted)]">载入热点...</div>}>
              <HotCards />
            </Suspense>

            {/* 自由问 */}
            <FreeAsk kbType={active} />

            {/* Wiki list */}
            <Suspense fallback={<div className="text-sm text-[var(--text-muted)]">载入知识库...</div>}>
              <WikiList kbType={active} />
            </Suspense>
          </div>
        </main>
      );
    }
    ```

    **Step 2.5 — 验证**：

    - `npm run typecheck` 退 0
    - `npm run build` 退 0（Next.js 编译所有 server / client component 无错）
    - `next dev` + 浏览器打开 `http://localhost:3000/qa` 看到：左对齐 hero + 双 Tab + 3 热点 cards + 自由问输入框（Task 3 实现的 placeholder） + wiki list（即使为空也显示提示）
  </action>
  <acceptance_criteria>
    - 4 个文件存在：page.tsx / qa-tabs.tsx / hot-cards.tsx / wiki-list.tsx。
    - `qa-tabs.tsx` 第一行是 `"use client"`，含 `useRouter` `useSearchParams`，渲染 2 个 tab button（policy / biz）。
    - `hot-cards.tsx` 是 server component（不含 `"use client"`），调 `getHotQuestions()`，渲染 3 个 details card。
    - `wiki-list.tsx` 是 server component，调 `listWikiPages(kbType)`，每行 `<Link href="/qa/wiki/${kbType}/${slug}">`。
    - `page.tsx` 含 hero（左对齐，**不**居中——`text-center` 不应出现在 h1 / p 上）+ Suspense + 4 个子组件组装。
    - `grep -c "emoji\\|🎯\\|🚀\\|⭐" app/qa/*.tsx` 必须为 0（DESIGN.md §9）。
    - `grep -c "purple\\|fuchsia\\|pink-" app/qa/*.tsx` 必须为 0（禁止紫渐变）。
    - `grep -c "rounded-full" app/qa/*.tsx` ≤2（允许少量 badge 用，但不能 hero h1 上）。
    - `npm run typecheck` 退 0。
    - `npm run build` 退 0。
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && npm run build && grep -q "use client" app/qa/qa-tabs.tsx && grep -q "getHotQuestions" app/qa/hot-cards.tsx && grep -q "listWikiPages" app/qa/wiki-list.tsx && grep -q "QaTabs" app/qa/page.tsx && [ "$(grep -c '🎯\\|🚀\\|⭐' app/qa/*.tsx 2>/dev/null)" = "0" ] && [ "$(grep -c 'purple\\|fuchsia' app/qa/*.tsx 2>/dev/null)" = "0" ]</automated>
  </verify>
  <done>
    - 主页 + 3 个子组件全部 server-side rendering（除 qa-tabs 是 client）
    - DESIGN.md §9 黑名单 0 触犯（grep gate 全过）
    - npm run build 通过
  </done>
</task>

<task type="auto">
  <name>Task 3: app/qa/free-ask.tsx 自由问输入框 + 三档结果渲染 + app/qa/wiki/[kbType]/[slug]/page.tsx 详情页</name>
  <files>
    app/qa/free-ask.tsx (new),
    app/qa/wiki/[kbType]/[slug]/page.tsx (new)
  </files>
  <read_first>
    - app/admin/login/page.tsx (9-74 — fetch + setState 错误处理模板)
    - app/privacy/page.tsx (整文件 — react-markdown 渲染模板)
    - lib/qa/wiki.ts (getWikiPageBySlug 签名)
    - lib/qa/disclaimer.ts (QA_DISCLAIMER 常量)
    - app/qa/qa-tabs.tsx (Task 2 已实现 — KbType type)
    - .planning/phases/02-policy-qa/02-PATTERNS.md §4 free-ask.tsx + wiki/[kbType]/[slug]/page.tsx (整段)
    - DESIGN.md §3.3 (tabular-nums for char counter) + §2.4 (positive/warning 色)
  </read_first>
  <action>
    **Step 3.1 — app/qa/free-ask.tsx（client component, fetch /api/qa/answer + 三档渲染）**：

    ```tsx
    "use client";

    import { useState, type FormEvent } from "react";
    import ReactMarkdown from "react-markdown";
    import { Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";
    import type { KbType } from "./qa-tabs";

    type AnswerStatus = "hit" | "partial" | "miss";

    interface AnswerResult {
      status: AnswerStatus;
      answer: string;
      citations: string[];
    }

    interface FreeAskProps {
      kbType: KbType;
    }

    const MAX_QUESTION_LEN = 500;

    export function FreeAsk({ kbType }: FreeAskProps) {
      const [question, setQuestion] = useState("");
      const [submitting, setSubmitting] = useState(false);
      const [error, setError] = useState<string | null>(null);
      const [result, setResult] = useState<AnswerResult | null>(null);

      async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (question.trim().length < 2 || submitting) return;
        setSubmitting(true);
        setError(null);
        setResult(null);
        try {
          const res = await fetch("/api/qa/answer", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ question: question.trim(), kbType }),
          });
          const data = (await res.json()) as Partial<AnswerResult> & { error?: string };
          if (!res.ok) {
            setError(data.error ?? "服务暂时不可用，请稍后重试");
            return;
          }
          if (!data.status || !data.answer) {
            setError("响应数据异常");
            return;
          }
          setResult({
            status: data.status as AnswerStatus,
            answer: data.answer,
            citations: data.citations ?? [],
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "网络错误");
        } finally {
          setSubmitting(false);
        }
      }

      return (
        <section aria-label="自由问" className="glass-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-medium">自由问</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              输入您的问题，命中知识库时给出真实引用 + 1000 字内 + 免责声明；未命中时建议联系窗口。
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <label htmlFor="qa-question" className="sr-only">问题</label>
            <textarea
              id="qa-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION_LEN))}
              maxLength={MAX_QUESTION_LEN}
              disabled={submitting}
              rows={3}
              placeholder={kbType === "policy" ? "例：青年初次就业有哪些补贴？" : "例：黄浦区有哪些创业孵化基地？"}
              className="w-full p-3 rounded-md border border-[var(--border)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue-500)] disabled:opacity-50"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] tabular-nums">
                {question.length} / {MAX_QUESTION_LEN}
              </span>
              <button
                type="submit"
                disabled={submitting || question.trim().length < 2}
                className="px-5 py-2 bg-[var(--blue-500)] text-white text-sm rounded-md font-medium disabled:opacity-50 hover:bg-[var(--blue-600)] transition-colors flex items-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "查询中..." : "提交"}
              </button>
            </div>
          </form>

          {error && (
            <div role="alert" className="text-sm text-[var(--negative)] bg-[var(--negative-bg)] p-3 rounded-md">
              {error}
            </div>
          )}

          {result && <AnswerView result={result} />}
        </section>
      );
    }

    function AnswerView({ result }: { result: AnswerResult }) {
      const badge =
        result.status === "hit"
          ? { Icon: CheckCircle2, label: "已命中知识库", color: "text-[var(--positive)]", bg: "bg-[var(--positive-bg)]" }
          : result.status === "partial"
            ? { Icon: AlertTriangle, label: "需窗口确认", color: "text-[var(--warning)]", bg: "bg-[var(--warning-bg)]" }
            : { Icon: Info, label: "未命中（建议联系窗口）", color: "text-[var(--text-muted)]", bg: "bg-[var(--surface-muted)]" };

      return (
        <div role="region" aria-label="回答结果" className="space-y-3 pt-3 border-t border-[var(--border)]">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-medium ${badge.color} ${badge.bg}`}>
            <badge.Icon className="h-3.5 w-3.5" />
            {badge.label}
          </div>

          <article className="prose prose-zinc max-w-none text-sm">
            <ReactMarkdown>{result.answer}</ReactMarkdown>
          </article>

          {result.citations.length > 0 && (
            <div>
              <div className="text-xs font-medium text-[var(--text-muted)] mb-2">引用来源</div>
              <ul className="text-xs space-y-1">
                {result.citations.map((c) => (
                  <li key={c}>
                    {c.startsWith("/wiki/") ? (
                      <a href={c} className="text-[var(--blue-500)] hover:underline">{c}</a>
                    ) : (
                      <a href={c} target="_blank" rel="noopener noreferrer" className="text-[var(--blue-500)] hover:underline">{c}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    ```

    **关于 disclaimer**：服务端 (`lib/qa/answer.ts`) 已自动追加 `QA_DISCLAIMER` 到 answer 末尾，前端不重复添加（避免双份免责）。

    **Step 3.2 — app/qa/wiki/[kbType]/[slug]/page.tsx（dynamic route）**：

    沿 `app/privacy/page.tsx:22-31` 的 react-markdown 渲染模板：

    ```tsx
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
    ```

    **Step 3.3 — 验证**：

    - `npm run typecheck` 退 0
    - `npm run build` 退 0
    - `next dev` + `http://localhost:3000/qa`：自由问输入框可见 + char counter `0 / 500`
    - 提交"今天天气怎么样"（注意：DB 没有 wiki 时 retrieve 返 0 → status=miss → UI 显示"未命中"badge）
    - `http://localhost:3000/qa/wiki/policy/test-slug` 在 wiki 表 0 行时返回 404
  </action>
  <acceptance_criteria>
    - 文件存在：`app/qa/free-ask.tsx` 含 `"use client"` + `fetch("/api/qa/answer"` + status 三档分支（hit/partial/miss）+ char counter `tabular-nums`。
    - `grep -c "Loader2\\|CheckCircle2\\|AlertTriangle\\|Info" app/qa/free-ask.tsx` ≥3（lucide-react icons）。
    - `grep -c "🎯\\|🚀\\|⭐\\|✅" app/qa/free-ask.tsx` 必须为 0。
    - 文件存在：`app/qa/wiki/[kbType]/[slug]/page.tsx` 含 `notFound()` + `getWikiPageBySlug` + `<ReactMarkdown>` + `QA_DISCLAIMER`。
    - `npm run typecheck` 退 0。
    - `npm run build` 退 0。
    - 实跑 dev：`/qa` 页面渲染无 console error；`/qa/wiki/policy/non-existent` 返回 404。
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && npm run build && grep -q "use client" app/qa/free-ask.tsx && grep -q "/api/qa/answer" app/qa/free-ask.tsx && grep -q "tabular-nums" app/qa/free-ask.tsx && grep -q "QA_DISCLAIMER" app/qa/wiki/\[kbType\]/\[slug\]/page.tsx && grep -q "getWikiPageBySlug" app/qa/wiki/\[kbType\]/\[slug\]/page.tsx</automated>
  </verify>
  <done>
    - 自由问完整三档渲染（hit/partial/miss 三种 badge + 引用列表 + 错误降级）
    - wiki 详情页 react-markdown 渲染 + 末尾 disclaimer + 返回链接
    - DESIGN.md §9 全部黑名单 0 触犯
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 浏览器 → /api/qa/answer | 自由问表单 untrusted；server 已在 02-02 做了三层防护 |
| 浏览器 → /qa/wiki/[kbType]/[slug] | URL 参数 untrusted（kbType / slug 都是 untrusted） |
| react-markdown 渲染 wiki content | content 来自 LLM 编译产出，潜在 untrusted |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-12 | XSS | react-markdown 渲染 LLM 编译的 wiki content | mitigate | react-markdown 默认禁用 raw HTML（v9 默认 `skipHtml: false` 但不解析 `<script>`）；如需更严，按 D-22 在 02-05 加 `rehype-sanitize` 插件 |
| T-02-13 | Injection | URL 参数 kbType 注入路径 | mitigate | parseKb() 严格 enum 检查，非 "policy"/"biz" 直接 notFound() |
| T-02-14 | Injection | slug 参数（用于 Prisma findUnique） | mitigate | Prisma 自动参数化绑定 + Slug 字段 unique constraint |
| T-02-15 | Tampering | 客户端 fetch /api/qa/answer 时 question 超 500 字 | mitigate | 前端 textarea maxLength=500 + setQuestion 切片；服务端 Zod schema max(500) 二重校验 |
</threat_model>

<verification>
1. **DESIGN.md §9 合规**：grep `🎯|🚀|⭐|✅|emoji` `purple|fuchsia|pink-` 全为 0；hero 不含 `text-center` 类。
2. **6 个 components/ui 完整**：6 个文件 fork 完毕；`lib/utils.ts` 的 `cn` 可用。
3. **Server / Client 边界正确**：QaTabs / FreeAsk 是 client（`"use client"`）；HotCards / WikiList / WikiDetailPage 是 server。
4. **Build 通过**：`npm run build` 退 0。
5. **路由覆盖**：`/qa` `/qa?kb=policy` `/qa?kb=biz` `/qa/wiki/policy/<slug>` `/qa/wiki/biz/<slug>` 全部可访问；非法 kbType 返 404。
6. **不正式声明 FE-01/FE-03**：本 plan 的 `requirements` 仅含 QA-01 / QA-04 / QA-05 / QA-08（FE-* 由 Phase 6 的专门移动视口测试 + sm: 断点全覆盖时正式 close）。
</verification>

<success_criteria>
- [ ] globals.css 升级 + 6 个 shadcn ui fork 完成（前置工程）
- [ ] /qa 主页含 hero + 双 Tab + 3 热点 cards + 自由问 + wiki 列表
- [ ] /qa/wiki/[kbType]/[slug] 详情页含 react-markdown 渲染 + 免责
- [ ] DESIGN.md §9 黑名单全部 0 触犯
- [ ] npm run build 通过
- [ ] Phase 2 success criterion #1（双页签）+ #2（3 热点 UI）+ #3（自由问 UI 三档显示）的可视化交付到位
- [ ] FE-01 / FE-03 由 Phase 6 承担，本 plan 不在 requirements 中声明
</success_criteria>

<output>
After completion, create `.planning/phases/02-policy-qa/02-04-SUMMARY.md` recording:
- globals.css 行数 / fork 来源 / 是否需要 zh-CN overrides + content-based 校验报告（tokens / glass-card / report-* 各 grep count）
- 6 个 components/ui 文件路径 + 引入的新依赖（如 lucide-react）
- /qa 路由 + 子路由清单
- DESIGN.md §9 grep gate 通过证明
- npm run build 输出尺寸（关注 free-ask.tsx 是 client 组件，不要超 50KB）
- 已知 follow-up：DB 0 wiki 时 wiki-list 显示空状态——Plan 02-01 publish 后会自动填充；FE-01/FE-03 由 Phase 6 处理（移动视口测试 + sm: 断点）
</output>
</content>
