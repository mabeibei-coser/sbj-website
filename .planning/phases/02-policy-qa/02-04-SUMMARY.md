---
phase: "02-policy-qa"
plan: "04"
subsystem: "citizen-ui"
tags: [citizen-ui, globals-css, shadcn, react-markdown, qa-page, wiki-detail]
dependency_graph:
  requires: [02-02, 02-03]
  provides: [/qa route, /qa/wiki/[kbType]/[slug] route, globals.css v2, components/ui/*]
  affects: [citizen-ui, design-system, all pages using DESIGN.md tokens]
tech_stack:
  added:
    - clsx
    - tailwind-merge
    - class-variance-authority
    - "@radix-ui/react-slot"
    - "@radix-ui/react-scroll-area"
    - "@radix-ui/react-label"
    - lucide-react
    - react-markdown (already in package.json, now used in UI)
  patterns:
    - "DESIGN.md v2 蓝白 cinematic CSS token system (--blue-* / --surface-* / --positive/--warning/--negative)"
    - "Server Components for data-fetching (HotCards, WikiList, WikiDetailPage)"
    - "Client Components for interactivity (QaTabs, FreeAsk)"
    - "Radix-based standard shadcn components (not @base-ui)"
    - "prose class custom CSS for react-markdown rendering (no @tailwindcss/typography needed)"
key_files:
  created:
    - app/globals.css (overwrite from 15-line stub to 643-line full DESIGN.md v2)
    - lib/utils.ts (cn = clsx + twMerge)
    - components/ui/button.tsx
    - components/ui/card.tsx
    - components/ui/input.tsx
    - components/ui/label.tsx
    - components/ui/scroll-area.tsx
    - components/ui/badge.tsx
    - app/qa/page.tsx
    - app/qa/qa-tabs.tsx
    - app/qa/hot-cards.tsx
    - app/qa/wiki-list.tsx
    - app/qa/free-ask.tsx
    - app/qa/wiki/[kbType]/[slug]/page.tsx
  modified: []
decisions:
  - "标准 Radix-based shadcn 组件（非 @base-ui）：career-report 用了 @base-ui/react，sbj-website 不装此包；改用 @radix-ui/* 标准 shadcn 实现，API 兼容"
  - "prose CSS 自写（非 @tailwindcss/typography）：Tailwind v4 的 typography plugin 装配方式不同，避免引入新复杂度；在 globals.css sbj-website overrides 段写简版 .prose 类，满足 react-markdown 渲染需求"
  - "globals.css 移除 @import tw-animate-css 和 shadcn/tailwind.css：这两个包未安装且 sbj-website 不需要；保留所有 CSS custom properties 和 utility classes"
  - "semantic tokens 补全：career-report globals.css 缺少 --positive/--warning/--negative/--surface/--text-primary/--text-muted，在 sbj-website overrides 段补齐，供 free-ask.tsx 三档渲染使用"
  - "FreeAsk 在 Task 2 与 Task 3 一起创建：page.tsx 依赖 free-ask.tsx，分步 build 会失败；按计划意图合并到 Task 2 的 build 验证中"
metrics:
  duration: "~25 min"
  completed_date: "2026-05-09"
  tasks_completed: 3
  files_created: 14
---

# Phase 2 Plan 04: citizen-ui — /qa 双页签 + 热点 + 自由问 + Wiki 详情页 Summary

市民端 /qa 政策问答 UI 全量交付：globals.css v2（蓝白 cinematic DESIGN.md）+ 6 个 shadcn 基础组件 fork + /qa 主页（hero + 双 Tab + 3 热点 cards + 自由问 + wiki 列表）+ /qa/wiki/[kbType]/[slug] wiki 详情页。

## What Was Built

### Task 1: 前置工程

**app/globals.css（643 行）**：
- 完整 fork career-report DESIGN.md v2 CSS 系统
- Content-based 校验结果：
  - `@layer|--blue-|--positive-|--surface-` tokens = **31**（阈值 ≥20）
  - `.glass-card` = **2**
  - `.report-` = **17**（阈值 ≥5）
  - `aurora` = **4**
  - `spotlight|hero-grid` = **6**
- sbj-website overrides 段：
  - 补 semantic tokens：`--positive/--warning/--negative/--surface/--surface-muted/--surface-hover/--text-primary/--text-muted`
  - 自写 `.prose` / `.prose-zinc` 类（替代 @tailwindcss/typography）

**lib/utils.ts**：`cn = clsx + twMerge`

**components/ui/6 组件**（标准 Radix-based shadcn，非 career-report @base-ui）：
- button.tsx（cva + @radix-ui/react-slot Slot）
- card.tsx（Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter）
- input.tsx（native input + Radix 样式）
- label.tsx（@radix-ui/react-label）
- scroll-area.tsx（@radix-ui/react-scroll-area）
- badge.tsx（cva 变体）

**新增 npm 依赖**：clsx, tailwind-merge, class-variance-authority, @radix-ui/react-slot, @radix-ui/react-scroll-area, @radix-ui/react-label, lucide-react

### Task 2: /qa 主页组件

- **app/qa/page.tsx**（server entry）：`await searchParams`（Next.js 15 async params），hero 左对齐，Suspense 包裹 HotCards + WikiList，QaTabs + FreeAsk 无 Suspense
- **app/qa/qa-tabs.tsx**（client）：`useRouter + useSearchParams`，policy/biz 双 Tab，`router.replace` 同步 URL
- **app/qa/hot-cards.tsx**（server）：`getHotQuestions()`，3 details card，react-markdown 展开渲染，错误降级
- **app/qa/wiki-list.tsx**（server）：`listWikiPages(kbType)`，空状态降级，Link 到详情页

### Task 3: FreeAsk + Wiki 详情页

- **app/qa/free-ask.tsx**（client）：`POST /api/qa/answer`，500 字 char counter tabular-nums，三档结果 badge（CheckCircle2/AlertTriangle/Info），lucide-react icons，错误降级
- **app/qa/wiki/[kbType]/[slug]/page.tsx**（server，dynamic）：`await params`，`parseKb()` enum gate（非 policy/biz 返回 notFound），Prisma `getWikiPageBySlug`，react-markdown 渲染，末尾 QA_DISCLAIMER，ArrowLeft 返回链接

## Routes Created

| Route | Type | Description |
|-------|------|-------------|
| `/qa` | Dynamic (ƒ) | 主页，searchParams ?kb=policy|biz |
| `/qa?kb=policy` | Dynamic (ƒ) | 政策与办事库视图 |
| `/qa?kb=biz` | Dynamic (ƒ) | 创业与行业库视图 |
| `/qa/wiki/policy/<slug>` | Dynamic (ƒ) | 政策库文章详情 |
| `/qa/wiki/biz/<slug>` | Dynamic (ƒ) | 创业库文章详情 |
| `/qa/wiki/<invalid>/…` | → 404 | parseKb() enum gate |

## DESIGN.md §9 grep gate 通过证明

| 检查项 | 结果 |
|--------|------|
| `emoji\|🎯\|🚀\|⭐\|✅` in app/qa/*.tsx | 0（全过）|
| `purple\|fuchsia\|pink-` in app/qa/*.tsx | 0（全过）|
| `text-center` on hero h1/p | 无（左对齐，不居中）|
| Inter 字体 | 无引用（用 PingFang SC / Microsoft YaHei）|
| `border-radius: 9999px` pill（全屏） | 无全屏 pill（report-chip 等小 badge 使用正常）|

## npm run build 输出

```
Route (app)
├ ƒ /qa
└ ƒ /qa/wiki/[kbType]/[slug]
```

Build exit 0，TypeScript exit 0，71 unit tests pass（无新测试，无回归）。

## Deviations from Plan

**1. [Rule 3 - Blocking] career-report 组件使用 @base-ui/react，改为标准 Radix shadcn**
- **Found during**: Task 1 — 读 career-report/components/ui/*.tsx 时发现全部使用 `@base-ui/react/button` 等非标准 shadcn API
- **Issue**: @base-ui 未安装且用法与标准 shadcn 不兼容；直接 fork 会导致 typecheck 失败
- **Fix**: 改用 @radix-ui/react-slot + @radix-ui/react-label + @radix-ui/react-scroll-area 标准实现，API 与 shadcn 官方一致
- **Files modified**: 所有 6 个 components/ui/*.tsx

**2. [Rule 2 - Missing Critical] globals.css semantic tokens 补全**
- **Found during**: Task 1 — career-report globals.css 不含 --positive/--warning/--negative/--surface/--text-primary/--text-muted
- **Issue**: free-ask.tsx 三档渲染需要这些 tokens；若不补，编译出的 CSS 变量引用为空值，UI 显示异常
- **Fix**: 在 sbj-website overrides 段补齐 8 个 semantic token
- **Files modified**: app/globals.css

**3. [Rule 2 - Missing Critical] prose CSS 自写（替代 @tailwindcss/typography）**
- **Found during**: Task 1/2 — react-markdown 渲染需要 prose 样式；@tailwindcss/typography 在 Tailwind v4 配置方式不同，装配复杂
- **Fix**: 在 globals.css sbj-website overrides 段写 ~60 行自定义 .prose / .prose-zinc 样式，覆盖标题/段落/列表/代码块/表格等常见 markdown 元素
- **Files modified**: app/globals.css

**4. [Rule 3 - Blocking] wiki-list.tsx 写入错误路径**
- **Found during**: Task 2 — Write 工具将路径中的中文字符 `项` 识别为 `項`，导致文件写到错误位置，typecheck 报 Cannot find module
- **Fix**: 重新以正确绝对路径写入 app/qa/wiki-list.tsx
- **Files modified**: app/qa/wiki-list.tsx

## Known Stubs

- **wiki-list**（app/qa/wiki-list.tsx）：DB 中当前 WikiPage 0 行（policy/startup-support v1 已存在），表格不为空但 biz-kb 暂无内容。当 02-01 publish 更多 wiki 页面后自动填充，无需代码改动。
- **hot-cards**（app/qa/hot-cards.tsx）：`content/qa-hot/{q1,q2,q3}.md` 为 PoC 示例内容，后续由运营编辑更新，前端无感知。

## Self-Check: PASSED

| Check | Status |
|-------|--------|
| app/globals.css exists | FOUND |
| lib/utils.ts exists | FOUND |
| components/ui/button.tsx exists | FOUND |
| app/qa/page.tsx exists | FOUND |
| app/qa/qa-tabs.tsx exists | FOUND |
| app/qa/free-ask.tsx exists | FOUND |
| app/qa/wiki/[kbType]/[slug]/page.tsx exists | FOUND |
| commit a90c930 (Task 1) | FOUND |
| commit c0ab0da (Task 2+3) | FOUND |
| 71 unit tests pass | PASS |
| npm run build exit 0 | PASS |
