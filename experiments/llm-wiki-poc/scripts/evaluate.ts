/**
 * 评估脚本：输出 D1（中文政策准确性）+ D2（引用回链正确性）的抽样供肉眼校对。
 *
 * D3（编译速度）+ D4（增量编译）按用户决策跳过。
 *
 * 流程：
 *   1. 读 wiki/topics/*.md，找出所有引用 `文件名:N-M`
 *   2. D1 抽样：从每篇主题文章中随机挑 5 段含具体事实（金额/年限/地址）的语句，列出
 *   3. D2 抽样：随机挑 5 条引用，输出对应的 source 行号区间内容，让用户对比
 *   4. 输出 EVAL.md 模板（用户填 0/1，然后跑 evaluate-score.ts 算加权 — 但 W0 PoC 直接手算）
 *
 * Usage: npm run evaluate
 */

import '../lib/env.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const POC_ROOT = path.resolve(import.meta.dirname, '..');
const SOURCES_DIR = path.join(POC_ROOT, 'sources');
const WIKI_DIR = path.join(POC_ROOT, 'wiki');
const TOPICS_DIR = path.join(WIKI_DIR, 'topics');
const REPORTS_DIR = path.join(POC_ROOT, 'reports');

const D1_SAMPLE_COUNT = 5;
const D2_SAMPLE_COUNT = 5;

main().catch((err) => {
  console.error('[evaluate] 失败：', err.message);
  process.exit(1);
});

async function main() {
  const topics = await readTopicArticles();
  if (topics.length === 0) {
    throw new Error('wiki/topics/ 为空。先跑 npm run compile。');
  }
  const sources = await readSourceFiles();
  console.log(`[evaluate] 读到 ${topics.length} 篇主题文章 / ${sources.size} 份 source`);

  // D1 抽样：含具体事实的语句
  const d1Samples = sampleD1(topics, D1_SAMPLE_COUNT);
  console.log(`[evaluate] D1 抽样：${d1Samples.length} 条 (期望 ${D1_SAMPLE_COUNT})`);

  // D2 抽样：随机引用
  const d2Samples = sampleD2(topics, sources, D2_SAMPLE_COUNT);
  console.log(`[evaluate] D2 抽样：${d2Samples.length} 条 (期望 ${D2_SAMPLE_COUNT})`);

  // 输出 EVAL.md 模板
  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const reportPath = path.join(REPORTS_DIR, `EVAL-${ts}.md`);
  const evalPath = path.join(POC_ROOT, 'EVAL.md');

  const evalMd = renderEvalTemplate({ topics, d1Samples, d2Samples });
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(reportPath, evalMd, 'utf-8');
  await fs.writeFile(evalPath, evalMd, 'utf-8');

  console.log(`[evaluate] 模板写入：`);
  console.log(`  - ${path.relative(POC_ROOT, evalPath)} （主报告）`);
  console.log(`  - ${path.relative(POC_ROOT, reportPath)} （时间戳归档）`);
  console.log(`[evaluate] 下一步：人工填表（每条 0 或 1），加权计算总分，写入「结论」段`);
}

interface TopicArticle {
  slug: string;
  filename: string;
  content: string;
  lines: string[];
}

interface CitationRef {
  raw: string;
  source: string;
  startLine: number;
  endLine: number;
  fromTopicSlug: string;
}

async function readTopicArticles(): Promise<TopicArticle[]> {
  const entries = await fs.readdir(TOPICS_DIR, { withFileTypes: true });
  const topics: TopicArticle[] = [];
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.md')) {
      const fullPath = path.join(TOPICS_DIR, e.name);
      const content = await fs.readFile(fullPath, 'utf-8');
      topics.push({
        slug: path.basename(e.name, '.md'),
        filename: e.name,
        content,
        lines: content.split('\n'),
      });
    }
  }
  return topics;
}

async function readSourceFiles(): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  const entries = await fs.readdir(SOURCES_DIR, { withFileTypes: true });
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.md')) {
      const content = await fs.readFile(path.join(SOURCES_DIR, e.name), 'utf-8');
      // 移除 <!-- L:N --> 注释，恢复原始内容（按行索引）
      const lines = content.split('\n').map((l) => l.replace(/^<!--\s*L:\d+\s*-->/, ''));
      map.set(e.name, lines);
    }
  }
  return map;
}

function sampleD1(topics: TopicArticle[], n: number): Array<{ topic: string; text: string; line: number }> {
  // D1：抽含「具体事实」特征的语句（含数字+单位、地址、电话、年限、金额）
  const factPatterns = [
    /\d+\s*(元|万|百|千|亿)/, // 金额
    /\d+\s*(年|月|日|周)/, // 时长
    /\d+\s*(%|％|岁)/, // 比例/年龄
    /\d{2,4}-\d{2,4}-?\d{0,4}/, // 电话号
    /(地址|窗口|大厅)[：:].{5,}/, // 地址
    /原文[：:]/, // 显式 quote
  ];

  const candidates: Array<{ topic: string; text: string; line: number }> = [];
  for (const t of topics) {
    // 找到 ## 出处 / ## Sources 段落的起点，之后的行不参与抽样（那些是引用清单，不是事实陈述）
    const cutoffIdx = t.lines.findIndex((ln) =>
      /^##\s+(出处|Sources|引用)\s*$/i.test(ln.trim())
    );
    const upper = cutoffIdx >= 0 ? cutoffIdx : t.lines.length;
    for (let i = 0; i < upper; i++) {
      const ln = t.lines[i];
      if (!ln) continue;
      const trimmed = ln.trim();
      if (trimmed.length < 15 || trimmed.startsWith('#') || trimmed.startsWith('---')) continue;
      if (factPatterns.some((p) => p.test(trimmed))) {
        candidates.push({ topic: t.slug, text: trimmed, line: i + 1 });
      }
    }
  }

  return shuffle(candidates).slice(0, n);
}

function sampleD2(
  topics: TopicArticle[],
  sources: Map<string, string[]>,
  n: number
): Array<CitationRef & { sourceExcerpt: string }> {
  // D2：从 ## 出处 段抽引用 + 输出对应 source 行号区间内容
  const refRegex = /`([\w\-\.]+\.md):(\d+)(?:-(\d+))?`/g;
  const refs: CitationRef[] = [];
  for (const t of topics) {
    const matches = [...t.content.matchAll(refRegex)];
    for (const m of matches) {
      const source = m[1] ?? '';
      const startLine = Number(m[2]);
      const endLine = m[3] ? Number(m[3]) : startLine;
      refs.push({
        raw: m[0],
        source,
        startLine,
        endLine,
        fromTopicSlug: t.slug,
      });
    }
  }

  return shuffle(refs)
    .slice(0, n)
    .map((ref) => {
      const sourceLines = sources.get(ref.source);
      let excerpt: string;
      if (!sourceLines) {
        excerpt = `[ERROR] source 文件 \`${ref.source}\` 不存在 — 此引用 100% 错误`;
      } else {
        const start = Math.max(0, ref.startLine - 1);
        const end = Math.min(sourceLines.length, ref.endLine);
        if (start >= sourceLines.length || end <= start) {
          excerpt = `[ERROR] 行号 ${ref.startLine}-${ref.endLine} 越界（source 共 ${sourceLines.length} 行）`;
        } else {
          excerpt = sourceLines.slice(start, end).join('\n').trim() || '[空内容]';
        }
      }
      return { ...ref, sourceExcerpt: excerpt };
    });
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function renderEvalTemplate(input: {
  topics: TopicArticle[];
  d1Samples: Array<{ topic: string; text: string; line: number }>;
  d2Samples: Array<CitationRef & { sourceExcerpt: string }>;
}): string {
  const { topics, d1Samples, d2Samples } = input;

  const lines: string[] = [];
  lines.push('# EVAL — W0 LLM Wiki PoC 评估报告');
  lines.push('');
  lines.push(`> 生成时间：${new Date().toISOString()}`);
  lines.push(`> 主题数：${topics.length}（${topics.map((t) => t.slug).join(', ')}）`);
  lines.push(`> 抽样：D1 ${d1Samples.length} 条 / D2 ${d2Samples.length} 条`);
  lines.push(`> 评分维度：D1 中文政策准确性（50%） + D2 引用回链正确性（50%），加权 ≥ 80 即通过`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // D1 段
  lines.push('## D1：中文政策内容准确性');
  lines.push('');
  lines.push('**评分方法**：每条对照 source markdown 看含义是否准确（金额/年限/地址/电话等具体事实是否对得上原文）。');
  lines.push('');
  lines.push('- ✅ 1 分：完全准确（含具体事实，且与原文一致）');
  lines.push('- ❌ 0 分：编造、模糊改写丢失关键事实、或与原文冲突');
  lines.push('');
  lines.push('| # | 主题 | 行号 | 文中表述 | 评分 (0/1) |');
  lines.push('|---|---|---|---|---|');
  d1Samples.forEach((s, i) => {
    const text = s.text.replace(/\|/g, '\\|').slice(0, 200);
    lines.push(`| ${i + 1} | ${s.topic} | L${s.line} | ${text}${s.text.length > 200 ? '…' : ''} |    |`);
  });
  lines.push('');
  lines.push(`**D1 得分**： __ / ${d1Samples.length} → ___ / 100`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // D2 段
  lines.push('## D2：引用回链正确性');
  lines.push('');
  lines.push('**评分方法**：每条引用 `文件名:行号-行号`，对照 source 摘录，看引用是否真实存在且内容相关。');
  lines.push('');
  lines.push('- ✅ 1 分：source 文件存在、行号范围有效、内容与正文中引用之处主题相关');
  lines.push('- ❌ 0 分：source 文件不存在 / 行号越界 / 内容空 / 内容与上下文风马牛不相及');
  lines.push('');
  d2Samples.forEach((s, i) => {
    lines.push(`### 引用 ${i + 1}：来自主题 \`${s.fromTopicSlug}\` 的引用 \`${s.raw}\``);
    lines.push('');
    lines.push(`source 摘录（\`${s.source}\` 行 ${s.startLine}-${s.endLine}）：`);
    lines.push('```');
    lines.push(s.sourceExcerpt.slice(0, 600) + (s.sourceExcerpt.length > 600 ? '\n…[截断]' : ''));
    lines.push('```');
    lines.push('');
    lines.push('**评分（0/1）**：__');
    lines.push('');
    lines.push('---');
    lines.push('');
  });
  lines.push(`**D2 得分**： __ / ${d2Samples.length} → ___ / 100`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 总分
  lines.push('## 总分（加权）');
  lines.push('');
  lines.push('```');
  lines.push('总分 = D1 * 0.5 + D2 * 0.5');
  lines.push('     = ___ * 0.5 + ___ * 0.5');
  lines.push('     = ___ / 100');
  lines.push('```');
  lines.push('');
  lines.push('**通过判定**：≥ 80 → PASS（W2 上线 LLM Wiki 路线）；< 80 → FAIL（看 FALLBACK.md 切 RAG）');
  lines.push('');
  lines.push('## 结论');
  lines.push('');
  lines.push('（用户填）');
  lines.push('');
  lines.push('## 触发 fallback 的硬阈值');
  lines.push('');
  lines.push('- D1 < 60：中文政策内容不准 → 立即切 RAG');
  lines.push('- D2 < 60：引用回链不可靠 → 立即切 RAG（政府场景"答错政策"是 critical 风险）');
  lines.push('- 加权 < 80 但两个维度都 ≥ 60 → 用户决策：调 prompt 重跑 vs 切 RAG');
  lines.push('');
  return lines.join('\n');
}
