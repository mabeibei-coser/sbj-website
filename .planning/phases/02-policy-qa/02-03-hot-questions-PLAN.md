---
phase: 02-policy-qa
plan: 03
type: execute
wave: 2
depends_on: [02-01]
files_modified:
  - content/qa-hot/q1.md
  - content/qa-hot/q2.md
  - content/qa-hot/q3.md
  - lib/qa/hot-questions.ts
  - app/api/qa/hot/route.ts
  - tests/qa/hot-questions.test.ts
autonomous: true
requirements: [QA-08, QA-10]
must_haves:
  truths:
    - "GET /api/qa/hot 返回 {items: [{id, title, body, citations, updatedAt}, ...]} 三条预设答案，不调 LLM（任何 callLlm 调用都不应在本 plan 出现）"
    - "三个 .md 文件存在于 content/qa-hot/{q1,q2,q3}.md，每个 ≤1000 字 + 顶部 YAML frontmatter（id/title/updated/sources）+ 末尾 ## 出处 段"
    - "hot-questions.ts 解析 frontmatter + 正文 + sources 列表为结构化对象返回"
    - "API 在文件丢失或解析失败时返回 500 + {items: [], error}，不暴露 fs path / stack"
  artifacts:
    - path: "content/qa-hot/q1.md"
      provides: "Q1 青年初次就业有哪些补贴？预设答案"
      contains: "青年初次就业"
    - path: "content/qa-hot/q2.md"
      provides: "Q2 黄浦区有哪些创业孵化基地及补贴？预设答案"
      contains: "创业孵化"
    - path: "content/qa-hot/q3.md"
      provides: "Q3 黄浦创卡能享受哪些政策福利？预设答案"
      contains: "黄浦创卡"
    - path: "lib/qa/hot-questions.ts"
      provides: "getHotQuestions() 读 content/qa-hot/*.md 解析为结构化数据"
      contains: "getHotQuestions"
    - path: "app/api/qa/hot/route.ts"
      provides: "GET /api/qa/hot 路由，不调 LLM"
      exports: ["GET"]
    - path: "tests/qa/hot-questions.test.ts"
      provides: "frontmatter 解析 + 找不到文件时降级测试"
  key_links:
    - from: "app/api/qa/hot/route.ts"
      to: "lib/qa/hot-questions.ts getHotQuestions"
      via: "service 调用 + try/catch 错误降级"
      pattern: "getHotQuestions\\("
    - from: "lib/qa/hot-questions.ts"
      to: "content/qa-hot/*.md"
      via: "fs.readFile（process.cwd() + content/qa-hot/...）"
      pattern: "readFile.*qa-hot"
---

<objective>
落地 3 个热点问题预设答案，并建立 GET /api/qa/hot 提供给市民端首页快速展示。**关键约束：本 plan 全程不调 LLM**——QA-08 D-15 明确 3 个热点必须由人工编辑写入，避免 LLM 编造。

Purpose: 市民进入政策问答页面后看到的首屏是"3 个热点 cards"，点击展开预设答案。这是 W2 demo 时甲方最先看到的体验点；LLM 在这里 0 参与，是项目"绝不允许 AI 编造政策"硬约束的最干净表达。

Output:
- content/qa-hot/q1.md / q2.md / q3.md（人工编辑的预设答案，本 plan 写"骨架"+ 已知 sources，正文从 PoC sources 摘取，留待用户审校；Q3 来源已有家人提供的《黄浦创卡》PDF 手册）
- lib/qa/hot-questions.ts service
- app/api/qa/hot/route.ts API
- tests/qa/hot-questions.test.ts 单元测试

不在本 plan 范围（其他 plan 处理）：
- 自由问 API + 三层防护（02-02 已完成）
- 市民端 UI 渲染 hot cards（02-04）
- Wiki 编译（02-01 已建好基础设施）
- biz 类似的预设（不是 v1 范围）
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
@.planning/phases/02-policy-qa/02-01-SUMMARY.md
@CLAUDE.md
@app/privacy/page.tsx
@content/privacy-policy-draft.md
@app/api/admin/whoami/route.ts
@experiments/llm-wiki-poc/sources/jiu-zheng-ce-2.md
@experiments/llm-wiki-poc/sources/ji-she-kong-jian.md
@experiments/llm-wiki-poc/sources/chuangka-shouce.md

<interfaces>
<!-- 路径与已有模板 -->

content/ 目录读取模板（来自 app/privacy/page.tsx:17-20）：
```typescript
async function loadPolicy(): Promise<string> {
  const filePath = path.join(process.cwd(), "content", "privacy-policy-draft.md");
  return readFile(filePath, "utf8");
}
```

frontmatter 解析（不引入新 dep，手写 regex 即可——只解析顶部 `---\n...---\n`）：
```typescript
function parseFrontmatter(md: string): { fm: Record<string, unknown>; body: string } {
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { fm: {}, body: md };
  const fmText = m[1];
  const body = m[2];
  const fm: Record<string, unknown> = {};
  // 简单 line-by-line（key: value 或 key: 后跟数组缩进）
  // 复杂 YAML 不支持——sources 数组用每行 "  - <url>" 形式手动 parse
  // ...
  return { fm, body };
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 写 3 个热点 .md 文件（D-14 / D-15）含 frontmatter + 正文 + ## 出处 段</name>
  <files>
    content/qa-hot/q1.md (new),
    content/qa-hot/q2.md (new),
    content/qa-hot/q3.md (new)
  </files>
  <read_first>
    - content/privacy-policy-draft.md (frontmatter / markdown 风格参考)
    - experiments/llm-wiki-poc/sources/jiu-zheng-ce-2.md (Q1 来源 — 青年就业补贴)
    - experiments/llm-wiki-poc/sources/ji-she-kong-jian.md (Q2 来源 — 创业孵化基地)
    - experiments/llm-wiki-poc/sources/chuangka-shouce.md (Q3 来源 — 黄浦创卡 9 项福利)
    - .planning/phases/02-policy-qa/02-PATTERNS.md §6 content/qa-hot/*.md (整段)
    - .planning/phases/02-policy-qa/02-CONTEXT.md D-14 / D-15
  </read_first>
  <action>
    每个文件结构（D-15 schema）：

    ```
    ---
    id: q1
    title: 青年初次就业有哪些补贴？
    updated: 2026-05-08
    sources:
      - https://mp.weixin.qq.com/s/...
      - knowledge/policy-sources/jiu-zheng-ce-2.md
    ---

    # 青年初次就业有哪些补贴？

    （≤1000 字答案正文，引用用 [N] 脚注。**严禁** LLM 生成，由用户/家人审校）

    ## 出处

    - [上海创业政策一图解读 - 海纳百创](https://mp.weixin.qq.com/s/...)
    - `knowledge/policy-sources/jiu-zheng-ce-2.md` 行 X-Y
    ```

    **q1.md — 青年初次就业有哪些补贴？**：
    从 `experiments/llm-wiki-poc/sources/jiu-zheng-ce-2.md` 直接摘取关于"青年就业补贴 / 创业前担保贷款 / 灵活就业社保补贴 / 求职创业补贴"的事实陈述（**只摘原文事实，不要二次表述生成**），整理成正文 ≤1000 字。已知字段（来自该 source）：
    - 创业前担保贷款上限金额（具体数字直接抄 source）
    - 适用对象（高校毕业生 / 离校未就业青年 / 登记失业青年）
    - 灵活就业社保补贴标准
    - 求职创业补贴
    末尾 `## 出处` 列：source 文件路径 + 行号区间（参照 PoC 的 wiki 编译 prompt 引用风格）。

    **q2.md — 黄浦区有哪些创业孵化基地及补贴？**：
    从 `ji-she-kong-jian.md` + `chuangka-shouce.md` 摘取：
    - 黄浦区创业孵化基地名单（如 source 有列出）
    - 入驻条件（毕业 N 年内 / 黄浦户籍 / 拿创卡）
    - 房租补贴 / 入驻奖励的具体金额（**抄数字，不估算**）
    - 共享空间联系方式（如 source 有）
    `## 出处` 列两个 source 文件路径 + 行号。

    **q3.md — 黄浦创卡能享受哪些政策福利？**：
    Q3 是甲方/家人提供的《黄浦创卡》PDF 手册转 md 后的内容（source: `chuangka-shouce.md`）。摘取 9 项福利清单：
    1. 创业指导服务
    2. 创业培训
    3. 创业贷款（具体上限）
    4. 创业场地
    5. 创业团队招聘
    6. 创业孵化补贴
    7. 创业带动就业补贴
    8. 房租补贴
    9. 社保补贴
    （以上 9 项标题以 source 实际为准；金额、对象条件全部抄 source）。

    **关键约束（D-15）**：
    - **正文严禁生成 / 编造**。如某项 source 数据不全（例如 Q2 基地名单未列），写"待甲方/家人补全"占位，不补造数据。
    - 所有引用必须可在 source 文件中找到原文。
    - 字数 ≤1000（中文字符；包含标点）。
    - 末尾 `## 出处` 至少一条，格式 `\`<source path>\` 行 X-Y` 或 `[标题](URL)` 二选一。
    - frontmatter 的 `sources` 数组每条对应正文中至少一处引用。

    **执行操作**：
    1. 用 Read 工具读取 PoC 的 3 个 source md 文件（可能编码问题——先 Read 看是否能正常显示中文，如不能则提示用户在 W0 阶段提供 UTF-8 版本）。
    2. 按 q1/q2/q3 三个文件分别从 source 中摘取相关段落。
    3. 写出每个 .md 文件，正文最多 1000 字（中文 char 计数；可用 wc -m 估算）。
    4. 如某项数据 source 不充分（例如 Q3 PDF 手册转 md 缺失），在该项位置写 `_<待用户/家人审校>_` 占位，不要编造数字。
  </action>
  <acceptance_criteria>
    - 3 个文件存在：`content/qa-hot/q1.md` `q2.md` `q3.md`。
    - 每个文件第一行是 `---`，紧跟 `id:` `title:` `updated:` `sources:` 4 个字段，再以 `---` 闭合。
    - 每个文件正文起始于 `# <title>`（与 frontmatter 的 title 一致）。
    - 每个文件含 `## 出处` 段且至少 1 条引用。
    - 每个文件正文（去掉 frontmatter 和 `## 出处` 段后）字数 ≤1100（含一些缓冲；目标 ≤1000）。
    - q1.md 含 "青年" 或 "高校毕业生"；q2.md 含 "孵化" 或 "基地"；q3.md 含 "黄浦创卡" 或 "创卡"。
    - 不允许出现"v1 / 简化版 / 基础版 / 待 LLM 生成"等字样（grep `v1 ` 应为 0）。
  </acceptance_criteria>
  <verify>
    <automated>test -f content/qa-hot/q1.md && test -f content/qa-hot/q2.md && test -f content/qa-hot/q3.md && grep -q "^id: q1" content/qa-hot/q1.md && grep -q "^id: q2" content/qa-hot/q2.md && grep -q "^id: q3" content/qa-hot/q3.md && grep -q "## 出处" content/qa-hot/q1.md && grep -q "## 出处" content/qa-hot/q2.md && grep -q "## 出处" content/qa-hot/q3.md && grep -q "黄浦创卡\\|创卡" content/qa-hot/q3.md</automated>
  </verify>
  <done>
    - 3 个 .md 文件齐全，frontmatter 合法，正文 ≤1000 字，含出处段
    - 数据全部从 PoC sources 抄录（不编造）
    - 数据缺失处用 `_<待审校>_` 占位
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: lib/qa/hot-questions.ts service + tests/qa/hot-questions.test.ts</name>
  <files>
    lib/qa/hot-questions.ts (new),
    tests/qa/hot-questions.test.ts (new)
  </files>
  <read_first>
    - app/privacy/page.tsx (整文件 — readFile content/ 模板)
    - lib/citizens.ts (整文件 — service "import server-only" + 返回 plain object 风格)
    - tests/audit.test.ts (整文件 — Vitest mock fs 模板)
    - .planning/phases/02-policy-qa/02-PATTERNS.md §2 lib/qa/hot-questions.ts (整段)
    - content/qa-hot/q1.md (Task 1 写出的样本)
  </read_first>
  <behavior>
    - getHotQuestions() 返回长度 3 数组，按 q1/q2/q3 顺序
    - 每项含 {id, title, body, citations, updatedAt}
    - frontmatter 中 sources 字段被解析成 string[] 放到 citations
    - body 是去掉 frontmatter 后的整段 markdown（含 `## 出处`）
    - 文件丢失时 throw（让 caller 决定是否兜底）
    - 多次调用启用简单 module-scope cache（process 重启失效；dev 模式 hot reload 时需要 reset 函数）
  </behavior>
  <action>
    **TDD 顺序（RED → GREEN → REFACTOR）**：
    本 task 标 `tdd="true"`。executor 必须按下面顺序执行，**先写测试看 FAIL，再写实现看 PASS**：
    1. **RED 阶段**：先把 Step 2.2（测试）写完，跑 `npx vitest run tests/qa/hot-questions.test.ts`，应当全部 FAIL（`Cannot find module '@/lib/qa/hot-questions'` 即为合格的 RED 信号），将该日志的 `FAIL` 行截图或保留在 PR 描述。
    2. **GREEN 阶段**：写 Step 2.1（实现），最简通过测试即可（cache / parseFrontmatter / loadOne 都按测试期望的最小行为写）。再跑 `npx vitest run tests/qa/hot-questions.test.ts` 应 exit 0，全部 it 通过。
    3. **REFACTOR 阶段**：清理（去重 / 重命名 / 加注释），再跑同一命令仍 exit 0；`npm run typecheck` 仍 exit 0。

    ---

    **Step 2.1 — 实现 lib/qa/hot-questions.ts**：

    ```typescript
    import "server-only";
    import { readFile } from "node:fs/promises";
    import path from "node:path";

    export interface HotQuestion {
      id: "q1" | "q2" | "q3";
      title: string;
      body: string;        // 去掉 frontmatter 的整段 markdown（含 ## 出处）
      citations: string[]; // 从 frontmatter sources 解析
      updatedAt: string;   // ISO date string from frontmatter `updated`
    }

    const HOT_IDS: ReadonlyArray<"q1" | "q2" | "q3"> = ["q1", "q2", "q3"] as const;

    let cache: HotQuestion[] | null = null;

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

    export async function getHotQuestions(): Promise<HotQuestion[]> {
      if (cache) return cache;
      const items = await Promise.all(HOT_IDS.map(loadOne));
      cache = items;
      return items;
    }
    ```

    **Step 2.2 — 测试 tests/qa/hot-questions.test.ts**：

    ```typescript
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
          .mockResolvedValueOnce(makeMd("q1", "Q1 标题", ["s1", "s2"], "# Q1 标题\n\n正文 1\n\n## 出处\n- a\n"))
          .mockResolvedValueOnce(makeMd("q2", "Q2 标题", ["s3"], "# Q2 标题\n\n正文 2\n\n## 出处\n- b\n"))
          .mockResolvedValueOnce(makeMd("q3", "Q3 标题", [], "# Q3 标题\n\n正文 3\n\n## 出处\n- c\n"));

        const items = await getHotQuestions();
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
        vi.mocked(readFile).mockResolvedValue("# 无 frontmatter 的文件\n正文");
        const items = await getHotQuestions();
        expect(items[0].title).toBe("q1");
        expect(items[0].citations).toEqual([]);
      });

      it("readFile 抛错时整体 throw（让 caller 兜底）", async () => {
        vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));
        await expect(getHotQuestions()).rejects.toThrow("ENOENT");
      });

      it("第二次调用走 cache 不再读文件", async () => {
        vi.mocked(readFile)
          .mockResolvedValueOnce(makeMd("q1", "T1", [], "body"))
          .mockResolvedValueOnce(makeMd("q2", "T2", [], "body"))
          .mockResolvedValueOnce(makeMd("q3", "T3", [], "body"));
        await getHotQuestions();
        await getHotQuestions();
        expect(readFile).toHaveBeenCalledTimes(3); // 只有第一次 3 次 IO
      });
    });
    ```

    **Step 2.3 — 验证**：
    `npm run typecheck && npx vitest run tests/qa/hot-questions.test.ts`
  </action>
  <acceptance_criteria>
    - `lib/qa/hot-questions.ts` 含 `import "server-only"` + 导出 `getHotQuestions` + `__resetHotCacheForTest`。
    - `parseFrontmatter` 支持标量 + 数组（每行 `  - <item>`）。
    - `tests/qa/hot-questions.test.ts` 至少 4 个 it 全过。
    - `npm run typecheck` 退 0。
    - 真跑（如 Task 1 三个 md 已写）：手动调 `tsx -e "import('./lib/qa/hot-questions').then(m => m.getHotQuestions().then(console.log))"` 应输出 3 项。
    - **RED gate passed**：在 lib/qa/hot-questions.ts 写 GREEN 实现**之前**，`npx vitest run tests/qa/hot-questions.test.ts` 报 FAIL（执行日志含 `FAIL` 或 `Cannot find module '@/lib/qa/hot-questions'`）。
    - **GREEN gate passed**：写完最小实现后 `npx vitest run tests/qa/hot-questions.test.ts` exit 0，4+ 个 it 全过。
    - **REFACTOR gate passed**：清理后仍 exit 0；`npm run typecheck` 仍 exit 0。
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && npx vitest run tests/qa/hot-questions.test.ts && grep -q "server-only" lib/qa/hot-questions.ts</automated>
  </verify>
  <done>
    - service 实现 + 4 个单测全过
    - cache 行为正确（第二次不读 IO）
    - frontmatter 解析支持标量 + 数组
  </done>
</task>

<task type="auto">
  <name>Task 3: app/api/qa/hot/route.ts GET 路由（不调 LLM）</name>
  <files>
    app/api/qa/hot/route.ts (new)
  </files>
  <read_first>
    - app/api/admin/whoami/route.ts (整文件 — read-only GET 模板)
    - lib/qa/hot-questions.ts (Task 2 实现)
    - .planning/phases/02-policy-qa/02-PATTERNS.md §3 app/api/qa/hot/route.ts (整段)
  </read_first>
  <action>
    ```typescript
    import { NextResponse } from "next/server";
    import { getHotQuestions } from "@/lib/qa/hot-questions";

    /**
     * GET /api/qa/hot
     *
     * 返回 3 个热点问题预设答案。**绝不调 LLM**（D-15 / D-16 / D-29）。
     * 文件读失败时返回 500 + items=[]。
     */
    export async function GET() {
      try {
        const items = await getHotQuestions();
        return NextResponse.json({ items });
      } catch (err) {
        console.error("[qa/hot] failed:", err);
        return NextResponse.json(
          { items: [], error: "热点暂时不可用" },
          { status: 500 }
        );
      }
    }
    ```

    **验证（如本地 dev server 可启动）**：
    `next dev` 后 `curl http://localhost:3000/api/qa/hot | jq '.items | length'` 应返回 3。

    `curl http://localhost:3000/api/qa/hot | jq '.items[0]'` 应返回 `{ id: "q1", title, body, citations, updatedAt }` schema。
  </action>
  <acceptance_criteria>
    - 文件存在：`app/api/qa/hot/route.ts` 含 `export async function GET`。
    - `grep -c "callLlm\\|chat\\|llm-client" app/api/qa/hot/route.ts` 必须为 0（确认本路由不调 LLM）。
    - try/catch 兜底返回 `{items: [], error}` + status 500。
    - `npm run typecheck` 退 0。
    - 实跑（DB 不需要、prompts 不需要、只需 content/qa-hot/*.md 在）：`curl localhost:3000/api/qa/hot` 返回 200 + items 长度 = 3。
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && grep -q "export async function GET" app/api/qa/hot/route.ts && [ "$(grep -c 'callLlm\\|llm-client' app/api/qa/hot/route.ts)" = "0" ]</automated>
  </verify>
  <done>
    - GET 路由实现 + 0 LLM 调用
    - 错误降级返回 500 + 空 items
    - 与 Plan 02-04 的市民端 hot-cards.tsx 对接 ready
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 文件系统 → API | content/qa-hot/*.md 受版本控制保护；CI 部署写入；运行时只读 |
| API → 市民浏览器 | 返回的 body / citations 是预编辑文本（人审核过），无 LLM 污染 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-09 | Tampering | content/qa-hot/*.md 内容被篡改 | mitigate | 文件入 git；CI 部署受保护；运行时只读，不接受 user input 写入 |
| T-02-10 | Information Disclosure | API 错误暴露 fs path | mitigate | route.ts catch 块只返回固定 error 字符串"热点暂时不可用"，不返回 err.message |
| T-02-11 | Denial of Service | 文件丢失时 API 不可用 | accept | 3 个文件随项目发布；丢失即视为部署事故（监控告警 INF-10 覆盖） |
</threat_model>

<verification>
1. **0 LLM 调用**：`grep -r "callLlm\\|llm-client" app/api/qa/hot/ lib/qa/hot-questions.ts content/qa-hot/` 必须为 0。
2. **3 个文件齐全**：q1/q2/q3 都存在 frontmatter + 正文 + 出处 段。
3. **测试覆盖**：tests/qa/hot-questions.test.ts ≥4 个 it 全过。
4. **API 实跑（如 dev server）**：`curl localhost:3000/api/qa/hot | jq '.items | length'` = 3。
</verification>

<success_criteria>
- [ ] 3 个 .md 文件 + 1 个 service + 1 个 API + 1 个测试套件
- [ ] LLM 调用次数 = 0（项目硬约束"绝不允许 AI 编造"在本 plan 完美体现）
- [ ] frontmatter parser 自给自足，不引入 gray-matter / yaml 等新依赖
- [ ] Phase 2 success criterion #2（3 热点一键问展示预设答案）的核心实现到位
</success_criteria>

<output>
After completion, create `.planning/phases/02-policy-qa/02-03-SUMMARY.md` recording:
- 3 个 .md 文件的字数 + 引用数 + 占位符（待审校）位置清单
- service 缓存行为（第二次调用不读 IO）
- API 错误降级路径
- 单测通过数
- 已知 follow-up：Q3 的 9 项福利数据如有 PDF 手册解析问题（编码 / 表格 / 图片），需要在用户审校阶段补全
</output>
</content>
</invoke>