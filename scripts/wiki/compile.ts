#!/usr/bin/env tsx
/**
 * Wiki 编译 CLI（D-02 / D-03 / D-04 / D-05 / D-25 / D-26）
 *
 * Phases:
 *   1. 扫描 sources/（无 LLM）
 *   2. 主题分类（callLlm caller=qa.compile.classify, JSON）
 *   3. 主题文章生成（callLlm caller=qa.compile.compile, markdown 串行）
 *   4a. dry-run：打印每主题 slug + title + markdown 前 200 字（不写库）
 *   4b. publish：transactional WikiPage upsert + WikiPageVersion + audit_logs（Task 2 实现）
 *
 * 设计决策：
 *   - 不直连 deepseek SDK（D-25），所有 LLM 调用走 lib/llm-client.ts callLlm
 *   - 不写本地文件（PoC 行为），直接写 sbj_dev DB
 *   - dry-run / publish 二选一必填
 *
 * Usage:
 *   npm run wiki:compile -- --kb=policy --sources=knowledge/policy-sources --dry-run
 *   npm run wiki:compile -- --kb=policy --sources=knowledge/policy-sources --publish
 */
// 优先加载 .env.local（与 Next.js 行为一致），再 fallback 到 .env
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });
loadDotenv({ path: ".env" });
import fs from "node:fs/promises";
import path from "node:path";
import { callLlm } from "../../lib/llm-client";
import { prisma } from "../../lib/db";
import { logAudit } from "../../lib/audit";

const MAX_TOKENS_PER_RUN = Number(process.env.MAX_TOKENS_PER_RUN ?? 200_000);

const CONFIG_PATH = path.join(process.cwd(), "scripts", "wiki", "wiki-config.json");
const PROMPTS_DIR = path.join(process.cwd(), "prompts");

// ----- types -----

type KbType = "policy" | "biz";

interface KbConfig {
  domain: string;
  topic_hints: string[];
  article_sections: string[];
}

interface WikiConfig {
  policy: KbConfig;
  biz: KbConfig;
}

interface Topic {
  slug: string;
  name: string;
  rationale: string;
  source_files: string[];
}

interface SourceFile {
  filename: string;
  fullPath: string;
  title: string;
  preview: string;
  content: string;
  totalLines: number;
  sourceUrl?: string; // 微信 frontmatter sourceUrl
}

interface TokenBudget {
  used_total: number;
  limit: number;
}

interface CliArgs {
  kb: KbType;
  sources: string;
  dryRun: boolean;
  publish: boolean;
}

interface PublishInput {
  kbType: KbType;
  slug: string;
  title: string;
  content: string;
  sourceUrl?: string;
  diffSummary?: string;
}

// ----- entry -----

main().catch((err) => {
  console.error("[compile] 失败：", err instanceof Error ? err.message : err);
  process.exit(1);
});

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const start = Date.now();
  console.log(`[compile] kb=${args.kb} sources=${args.sources} mode=${args.dryRun ? "dry-run" : "publish"}`);

  const cfgRaw = await fs.readFile(CONFIG_PATH, "utf-8");
  const fullConfig = JSON.parse(cfgRaw) as WikiConfig;
  const config = fullConfig[args.kb];
  if (!config) {
    throw new Error(`wiki-config.json 缺 kb_type=${args.kb}`);
  }
  console.log(`[compile] domain: ${config.domain}`);

  let budget: TokenBudget = { used_total: 0, limit: MAX_TOKENS_PER_RUN };

  // Phase 1: scan
  console.log(`[compile] Phase 1: scan ${args.sources}/`);
  const sources = await scanSources(args.sources);
  if (sources.length === 0) {
    throw new Error(`${args.sources}/ 为空。先跑 npm run wiki:pdf-to-md / wiki:url-to-md 准备素材。`);
  }
  console.log(
    `[compile] 找到 ${sources.length} 份 source markdown：${sources.map((s) => s.filename).join(", ")}`
  );

  // Phase 2: classify
  console.log("[compile] Phase 2: classify topics（callLlm caller=qa.compile.classify）");
  const { topics, budget: budget2 } = await classifyTopics(sources, args.kb, config, budget);
  budget = budget2;
  console.log(
    `[compile] 分出 ${topics.length} 个主题：${topics
      .map((t) => `${t.slug}(${t.source_files.length})`)
      .join(", ")}`
  );

  // Phase 3: compile + publish/dry-run
  console.log("[compile] Phase 3: compile topic articles（callLlm caller=qa.compile.compile，串行）");
  for (const topic of topics) {
    console.log(`[compile]   编 → ${topic.slug} (${topic.source_files.length} 份素材)`);
    const { markdown, budget: budget3 } = await compileTopicArticle(
      topic,
      sources,
      config,
      budget
    );
    budget = budget3;

    if (args.dryRun) {
      const preview = markdown.slice(0, 200).replace(/\n/g, " ");
      console.log(
        `[compile][dry-run] ${args.kb}/${topic.slug} title="${topic.name}" preview="${preview}..."`
      );
    } else if (args.publish) {
      // Task 2 实现的事务写库 + audit
      const r = await publishTopic({
        kbType: args.kb,
        slug: topic.slug,
        title: topic.name,
        content: markdown,
        // sourceUrl 取自该主题第一个有 frontmatter sourceUrl 的 source（微信抓取时会带）
        sourceUrl: pickSourceUrl(topic, sources),
      });
      console.log(
        `[compile] ${r.created ? "CREATED" : "UPDATED"} ${args.kb}/${topic.slug} → v${r.version} (id=${r.id})`
      );
    }
  }

  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(
    `[compile] done. token budget used=${budget.used_total}/${budget.limit}, elapsed=${elapsed}s`
  );
}

// ----- CLI args -----

function parseArgs(argv: string[]): CliArgs {
  const flags: Record<string, string> = {};
  for (const a of argv) {
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else flags[a.slice(2)] = "true";
    }
  }
  const kb = flags.kb as KbType | undefined;
  const sources = flags.sources;
  const dryRun = flags["dry-run"] === "true";
  const publish = flags.publish === "true";

  if (!kb || !["policy", "biz"].includes(kb)) {
    usageAndExit("--kb=policy|biz 必填");
  }
  if (!sources) {
    usageAndExit("--sources=<dir> 必填");
  }
  if (!dryRun && !publish) {
    usageAndExit("--dry-run 或 --publish 至少一个");
  }
  if (dryRun && publish) {
    usageAndExit("--dry-run 与 --publish 互斥");
  }

  return { kb: kb as KbType, sources: sources as string, dryRun, publish };
}

function usageAndExit(reason: string): never {
  console.error(`[compile] 用法错误：${reason}`);
  console.error(
    "Usage: tsx scripts/wiki/compile.ts --kb=<policy|biz> --sources=<dir> (--dry-run | --publish)"
  );
  process.exit(2);
}

// ----- Phase 1: scan -----

async function scanSources(sourcesArg: string): Promise<SourceFile[]> {
  const dir = path.resolve(process.cwd(), sourcesArg);
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    throw new Error(`扫描 sources 目录失败 ${dir}: ${err instanceof Error ? err.message : err}`);
  }
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("."))
    .map((e) => e.name);

  const sources: SourceFile[] = [];
  for (const filename of files) {
    const fullPath = path.join(dir, filename);
    const content = await fs.readFile(fullPath, "utf-8");
    const lines = content.split("\n");

    // 解析 frontmatter（YAML 风格 ---）抽 sourceUrl + title
    let sourceUrl: string | undefined;
    let frontTitle: string | undefined;
    if (lines[0]?.trim() === "---") {
      let i = 1;
      while (i < lines.length && lines[i]?.trim() !== "---") {
        const m = lines[i].match(/^(\w+):\s*(.+)$/);
        if (m) {
          if (m[1] === "sourceUrl") sourceUrl = m[2].trim();
          if (m[1] === "title") frontTitle = m[2].trim();
        }
        i++;
      }
    }

    // 取首个 # 作为标题（跳过 <!-- L:N --> 注释）
    const titleLine = lines
      .map((l) => l.replace(/<!--\s*L:\d+\s*-->/, "").trim())
      .find((l) => l.startsWith("# "));
    const title = frontTitle ?? titleLine?.replace(/^#\s+/, "") ?? filename;
    const preview = lines
      .slice(0, 80)
      .map((l) => l.replace(/<!--\s*L:\d+\s*-->/, ""))
      .join("\n")
      .slice(0, 800);
    sources.push({
      filename,
      fullPath,
      title,
      preview,
      content,
      totalLines: lines.length,
      sourceUrl,
    });
  }
  return sources;
}

// ----- Phase 2: classify -----

async function classifyTopics(
  sources: SourceFile[],
  kbType: KbType,
  config: KbConfig,
  budget: TokenBudget
): Promise<{ topics: Topic[]; budget: TokenBudget }> {
  const systemRaw = await fs.readFile(path.join(PROMPTS_DIR, "wiki-classify-topics.md"), "utf-8");
  const system = systemRaw.replace(/{{kb_type}}/g, kbType);

  const sourceSummary = sources
    .map(
      (s, i) => `### Source ${i + 1}: \`${s.filename}\`
- 标题: ${s.title}
- 行数: ${s.totalLines}
- 前 800 字预览:
${s.preview}`
    )
    .join("\n\n---\n\n");

  const user = `项目领域：${config.domain}

主题种子词（参考非强制）：${config.topic_hints.join("、")}

待分类素材：

${sourceSummary}

请输出 JSON。`;

  const result = await callLlm<{ topics: Topic[] }>({
    caller: "qa.compile.classify",
    systemPrompt: system,
    userPrompt: user,
    jsonMode: true,
    temperature: 0.1,
    maxTokens: 2000,
    parser: (raw) => JSON.parse(raw) as { topics: Topic[] },
  });

  const newBudget = {
    ...budget,
    used_total: budget.used_total + result.tokensIn + result.tokensOut,
  };
  if (newBudget.used_total > newBudget.limit) {
    throw new Error(`token budget 超限：${newBudget.used_total}/${newBudget.limit}`);
  }

  const parsed = result.data;
  if (!parsed.topics || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
    throw new Error(`Phase 2 返回 topics 字段缺失或空：${result.data}`);
  }

  // 校验 source_files 都在实际文件列表中
  const validFilenames = new Set(sources.map((s) => s.filename));
  for (const t of parsed.topics) {
    if (!t.source_files || !Array.isArray(t.source_files) || t.source_files.length === 0) {
      throw new Error(`主题 ${t.slug} 没有 source_files`);
    }
    for (const f of t.source_files) {
      if (!validFilenames.has(f)) {
        throw new Error(`主题 ${t.slug} 引用了不存在的文件：${f}`);
      }
    }
  }

  return { topics: parsed.topics, budget: newBudget };
}

// ----- Phase 3: compile -----

async function compileTopicArticle(
  topic: Topic,
  allSources: SourceFile[],
  config: KbConfig,
  budget: TokenBudget
): Promise<{ markdown: string; budget: TokenBudget }> {
  const system = await fs.readFile(path.join(PROMPTS_DIR, "wiki-compile-topic.md"), "utf-8");

  const sources = allSources.filter((s) => topic.source_files.includes(s.filename));
  const sourceBodies = sources
    .map(
      (s) => `### \`${s.filename}\` （${s.totalLines} 行，每行已用 \`<!-- L:N -->\` 标注）

${s.content}`
    )
    .join("\n\n---\n\n");

  const sectionsSpec = config.article_sections.map((sec) => `- **${sec}**`).join("\n");

  const user = `主题：${topic.name}（slug: ${topic.slug}）

主题归属逻辑：${topic.rationale}

article_sections（按此顺序写）：
${sectionsSpec}

source markdown 全文（行号已标注，引用时用 \`文件名:起始行-结束行\`）：

${sourceBodies}

请输出主题文章 markdown（从 \`# ${topic.name}\` 开始），严格遵守 system 中的引用约束。`;

  const result = await callLlm({
    caller: "qa.compile.compile",
    systemPrompt: system,
    userPrompt: user,
    temperature: 0.1,
    maxTokens: 4000,
  });

  const newBudget = {
    ...budget,
    used_total: budget.used_total + result.tokensIn + result.tokensOut,
  };
  if (newBudget.used_total > newBudget.limit) {
    throw new Error(`token budget 超限：${newBudget.used_total}/${newBudget.limit}`);
  }

  return { markdown: String(result.data).trim() + "\n", budget: newBudget };
}

// ----- Phase 4 (publish): D-03 / D-05 / D-26 transactional + audit -----

async function publishTopic(
  input: PublishInput
): Promise<{ id: string; version: number; created: boolean }> {
  // Task 2 实现：transactional WikiPage upsert + WikiPageVersion + 事务外 audit
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.wikiPage.findUnique({
      where: { kbType_slug: { kbType: input.kbType, slug: input.slug } },
    });

    if (!existing) {
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

  // 事务外 audit（写失败 silent，不阻塞主流程）
  await logAudit({
    actor: "system:wiki-compile",
    action: "wiki.publish",
    targetType: "wiki_page",
    targetId: result.id,
    before: result.created ? null : { version: result.version - 1 },
    after: {
      kbType: input.kbType,
      slug: input.slug,
      title: input.title,
      version: result.version,
    },
  });

  return result;
}

// ----- helpers -----

function pickSourceUrl(topic: Topic, allSources: SourceFile[]): string | undefined {
  for (const f of topic.source_files) {
    const s = allSources.find((x) => x.filename === f);
    if (s?.sourceUrl) return s.sourceUrl;
  }
  return undefined;
}
