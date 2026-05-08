---
phase: 02-policy-qa
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - prompts/wiki-classify-topics.md
  - prompts/wiki-compile-topic.md
  - scripts/wiki/wiki-config.json
  - scripts/wiki/smoke.ts
  - scripts/wiki/pdf-to-md.ts
  - scripts/wiki/url-to-md.ts
  - scripts/wiki/compile.ts
  - knowledge/policy-sources/.gitkeep
  - knowledge/policy-sources/wechat-archives/.gitkeep
  - package.json
autonomous: false
requirements: [QA-02, QA-03, QA-09]
must_haves:
  truths:
    - "运行 `npm run wiki:smoke` 能透过 callLlm 三档 fallback 拿到 DeepSeek 回答（caller=qa.smoke 写入 LlmCallLog）"
    - "运行 `npm run wiki:compile -- --kb=policy --sources=knowledge/policy-sources --dry-run` 输出主题分类 + 每主题 diff 摘要,但不写库"
    - "运行 `npm run wiki:compile -- --kb=policy --sources=knowledge/policy-sources --publish` 后 WikiPage 表 kb_type=policy 行数 ≥1,且每条对应一条 WikiPageVersion,且 audit_logs 含一条 wiki.publish 记录"
    - "scripts/wiki/compile.ts 不直接 import deepseek SDK,所有 LLM 调用走 callLlm({ caller: 'qa.compile.classify' | 'qa.compile.compile' })"
    - "scripts/wiki/url-to-md.ts 能在真实 mp.weixin.qq.com URL 上端到端跑通:fetch (UA bypass) → 清洗(去广告/二维码/关注卡/底部推荐) → 输出 markdown 到 knowledge/policy-sources/wechat-archives/<title>-<date>.md,顶部 frontmatter 含 sourceUrl/fetchedAt/title/kbType"
    - "Phase 2 内为 Q1/Q2 抓到至少 2 篇真实微信文章存档(D-16),knowledge/policy-sources/wechat-archives/*.md 数量 ≥2"
    - "scripts/wiki/url-to-md.ts 把 PoC sources 的 3 个 markdown 拷贝到 knowledge/policy-sources/(jiu-zheng-ce-2.md / ji-she-kong-jian.md / chuangka-shouce.md),让下游 02-03 引用 canonical 路径而非 PoC 实验目录"
  artifacts:
    - path: "prompts/wiki-classify-topics.md"
      provides: "主题分类 prompt(kb_type 占位 + JSON 输出约束)"
      contains: "kb_type"
    - path: "prompts/wiki-compile-topic.md"
      provides: "主题文章编译 prompt(5 条不可违反约束 + 6 段结构)"
      contains: "引用必须真实可追溯"
    - path: "scripts/wiki/wiki-config.json"
      provides: "policy / biz 双 kb_type 配置(domain + topic_hints + article_sections)"
      contains: "\"policy\""
    - path: "scripts/wiki/compile.ts"
      provides: "编译 CLI(scan → classify → compile → publish/dry-run)"
      contains: "callLlm"
    - path: "scripts/wiki/pdf-to-md.ts"
      provides: "MinerU PDF → markdown CLI"
    - path: "scripts/wiki/url-to-md.ts"
      provides: "微信文章 URL → markdown CLI(UA bypass + 清洗 + frontmatter)"
    - path: "scripts/wiki/smoke.ts"
      provides: "callLlm 三档 fallback 烟雾测试"
    - path: "package.json"
      provides: "新增 wiki:smoke / wiki:pdf-to-md / wiki:url-to-md / wiki:compile / llm-eval / llm-eval:real npm scripts"
      contains: "wiki:compile"
    - path: "knowledge/policy-sources/.gitkeep"
      provides: "政策素材 markdown 输入目录占位"
  key_links:
    - from: "scripts/wiki/compile.ts"
      to: "lib/llm-client.ts"
      via: "callLlm({ caller: 'qa.compile.classify' | 'qa.compile.compile' })"
      pattern: "callLlm\\("
    - from: "scripts/wiki/compile.ts"
      to: "prisma.wikiPage / prisma.wikiPageVersion"
      via: "publish 时 transactional upsert + create"
      pattern: "wikiPage\\.upsert|wikiPageVersion\\.create"
    - from: "scripts/wiki/compile.ts"
      to: "lib/audit.ts logAudit"
      via: "publish 后 logAudit({ action: 'wiki.publish', targetType: 'wiki_page', targetId })"
      pattern: "wiki\\.publish"
    - from: "scripts/wiki/url-to-md.ts"
      to: "knowledge/policy-sources/wechat-archives/*.md"
      via: "HTTP fetch + 清洗 + frontmatter 写盘"
      pattern: "sourceUrl: https://mp\\.weixin\\.qq\\.com/"
---

<objective>
建立 Phase 2 的离线编译 pipeline：从政策 PDF / 微信文章抓取 → markdown 素材 → LLM 主题分类 + 主题文章生成 → 落库 WikiPage + WikiPageVersion + 审计。

Purpose: 这是后续所有 QA 能力（自由问 / 热点问 / wiki 浏览 / admin 编辑 / LLM eval）的数据源。没有这一步，Wave 2 之后所有 plan 都拿不到任何 wiki 内容。

Output:
- 4 个 CLI 脚本（smoke / pdf-to-md / url-to-md / compile）+ 2 个 prompt 文件 + 1 份 wiki-config.json
- npm 短脚本：wiki:smoke / wiki:pdf-to-md / wiki:url-to-md / wiki:compile / llm-eval / llm-eval:real
- knowledge/policy-sources/ 目录结构（含 wechat-archives 子目录 + 拷贝 PoC 3 份 source md）
- 至少 2 篇微信文章存档（D-16，QA-09）
- 至少 1 篇 WikiPage（kb_type=policy）落库 + 对应 WikiPageVersion + audit_logs 痕迹（用 PoC 已有的 sources 做最小可发布数据集）

不在本 plan 范围（其他 plan 处理）：
- 自由问 API（02-02）
- 热点 / 后台编辑器 / 市民端 UI / eval 50 题 / e2e（02-03 ~ 02-07）
- biz-kb 的真实编译（甲方素材未到，Phase 2 内只 enable kb=biz 配置，但不实际执行 biz 编译）
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
@CLAUDE.md
@lib/llm-client.ts
@lib/audit.ts
@lib/db.ts
@prisma/schema.prisma
@experiments/llm-wiki-poc/scripts/compile.ts
@experiments/llm-wiki-poc/scripts/pdf-to-md.ts
@experiments/llm-wiki-poc/scripts/url-to-md.ts
@experiments/llm-wiki-poc/scripts/smoke-test.ts
@experiments/llm-wiki-poc/prompts/classify-topics.md
@experiments/llm-wiki-poc/prompts/compile-topic-article.md
@experiments/llm-wiki-poc/.wiki-compiler-config.json
@experiments/llm-wiki-poc/package.json
@experiments/llm-wiki-poc/sources/jiu-zheng-ce-2.md
@experiments/llm-wiki-poc/sources/ji-she-kong-jian.md
@experiments/llm-wiki-poc/sources/chuangka-shouce.md
@package.json
@C:/Users/admin/.claude/skills/wechat-article-fetch-ua-bypass/SKILL.md

<interfaces>
<!-- Phase 1 已就位的关键 API；executor 直接调用，不要重新实现 -->

From lib/llm-client.ts:
```typescript
export interface CallLlmOpts<T = string> {
  systemPrompt: string;
  userPrompt: string;
  caller: string;                  // D-25: "qa.compile.classify" | "qa.compile.compile" | "qa.smoke"
  primaryVendor?: "deepseek" | "doubao" | "iflytek";
  jsonMode?: boolean;              // true → 内部追加 JSON_ONLY_PREFIX
  parser?: (raw: string) => T;     // 解析 LLM 文本输出
  validator?: (raw: string) => string | null;  // 返回 string 触发重试，null 通过
  maxTokens?: number;
}
export interface CallLlmResult<T> {
  data: T;
  raw: string;
  vendor: "deepseek" | "doubao" | "iflytek";
  promptTokens: number; completionTokens: number; totalTokens: number;
  costCents: number;
}
export async function callLlm<T = string>(opts: CallLlmOpts<T>): Promise<CallLlmResult<T>>;
```

From lib/audit.ts:
```typescript
export interface LogAuditInput {
  actor: string;                   // 例: "system:wiki-compile" / "admin:default" / "citizen:<phoneHash>"
  action: string;                  // 例: "wiki.publish" / "wiki.update"
  targetType?: string;             // 例: "wiki_page"
  targetId?: string;
  before?: unknown;
  after?: unknown;
  request?: NextRequest;           // 可选；CLI 场景留空
  meta?: { ip?: string; userAgent?: string };
}
export async function logAudit(input: LogAuditInput): Promise<void>;
```

From lib/db.ts:
```typescript
export const prisma: PrismaClient;  // 单例
```

From prisma/schema.prisma (摘自 Phase 1 定义):
```prisma
model WikiPage {
  id           String   @id @default(cuid())
  kbType       String   // "policy" | "biz"
  slug         String
  title        String
  content      String   @db.Text
  sourceUrl    String?
  version      Int      @default(1)
  publishedAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  versions     WikiPageVersion[]
  @@unique([kbType, slug])
}

model WikiPageVersion {
  id              String   @id @default(cuid())
  wikiPageId      String
  version         Int
  contentSnapshot String   @db.Text
  editorId        String?
  diffSummary     String?
  createdAt       DateTime @default(now())
  page            WikiPage @relation(fields: [wikiPageId], references: [id], onDelete: Cascade)
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fork PoC prompts + scripts/wiki/ 4 个 CLI（smoke/pdf-to-md/url-to-md/compile）骨架，并加 npm 脚本</name>
  <files>
    prompts/wiki-classify-topics.md (new),
    prompts/wiki-compile-topic.md (new),
    scripts/wiki/wiki-config.json (new),
    scripts/wiki/smoke.ts (new),
    scripts/wiki/pdf-to-md.ts (new),
    scripts/wiki/url-to-md.ts (new — 端到端 wechat fetch + cleaning,见 Step 1.5),
    scripts/wiki/compile.ts (new — 仅骨架 + classify 调用,publish 逻辑放 Task 2),
    knowledge/policy-sources/.gitkeep (new),
    knowledge/policy-sources/wechat-archives/.gitkeep (new),
    package.json (modify scripts 段)
  </files>
  <read_first>
    - experiments/llm-wiki-poc/prompts/classify-topics.md (整文件 — 直接拷贝)
    - experiments/llm-wiki-poc/prompts/compile-topic-article.md (整文件 — 直接拷贝)
    - experiments/llm-wiki-poc/.wiki-compiler-config.json (整文件 — 扩双 kb_type)
    - experiments/llm-wiki-poc/scripts/smoke-test.ts (1-33 — 改用 callLlm)
    - experiments/llm-wiki-poc/scripts/pdf-to-md.ts (1-167 — 几乎照搬,仅改 SOURCES_DIR)
    - experiments/llm-wiki-poc/scripts/url-to-md.ts (1-138 — 加 frontmatter)
    - experiments/llm-wiki-poc/scripts/compile.ts (56-200 — Phase 1+2 骨架;publish 逻辑见 Task 2)
    - experiments/llm-wiki-poc/package.json (7-13 — scripts 段)
    - lib/llm-client.ts (整文件 — callLlm 入口签名)
    - package.json (整文件 — scripts 段必须用 merge 而非覆盖)
    - C:/Users/admin/.claude/skills/wechat-article-fetch-ua-bypass/SKILL.md (整文件 — UA + cookie + 反爬模式)
    - .planning/phases/02-policy-qa/02-PATTERNS.md §1 行 58-310 (Wiki 编译 pipeline 全部 Keep/Change 决策)
    - .planning/phases/02-policy-qa/02-CONTEXT.md D-01/D-02/D-04/D-16/D-25 (kb_type 双库 / PoC fork / 素材路径 / 微信存档 / caller 命名)
  </read_first>
  <action>
    **Step 1.1 — 拷贝 prompts（按 PATTERNS.md §1）**：

    a. 拷贝 `experiments/llm-wiki-poc/prompts/classify-topics.md` 到 `prompts/wiki-classify-topics.md` 整文件不变。然后在文件第一行后插入一行（紧跟在原标题下）：
       ```
       本知识库 kb_type={{kb_type}}（由 caller 注入，取值 policy / biz）。主题分类必须只用本 kbType 范围内的素材。
       ```

    b. 拷贝 `experiments/llm-wiki-poc/prompts/compile-topic-article.md` 到 `prompts/wiki-compile-topic.md` 整文件不变。在 #5 节标题后追加一行：
       ```
       如果调用方传入 article_sections，则使用 caller 的；否则使用默认 6 段（与 wiki-config.json article_sections 一致）。
       ```

    保持 PoC 原文中所有"严格不可违反的约束"段（"引用必须真实可追溯" / "不要编造任何政策内容" / "原文措辞优先" / "必须含「## 出处」段"）一字不改。

    **Step 1.2 — 创建 wiki-config.json（D-01 双 kb_type）**：

    路径：`scripts/wiki/wiki-config.json`。结构：
    ```json
    {
      "policy": {
        "domain": "上海黄浦区社保局 政策与办事库",
        "topic_hints": ["失业保险", "就业补贴", "创业扶持", "技能培训", "灵活就业", "社保关系", "职业指导"],
        "article_sections": ["概述", "适用对象与资格条件", "办理流程与材料", "补贴标准与发放", "常见疑问", "出处"]
      },
      "biz": {
        "domain": "上海黄浦区 创业与行业库",
        "topic_hints": ["创业孵化", "创业贷款", "行业政策", "政企对接", "园区资源", "知识产权"],
        "article_sections": ["概述", "适用对象与资格条件", "办理流程与材料", "补贴标准与发放", "常见疑问", "出处"]
      }
    }
    ```

    **不要**包含 PoC 原 config 里的 `deepseek` 段（model/temperature 由 lib/llm-vendors/deepseek.ts 管理）。

    **Step 1.3 — 创建 scripts/wiki/smoke.ts（D-25）**：

    复用 PoC `experiments/llm-wiki-poc/scripts/smoke-test.ts` 整体结构（最简调用 + 计时 + 打印 vendor 与 token），但替换为 callLlm：
    ```typescript
    #!/usr/bin/env tsx
    import "dotenv/config";
    import { callLlm } from "../../lib/llm-client";

    async function main() {
      console.log(`[smoke] sending hello via callLlm...`);
      const start = Date.now();
      const result = await callLlm({
        caller: "qa.smoke",
        systemPrompt: "你是一个简洁的助手。",
        userPrompt: "请用一句中文回答：什么是失业保险？",
        maxTokens: 200,
      });
      console.log(`[smoke] OK vendor=${result.vendor} (${Date.now()-start}ms, tokens: ${result.totalTokens})`);
      console.log(`[smoke] content: ${result.raw.slice(0, 200)}`);
    }
    main().catch((e) => { console.error(e); process.exit(1); });
    ```

    **Step 1.4 — 创建 scripts/wiki/pdf-to-md.ts（D-04）**：

    几乎完全 fork `experiments/llm-wiki-poc/scripts/pdf-to-md.ts`（行 1-167）。修改：
    - 删除 `import '../lib/env.js'`，改用 `import 'dotenv/config'`（顶部第一行）
    - `SOURCES_DIR` 从 `path.join(POC_ROOT, 'sources')` 改为：从 `process.argv` 读取 `--sources=` 标志，默认 `path.join(process.cwd(), 'knowledge', 'policy-sources')`。CLI 用法：`tsx scripts/wiki/pdf-to-md.ts <input.pdf> [--sources=<dir>]`

    保留 PoC 中 `uploadAndStartTask` / `pollUntilDone` / `fetchMarkdown` / `annotateLineNumbers` 全部函数定义不变。

    **Step 1.5 — 创建 scripts/wiki/url-to-md.ts（D-16 微信文章端到端 fetch + 清洗 + 存档）**：

    Fork `experiments/llm-wiki-poc/scripts/url-to-md.ts`（行 1-138）。**端到端实现**——脚本必须能在真实 mp.weixin.qq.com URL 上跑通，不是骨架。

    修改清单：

    1. **fetch 层（参照 skill `wechat-article-fetch-ua-bypass`，C:/Users/admin/.claude/skills/wechat-article-fetch-ua-bypass/SKILL.md）**：HTTP 请求时 header 设：
       - `User-Agent`: 微信内置浏览器 UA（如 `Mozilla/5.0 (Linux; Android 10; ...) NetType/WIFI Language/zh_CN MicroMessenger/8.0.x ...`）
       - `Accept-Language: zh-CN,zh;q=0.9`
       - `Referer: https://mp.weixin.qq.com/`
       捕获响应中的 set-cookie → 第二次 request 时回带（如 PoC 原脚本未实现 cookie jar，加最简单 `Map<string,string>` 即可）。
       响应非 2xx 或 body 不含 `<div id="js_content"` 时 throw 明确错误（`微信文章内容定位不到，可能 UA 被拦截或 URL 失效`）。

    2. **清洗层（D-16 "去广告/二维码/关注卡/底部推荐"）**：在 `htmlToMarkdown` 之前对 HTML 字符串做：
       - 删除 `<div class="rich_media_thumb_wrp">` 整段（顶部头图块）
       - 删除 `<img class="qr_code"...>` 二维码图片 + `<mp-style-type=".*?qrcode.*?"...>` 二维码区块
       - 删除"关注公众号"卡片（regex match 包含 `data-tools="135editor"` 且文本含"关注"二字的 section block）
       - 删除 `<div class="rich_media_area_extra">` 整段（底部"推荐阅读 / 喜欢此内容的人还喜欢"）
       - 删除全部 `<script>` `<style>` 标签
       - 把 wechat 图片 src 从 `data-src` 提取到 `src`（wechat 懒加载会把真实 URL 放在 data-src）

    3. **输出层**：
       - 输出目录默认 `knowledge/policy-sources/wechat-archives/`，CLI flag `--output=<dir>` 可覆盖
       - 文件命名：`<slugFromTitle>-<YYYY-MM-DD>.md`（`slugFromTitle` 取 h1 文本前 32 字符 + slugify；取不到 h1 则 `slugFromUrl()` 兜底）
       - 文件顶部 YAML frontmatter（**字段名 sourceUrl 与 fetchedAt，对齐验收 grep**）：
         ```
         ---
         sourceUrl: <原 URL>
         fetchedAt: <ISO 时间>
         title: <h1 文本>
         kbType: policy
         ---

         # <h1 文本>

         <清洗后的 markdown body>
         ```

    4. **保留** PoC 中 `htmlToMarkdown` / `slugFromUrl` / `annotateLineNumbers` 函数主结构。

    5. **CLI 用法**：`tsx scripts/wiki/url-to-md.ts <wechatUrl1> [<wechatUrl2> ...] [--output=<dir>] [--kb=policy|biz]`，可一次抓多 URL。

    <deferred_input>
    Q1/Q2 的具体微信文章 URL（"上海创业政策一图解读" / "黄浦区创业孵化基地清单" 等具体题目）由用户在 W0 确认期提供（甲方/家人提供）。在用户给出真实 URL 前，executor 用任意 mp.weixin.qq.com 公开测试文章（例如官方媒体如人民日报、新华社的公开公众号文章——这些一般不会被 UA 拦截）跑一遍 pipeline 自检。最终交付时由用户用真实 URL 重跑覆盖产物。

    `.gitignore` 中已忽略 `knowledge/policy-sources/wechat-archives/*.md`，仅 `.gitkeep` 入 git；微信存档不应入版本控制（容量 + 版权）。
    </deferred_input>

    **Step 1.6 — 创建 scripts/wiki/compile.ts 骨架（仅 Task 1：scan + classify，publish 逻辑见 Task 2）**：

    Fork `experiments/llm-wiki-poc/scripts/compile.ts` 流程框架（行 56-200），但：
    - 顶部 import：用 `import { callLlm } from "../../lib/llm-client"` 替换 PoC 的 `import { chat, ... } from '../lib/deepseek-client.js'`
    - 删除 `import '../lib/env.js'`，加 `import 'dotenv/config'` 顶行
    - CLI flags 解析：`--kb=policy|biz`（必填）/ `--sources=<dir>`（默认 `knowledge/policy-sources`）/ `--dry-run` / `--publish`（dry-run 与 publish 二选一，至少一个；都不传则 fail with 用法说明）
    - `CONFIG_PATH` 改为本仓 `scripts/wiki/wiki-config.json`，按 `--kb` 取对应 sub-config（`config.policy` 或 `config.biz`）
    - 保留 token budget 累加、source_files 校验逻辑（PoC 行 213-224）
    - `classifyTopics(sources, config, budget)` 内部把 PoC 的 `chat({ system, user, response_format: 'json_object' })` 替换为：
      ```typescript
      const result = await callLlm({
        caller: "qa.compile.classify",
        systemPrompt: system,
        userPrompt: user,
        jsonMode: true,
        parser: (raw) => JSON.parse(raw) as { topics: Topic[] },
        maxTokens: 2000,
      });
      // 累加 token budget: budget.used_total += result.totalTokens
      return { topics: result.data.topics, budget };
      ```
    - `compileTopicArticle(topic, sources, config, budget)` 同样替换 chat 为 `callLlm({ caller: "qa.compile.compile", ... maxTokens: 4000 })`，但 `jsonMode: false`（输出 markdown），返回 `{ markdown: result.raw, budget }`
    - 主函数 `main()`：
      - dry-run 模式：跑完 classify + compile，输出每个 topic 的 `slug` / `title` / `markdown 前 200 字`，不写库
      - publish 模式：调用 Task 2 实现的 `publishTopic(...)` 函数（Task 1 内先放空函数 `async function publishTopic() { throw new Error('Task 2: TODO'); }`，Task 2 替换实现）

    **Step 1.7 — 创建 .gitkeep 占位**：

    `knowledge/policy-sources/.gitkeep` + `knowledge/policy-sources/wechat-archives/.gitkeep`，空文件。

    **Step 1.8 — 修改 package.json（merge 进现有 scripts 段，不删除已有）**：

    在 `scripts` 段内新增（保留已有的 dev/build/test:* 等）：
    ```
    "wiki:smoke": "tsx scripts/wiki/smoke.ts",
    "wiki:pdf-to-md": "tsx scripts/wiki/pdf-to-md.ts",
    "wiki:url-to-md": "tsx scripts/wiki/url-to-md.ts",
    "wiki:compile": "tsx scripts/wiki/compile.ts",
    "llm-eval": "tsx tests/llm-eval/run.ts",
    "llm-eval:real": "REAL_LLM=1 tsx tests/llm-eval/run.ts"
    ```

    其中 `test:llm-eval` 已存在 — 不要删除（D-19 用 `llm-eval` 作为 CI 默认命令；保留 `test:llm-eval` 向下兼容）。

    确认 `tsx` 已在 devDependencies（PoC package.json 用了；如本仓没有则 `npm install --save-dev tsx`，并把 `dotenv` 也作为 devDependency 安装如 PoC 所做）。

    **Step 1.9 — 编译期检查**：

    运行 `npm run typecheck`，确认所有 4 个新 .ts 文件通过 TS 编译。
  </action>
  <acceptance_criteria>
    - 文件存在：`prompts/wiki-classify-topics.md` 包含字符串 `kb_type` 且包含 PoC 原 "严格约束" 段（grep `严格`）。
    - 文件存在：`prompts/wiki-compile-topic.md` 包含字符串 `引用必须真实可追溯` 和 `不要编造任何政策内容`。
    - `scripts/wiki/wiki-config.json` 是合法 JSON（`node -e "JSON.parse(require('fs').readFileSync('scripts/wiki/wiki-config.json'))"` 退 0），顶层有 `policy` 和 `biz` 两个 key，各自有 `domain` / `topic_hints` / `article_sections`。
    - `package.json` 的 `scripts` 段含全部 6 个新 key：`wiki:smoke` / `wiki:pdf-to-md` / `wiki:url-to-md` / `wiki:compile` / `llm-eval` / `llm-eval:real`（grep `wiki:compile` package.json 至少出现 1 次）。
    - `npm run typecheck` 退出 0（4 个新 ts 文件全部 TS 通过）。
    - `npm run wiki:compile` 不传任何 flag 时退出非 0 并打印 usage 说明（含 `--kb=` `--publish` `--dry-run`）。
    - `npm run wiki:compile -- --kb=policy --sources=experiments/llm-wiki-poc/sources --dry-run` 跑完不报错（用 PoC 自带的 3 个 sources md 做 dry-run），stdout 输出至少 1 个 topic 的 slug/title/markdown 前缀，**不写** WikiPage 表（`SELECT count(*) FROM "WikiPage"` 仍为 0）。
    - `grep -n 'callLlm' scripts/wiki/compile.ts` ≥2（classify + compile 两处）；`grep -n "from '.*deepseek-client" scripts/wiki/compile.ts` 为 0（不直连 PoC 的 deepseek-client）。
    - `knowledge/policy-sources/.gitkeep` 和 `knowledge/policy-sources/wechat-archives/.gitkeep` 都存在（git 跟踪）。
    - `scripts/wiki/url-to-md.ts` 含字符串 `MicroMessenger`（UA bypass）+ `js_content`（清洗定位）+ `sourceUrl`（frontmatter 字段）+ `data-src`（图片懒加载）。
    - `grep -c "MicroMessenger\|js_content\|data-src" scripts/wiki/url-to-md.ts` ≥3。
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && node -e "const c=JSON.parse(require('fs').readFileSync('scripts/wiki/wiki-config.json','utf8'));if(!c.policy||!c.biz||!c.policy.article_sections)process.exit(1)" && grep -q "wiki:compile" package.json && grep -q "callLlm" scripts/wiki/compile.ts && [ "$(grep -c 'deepseek-client' scripts/wiki/compile.ts)" = "0" ] && grep -q "MicroMessenger" scripts/wiki/url-to-md.ts && grep -q "js_content" scripts/wiki/url-to-md.ts && grep -q "sourceUrl" scripts/wiki/url-to-md.ts</automated>
  </verify>
  <done>
    - 4 个 CLI 脚本 + 2 个 prompt + 1 份 config + 6 个 npm 脚本到位
    - typecheck 全过
    - dry-run 跑通（不写库）
    - 没有任何文件直连 PoC 的 deepseek-client（全部走 callLlm）
    - url-to-md.ts 实现 wechat UA bypass + 清洗 + frontmatter，**不是骨架**
  </done>
</task>

<task type="auto">
  <name>Task 2: 给 compile.ts 补 publish 逻辑（transactional WikiPage upsert + WikiPageVersion + audit）+ 拷贝 PoC sources 到 canonical 目录</name>
  <files>
    scripts/wiki/compile.ts (modify — 实现 publishTopic + 主流程 publish 分支),
    knowledge/policy-sources/jiu-zheng-ce-2.md (new — 拷贝自 PoC),
    knowledge/policy-sources/ji-she-kong-jian.md (new — 拷贝自 PoC),
    knowledge/policy-sources/chuangka-shouce.md (new — 拷贝自 PoC)
  </files>
  <read_first>
    - scripts/wiki/compile.ts (Task 1 创建的当前版本)
    - lib/db.ts (整文件 — Prisma client 单例)
    - lib/audit.ts (logAudit 实现)
    - prisma/schema.prisma (WikiPage / WikiPageVersion 字段定义)
    - lib/citizens.ts (48-93 — 事务 + service 风格参考)
    - experiments/llm-wiki-poc/sources/jiu-zheng-ce-2.md (整文件 — 拷贝目标 1)
    - experiments/llm-wiki-poc/sources/ji-she-kong-jian.md (整文件 — 拷贝目标 2)
    - experiments/llm-wiki-poc/sources/chuangka-shouce.md (整文件 — 拷贝目标 3)
    - .planning/phases/02-policy-qa/02-PATTERNS.md §1 scripts/wiki/compile.ts 的 "Change（critical）" 第 3 项 (transaction 写法)
    - .planning/phases/02-policy-qa/02-CONTEXT.md D-02/D-03/D-04/D-05/D-26
  </read_first>
  <action>
    **Step 2.0 — 把 PoC 的 3 份 source markdown 拷贝到 canonical 目录（D-04）**：

    用 Read 工具读 `experiments/llm-wiki-poc/sources/jiu-zheng-ce-2.md` / `ji-she-kong-jian.md` / `chuangka-shouce.md` 的整文件内容。
    用 Write 工具把每个文件写到 `knowledge/policy-sources/<basename>.md`。

    这一步让下游 Plan 02-03 的 q1/q2/q3.md 可以引用 canonical 路径 `knowledge/policy-sources/jiu-zheng-ce-2.md`，而不是 PoC 实验目录 `experiments/llm-wiki-poc/sources/jiu-zheng-ce-2.md`（PoC 目录是临时的，未来可能被清理）。

    如果 PoC source 文件含编码问题（非 UTF-8），保留原编码 + 加注释说明（让后续 02-03 的 q1/q2/q3 摘录时知道源问题）。

    **Step 2.1 — 在 compile.ts 中实现 publishTopic**：

    在文件中添加（替换 Task 1 的占位 `publishTopic`）：

    ```typescript
    import { prisma } from "../../lib/db";
    import { logAudit } from "../../lib/audit";

    interface PublishInput {
      kbType: "policy" | "biz";
      slug: string;
      title: string;
      content: string;        // 编译产出的 markdown
      sourceUrl?: string;     // 取自 source 文件 frontmatter（如有），否则 undefined
      diffSummary?: string;   // dry-run 时计算出的 diff 摘要
    }

    async function publishTopic(input: PublishInput): Promise<{ id: string; version: number; created: boolean }> {
      // D-03 / D-05: 事务写 WikiPage upsert + WikiPageVersion create
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.wikiPage.findUnique({
          where: { kbType_slug: { kbType: input.kbType, slug: input.slug } },
        });

        if (!existing) {
          // create 路径
          const created = await tx.wikiPage.create({
            data: {
              kbType: input.kbType,
              slug: input.slug,
              title: input.title,
              content: input.content,
              sourceUrl: input.sourceUrl ?? null,
              version: 1,
              publishedAt: new Date(),
            },
          });
          await tx.wikiPageVersion.create({
            data: {
              wikiPageId: created.id,
              version: 1,
              contentSnapshot: input.content,
              editorId: "system:wiki-compile",
              diffSummary: input.diffSummary ?? "initial publish",
            },
          });
          return { id: created.id, version: 1, created: true };
        } else {
          // update 路径
          const newVersion = existing.version + 1;
          const updated = await tx.wikiPage.update({
            where: { id: existing.id },
            data: {
              title: input.title,
              content: input.content,
              sourceUrl: input.sourceUrl ?? existing.sourceUrl,
              version: newVersion,
              publishedAt: new Date(),
            },
          });
          await tx.wikiPageVersion.create({
            data: {
              wikiPageId: updated.id,
              version: newVersion,
              contentSnapshot: input.content,
              editorId: "system:wiki-compile",
              diffSummary: input.diffSummary ?? `recompile to v${newVersion}`,
            },
          });
          return { id: updated.id, version: newVersion, created: false };
        }
      });

      // D-26: 事务外写 audit log（writeFailure silent）
      await logAudit({
        actor: "system:wiki-compile",
        action: "wiki.publish",
        targetType: "wiki_page",
        targetId: result.id,
        before: result.created ? null : { version: result.version - 1 },
        after: { kbType: input.kbType, slug: input.slug, title: input.title, version: result.version },
      });

      return result;
    }
    ```

    **Step 2.2 — 在主函数 publish 分支调用 publishTopic**：

    在 `main()` 的 publish 分支（`if (args.publish)`），把每个 topic 的编译产物喂给 publishTopic：

    ```typescript
    if (args.publish) {
      console.log(`[compile] publishing ${topics.length} topics to kb=${args.kb}...`);
      for (const topic of topics) {
        const { markdown, budget: budget3 } = await compileTopicArticle(topic, sources, config, budget);
        budget = budget3;

        const r = await publishTopic({
          kbType: args.kb,
          slug: topic.slug,
          title: topic.name,
          content: markdown,
          // sourceUrl 暂留 undefined（PoC sources 是本地 md 无外链）；微信抓取后从 frontmatter source 字段取
        });
        console.log(`[compile] ${r.created ? 'CREATED' : 'UPDATED'} ${args.kb}/${topic.slug} → v${r.version} (id=${r.id})`);
      }
      console.log(`[compile] done. token budget used=${budget.used_total}/${budget.limit}`);
    }
    ```

    **Step 2.3 — 失败处理**：

    在 publish 主循环外用 `try/catch` 包裹，任何 throw 时打印错误 + 退出码 1。Prisma 事务自动回滚，`logAudit` 内部已 try/catch（写失败 silent），不会让事务回滚因为 audit 失败而失败——这与 Phase 1 设计一致（audit 写失败 silent）。

    **Step 2.4 — 实跑验证**：

    用 canonical 目录做最小验证（拷贝完成后）：
    ```
    npm run wiki:compile -- --kb=policy --sources=knowledge/policy-sources --publish
    ```

    执行前确保：
    - `.env.local` 有 `DATABASE_URL` 指向本地 docker postgres（Phase 1 的 docker-compose.yml）
    - `DEEPSEEK_API_KEY` 至少有一个真 key 或者通过 `LLM_VENDOR_FORCE` 走 mock（如 lib/llm-client.ts 支持）
    - `prisma db push` 已跑过（schema 落库）

    成功后 `SELECT count(*) FROM "WikiPage" WHERE "kbType"='policy'` 应 ≥1，每行对应一条 `WikiPageVersion`，`SELECT count(*) FROM "AuditLog" WHERE action='wiki.publish'` ≥1。

    **如果用户机器没真 LLM key**：把"实跑"放到 Phase 2 部署后做（W0 拿到 key 之后）；本 task 的 acceptance 仅卡 typecheck + dry-run（Task 1 已验过）+ 单元测试（如有）+ schema 检查；publish 真跑作为 Phase 2 整体验收的一部分（Plan 02-07 e2e 之前必须完成）。
  </action>
  <acceptance_criteria>
    - `grep -c "publishTopic" scripts/wiki/compile.ts` ≥3（定义 + main 调用 + 类型签名）。
    - `grep -q "prisma.\$transaction" scripts/wiki/compile.ts`。
    - `grep -q "wiki.publish" scripts/wiki/compile.ts`（logAudit action 名）。
    - `grep -q "system:wiki-compile" scripts/wiki/compile.ts`（actor + editorId）。
    - 文件存在：`knowledge/policy-sources/jiu-zheng-ce-2.md` `knowledge/policy-sources/ji-she-kong-jian.md` `knowledge/policy-sources/chuangka-shouce.md`（PoC sources canonical 拷贝）。
    - `npm run typecheck` 退出 0。
    - `npm run wiki:compile -- --kb=policy --sources=knowledge/policy-sources --dry-run` 仍然不写库（dry-run 路径不调 publishTopic）且能识别拷贝过来的 3 份 source。
    - 用 sqlite3 / docker pg 命令验证 schema：`prisma db push` 退 0；执行 `psql $DATABASE_URL -c "SELECT count(*) FROM \"WikiPage\""` 不报错（即使为 0 也行 — Phase 2 部署后再实跑 publish）。
    - **如有真 LLM key + 已 prisma db push**：`npm run wiki:compile -- --kb=policy --sources=knowledge/policy-sources --publish` 退出 0，`SELECT count(*) FROM "WikiPage" WHERE "kbType"='policy'` ≥1，对应行的 version=1，`SELECT count(*) FROM "WikiPageVersion"` ≥ wiki_page 行数，`SELECT count(*) FROM "AuditLog" WHERE action='wiki.publish'` ≥1。
    - **如无真 LLM key**：跳过 publish 实跑（W0 完成后由用户手动跑一次；本 plan 内 dry-run 通过即视作交付）。
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && grep -q "publishTopic" scripts/wiki/compile.ts && grep -q "prisma.\$transaction" scripts/wiki/compile.ts && grep -q "wiki.publish" scripts/wiki/compile.ts && test -f knowledge/policy-sources/jiu-zheng-ce-2.md && test -f knowledge/policy-sources/ji-she-kong-jian.md && test -f knowledge/policy-sources/chuangka-shouce.md</automated>
  </verify>
  <done>
    - publishTopic 实现完成（事务写 WikiPage + WikiPageVersion + 事务外 logAudit）
    - main publish 分支调用 publishTopic 且打印 created/updated 日志
    - PoC 3 份 sources 拷到 canonical 目录 `knowledge/policy-sources/`
    - typecheck + dry-run 全过
    - 真 LLM key + DB 就绪时能实跑写库（W0 完成后由用户验收）
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 3: Checkpoint — 用户提供 Q1/Q2 微信文章 URL，触发 url-to-md.ts 真跑产出 ≥2 篇 wechat-archives</name>
  <what-built>
    - scripts/wiki/url-to-md.ts 端到端实现（UA bypass + 清洗 + frontmatter）
    - knowledge/policy-sources/wechat-archives/ 目录已就位（.gitkeep 入 git）
  </what-built>
  <how-to-verify>
    1. 由你（用户）提供 Q1（青年初次就业有哪些补贴？）和 Q2（黄浦区有哪些创业孵化基地及补贴？）对应的微信公众号文章 URL（来源：海纳百创 / 黄浦人社 / 上海发布等公众号已发布的政策图解文）。如暂时没有具体 URL，由 executor 任意挑两篇 mp.weixin.qq.com 公开文章（人民日报 / 新华社 / 上海发布官方公众号）做骨架自检——产物会被你审校替换。
    2. executor 执行（assistant 接到 URL 后跑）：
       ```bash
       npm run wiki:url-to-md -- "<wechatUrlQ1>" "<wechatUrlQ2>"
       ```
    3. 验收：
       - `ls knowledge/policy-sources/wechat-archives/*.md | wc -l` ≥2
       - 每个 .md 文件顶部 frontmatter 含 `sourceUrl: https://mp.weixin.qq.com/`（grep 命中）
       - 每个 .md 正文不含 `qrcode` / "关注公众号" / `<script>` / `data-tools="135editor".*关注` 等被清洗 token
       - `head -10 knowledge/policy-sources/wechat-archives/*.md` 显示标题 + ISO fetchedAt 时间
    4. 真 URL 替代后，将自检产物从 `wechat-archives/` 删除（`.gitignore` 已挡，不污染 git）。
    5. Q1/Q2 抓取产物作为 02-03 q1.md / q2.md 的素材源（由 02-03 在 frontmatter 的 `sources` 字段引用文件名）。
  </how-to-verify>
  <resume-signal>
    回复 "approved" 或者直接给出 wechat URL（assistant 自动跑 url-to-md 然后回到 Plan 流程）。如你明确选择骨架自检模式（"先用任意公开文章自检，真 URL W0 末再补"），也回复 "skeleton-only"——则 executor 用任意 mp.weixin.qq.com 公开文章生成 2 个 .md 自检，产物不入 git，通过即视为本 task 完成。
  </resume-signal>
</task>

</tasks>

<verification>
1. **CLI 入口齐全**：`npm run wiki:smoke` / `wiki:pdf-to-md` / `wiki:url-to-md` / `wiki:compile` / `llm-eval` / `llm-eval:real` 6 个命令 npm 能识别（`npm run` 不带参数列出全部）。
2. **类型与依赖**：`npm run typecheck` 全过；`tsx` 在 devDependencies；不引入新基础依赖（继续用 dotenv / 原 PoC dependencies）。
3. **Wiki 编译契约**：dry-run 不写库；publish 写库 transactional（WikiPage + WikiPageVersion + audit_logs）；`caller` 字段为 `qa.compile.classify` 或 `qa.compile.compile`，写入 `LlmCallLog` 由 callLlm 自动完成。
4. **Prompt 完整**：`prompts/wiki-classify-topics.md` 含 kb_type 占位；`prompts/wiki-compile-topic.md` 含 5 条不可违反约束 + 6 段结构。
5. **目录骨架**：`knowledge/policy-sources/` 和 `knowledge/policy-sources/wechat-archives/` 都已 git tracked（`.gitkeep`）；canonical sources 含 jiu-zheng-ce-2.md / ji-she-kong-jian.md / chuangka-shouce.md 三份 PoC 拷贝。
6. **微信端到端（QA-09 / D-16）**：`scripts/wiki/url-to-md.ts` 含 wechat UA bypass + 清洗 + frontmatter；checkpoint 后产出 ≥2 个 wechat archive .md。
</verification>

<success_criteria>
- [ ] 7 个新文件 + 1 个修改文件 + 3 个 PoC source 拷贝 + ≥2 个 wechat archive 全部按 PATTERNS.md §1 决策落地
- [ ] `scripts/wiki/compile.ts` 三处关键替换都生效：(1) 不直连 deepseek-client；(2) 用 callLlm 双 caller；(3) publish 事务写库 + audit
- [ ] `scripts/wiki/url-to-md.ts` 端到端实现（UA bypass + 清洗 + frontmatter），不是骨架
- [ ] 6 个 npm 脚本可见且独立可跑
- [ ] dry-run 跑通（用 canonical sources 验最小数据集）
- [ ] publish 路径 typecheck + 事务调用结构正确（实跑等真 key + DB）
- [ ] checkpoint 通过：≥2 篇 wechat archive 实际生成
- [ ] 满足 Phase 2 success criteria #1 #2 的数据基础（WikiPage 表能持续写入双 kb_type 内容）
</success_criteria>

<output>
After completion, create `.planning/phases/02-policy-qa/02-01-SUMMARY.md` recording:
- 4 个新 CLI 脚本路径 + 命令用法示例
- 2 个 fork prompt 的关键改动行（kb_type 占位 / article_sections 委托）
- wiki-config.json 的双 kbType schema 摘要
- compile.ts 替换 deepseek-client 为 callLlm 的 diff 概要
- publishTopic 事务结构 + audit 写入清单
- url-to-md.ts 实现 wechat UA bypass + 清洗规则清单（哪些 selector 被删）
- canonical sources 拷贝清单（jiu-zheng-ce-2.md / ji-she-kong-jian.md / chuangka-shouce.md）
- wechat archives checkpoint 产物清单（文件名 + sourceUrl 列表，URL 是用户提供的真实还是骨架自检）
- 实跑结果（如有真 key）：WikiPage / WikiPageVersion / AuditLog 行数 + DeepSeek 总 token 数 + 实际成本
- 已知 W0 阻塞项：真 LLM key 未到、CDB 未开通时 publish 真跑会被推迟到 Phase 2 整体验收
</output>
</content>
