/**
 * 主编译流程：sources/*.md → wiki/INDEX.md + wiki/topics/*.md
 *
 * Phases (W0 PoC 简化):
 *   1. 扫描 sources/（无 LLM）
 *   2. 主题分类（DeepSeek）
 *   3. 主题文章生成（DeepSeek，串行）
 *   4. INDEX.md 生成（无 LLM）
 *   5. compile-state + log（无 LLM）
 *
 * Skipped vs upstream: 概念 (3.5) / schema (3.7) / coverage / 时效 / 并发
 *
 * Usage: npm run compile
 */

import '../lib/env.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chat, accumulate, checkBudget, type TokenBudget } from '../lib/deepseek-client.js';

const POC_ROOT = path.resolve(import.meta.dirname, '..');
const SOURCES_DIR = path.join(POC_ROOT, 'sources');
const WIKI_DIR = path.join(POC_ROOT, 'wiki');
const TOPICS_DIR = path.join(WIKI_DIR, 'topics');
const PROMPTS_DIR = path.join(POC_ROOT, 'prompts');
const REPORTS_DIR = path.join(POC_ROOT, 'reports');
const CONFIG_PATH = path.join(POC_ROOT, '.wiki-compiler-config.json');

const MAX_TOKENS_PER_RUN = Number(process.env.MAX_TOKENS_PER_RUN ?? 200_000);

interface Config {
  name: string;
  domain: string;
  topic_hints: string[];
  article_sections: { name: string; description: string; required?: boolean }[];
  link_style: 'markdown' | 'obsidian';
  deepseek: { model: string; temperature: number; max_completion_tokens: number };
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
}

main().catch((err) => {
  console.error('[compile] 失败：', err.message);
  process.exit(1);
});

async function main() {
  const start = Date.now();
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8')) as Config;
  let budget: TokenBudget = {
    used_prompt: 0,
    used_completion: 0,
    used_total: 0,
    limit: MAX_TOKENS_PER_RUN,
  };

  console.log(`[compile] domain: ${config.domain}`);

  // Phase 1: 扫描 sources
  console.log('[compile] Phase 1: 扫描 sources/');
  const sources = await scanSources();
  if (sources.length === 0) {
    throw new Error(`sources/ 为空。先跑 npm run pdf-to-md / url-to-md 准备素材。`);
  }
  console.log(`[compile] 找到 ${sources.length} 份 source markdown：${sources.map((s) => s.filename).join(', ')}`);

  // Phase 2: 主题分类
  console.log('[compile] Phase 2: 主题分类（DeepSeek）');
  const { topics, budget: budget2 } = await classifyTopics(sources, config, budget);
  budget = budget2;
  console.log(`[compile] 分出 ${topics.length} 个主题：${topics.map((t) => `${t.slug}(${t.source_files.length})`).join(', ')}`);

  // Phase 3: 主题文章生成
  console.log('[compile] Phase 3: 主题文章生成（DeepSeek 串行）');
  await fs.rm(WIKI_DIR, { recursive: true, force: true });
  await fs.mkdir(TOPICS_DIR, { recursive: true });

  const topicArticles: Array<{ topic: Topic; markdown: string; outPath: string }> = [];
  for (const topic of topics) {
    console.log(`[compile]   编 → ${topic.slug} (${topic.source_files.length} 份素材)`);
    const { markdown, budget: budget3 } = await compileTopicArticle(topic, sources, config, budget);
    budget = budget3;
    const outPath = path.join(TOPICS_DIR, `${topic.slug}.md`);
    await fs.writeFile(outPath, markdown, 'utf-8');
    topicArticles.push({ topic, markdown, outPath });
    console.log(`[compile]     ✓ ${path.relative(WIKI_DIR, outPath)}（${markdown.split('\n').length} 行）`);
  }

  // Phase 4: INDEX.md
  console.log('[compile] Phase 4: INDEX.md');
  await writeIndex(topics, sources, config);

  // Phase 5: 状态 + log
  console.log('[compile] Phase 5: state + log');
  await writeState(topics, sources);
  await appendLog(topics, sources, budget, Date.now() - start);

  // 写编译日志（机器可读）
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const logPath = path.join(REPORTS_DIR, `compile-log-${timestamp()}.json`);
  await fs.writeFile(
    logPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        budget,
        sources: sources.map((s) => ({ filename: s.filename, lines: s.totalLines })),
        topics: topics.map((t) => ({ slug: t.slug, name: t.name, source_files: t.source_files })),
        articles: topicArticles.map((a) => ({ slug: a.topic.slug, lines: a.markdown.split('\n').length })),
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(`[compile] 完成：${topics.length} 主题 / ${sources.length} 素材 / ${budget.used_total} tokens / ${Math.round((Date.now() - start) / 1000)}s`);
  console.log(`[compile] 产物：${path.relative(POC_ROOT, WIKI_DIR)}/`);
  console.log(`[compile] 日志：${path.relative(POC_ROOT, logPath)}`);
}

// === Phase 1 ===

async function scanSources(): Promise<SourceFile[]> {
  const entries = await fs.readdir(SOURCES_DIR, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name);

  const sources: SourceFile[] = [];
  for (const filename of files) {
    const fullPath = path.join(SOURCES_DIR, filename);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');
    // 取首个 # 作为标题（跳过 <!-- L:N --> 注释）
    const titleLine = lines
      .map((l) => l.replace(/<!--\s*L:\d+\s*-->/, '').trim())
      .find((l) => l.startsWith('# '));
    const title = titleLine?.replace(/^#\s+/, '') ?? filename;
    const preview = lines
      .slice(0, 80)
      .map((l) => l.replace(/<!--\s*L:\d+\s*-->/, ''))
      .join('\n')
      .slice(0, 800);
    sources.push({ filename, fullPath, title, preview, content, totalLines: lines.length });
  }
  return sources;
}

// === Phase 2 ===

async function classifyTopics(
  sources: SourceFile[],
  config: Config,
  budget: TokenBudget
): Promise<{ topics: Topic[]; budget: TokenBudget }> {
  const system = await fs.readFile(path.join(PROMPTS_DIR, 'classify-topics.md'), 'utf-8');

  const sourceSummary = sources
    .map(
      (s, i) => `### Source ${i + 1}: \`${s.filename}\`
- 标题: ${s.title}
- 行数: ${s.totalLines}
- 前 800 字预览:
${s.preview}`
    )
    .join('\n\n---\n\n');

  const user = `项目领域：${config.domain}

主题种子词（参考非强制）：${config.topic_hints.join('、')}

待分类素材：

${sourceSummary}

请输出 JSON。`;

  const { content, usage } = await chat({
    system,
    user,
    temperature: config.deepseek.temperature,
    max_tokens: 2000,
    response_format: 'json_object',
  });
  const newBudget = accumulate(budget, usage);
  checkBudget(newBudget);

  let parsed: { topics: Topic[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Phase 2 返回非 JSON：${content.slice(0, 200)}...`);
  }

  if (!parsed.topics || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
    throw new Error(`Phase 2 返回 topics 字段缺失或空：${content}`);
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

// === Phase 3 ===

async function compileTopicArticle(
  topic: Topic,
  allSources: SourceFile[],
  config: Config,
  budget: TokenBudget
): Promise<{ markdown: string; budget: TokenBudget }> {
  const system = await fs.readFile(path.join(PROMPTS_DIR, 'compile-topic-article.md'), 'utf-8');

  const sources = allSources.filter((s) => topic.source_files.includes(s.filename));
  const sourceBodies = sources
    .map(
      (s) => `### \`${s.filename}\` （${s.totalLines} 行，每行已用 \`<!-- L:N -->\` 标注）

${s.content}`
    )
    .join('\n\n---\n\n');

  const sectionsSpec = config.article_sections
    .map((sec) => `- **${sec.name}**${sec.required ? '（必含）' : ''}：${sec.description}`)
    .join('\n');

  const user = `主题：${topic.name}（slug: ${topic.slug}）

主题归属逻辑：${topic.rationale}

article_sections（按此顺序写）：
${sectionsSpec}

source markdown 全文（行号已标注，引用时用 \`文件名:起始行-结束行\`）：

${sourceBodies}

请输出主题文章 markdown（从 \`# ${topic.name}\` 开始），严格遵守 system 中的引用约束。`;

  const { content, usage } = await chat({
    system,
    user,
    temperature: config.deepseek.temperature,
    max_tokens: config.deepseek.max_completion_tokens,
  });
  const newBudget = accumulate(budget, usage);
  checkBudget(newBudget);

  return { markdown: content.trim() + '\n', budget: newBudget };
}

// === Phase 4 ===

async function writeIndex(topics: Topic[], sources: SourceFile[], config: Config): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const lines: string[] = [
    `# ${config.name} 政策知识库`,
    '',
    `> 领域：${config.domain}`,
    `> 编译时间：${today}`,
    `> 主题数：${topics.length}　|　素材数：${sources.length}`,
    '',
    '## 主题',
    '',
    '| 主题 | 素材数 | 链接 |',
    '|---|---|---|',
    ...topics.map(
      (t) => `| ${t.name} | ${t.source_files.length} | [topics/${t.slug}.md](topics/${t.slug}.md) |`
    ),
    '',
    '## 素材清单',
    '',
    ...sources.map((s) => `- \`sources/${s.filename}\` — ${s.title} (${s.totalLines} 行)`),
    '',
    '## 使用说明',
    '',
    '- 每篇主题文章末尾的「## 出处」段列出了具体引用的 source 文件 + 行号',
    '- 评估请跑 `npm run evaluate`，会随机抽样 5+5 条供肉眼校对',
    '',
  ];

  await fs.writeFile(path.join(WIKI_DIR, 'INDEX.md'), lines.join('\n'), 'utf-8');
}

// === Phase 5 ===

async function writeState(topics: Topic[], sources: SourceFile[]): Promise<void> {
  const state = {
    last_compiled: new Date().toISOString(),
    topics: topics.map((t) => ({ slug: t.slug, name: t.name, source_count: t.source_files.length })),
    sources: sources.map((s) => ({ filename: s.filename, lines: s.totalLines })),
  };
  await fs.writeFile(path.join(WIKI_DIR, '.compile-state.json'), JSON.stringify(state, null, 2), 'utf-8');
}

async function appendLog(
  topics: Topic[],
  sources: SourceFile[],
  budget: TokenBudget,
  elapsedMs: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const entry = `## ${today}

- **主题更新**：${topics.map((t) => t.slug).join(', ')}
- **素材数**：${sources.length}
- **token 总用量**：${budget.used_total}
- **耗时**：${Math.round(elapsedMs / 1000)}s

`;
  const logPath = path.join(WIKI_DIR, 'log.md');
  let existing = '';
  try {
    existing = await fs.readFile(logPath, 'utf-8');
  } catch {
    existing = '# 编译日志\n\n';
  }
  await fs.writeFile(logPath, existing + entry, 'utf-8');
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}
