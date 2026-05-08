/**
 * URL → markdown
 *
 * 简单 fetch + HTML 清洗：抽出 <article> / <main> / 主体内容 → 转 markdown 风格
 * 不依赖 puppeteer（W0 PoC 不为反爬付出代价）。
 *
 * Usage:
 *   npm run url-to-md -- "https://www.shanghai.gov.cn/xxx" --slug=zhengce-1
 *   npm run url-to-md -- "https://..." # 自动从 URL 推 slug
 */

import '../lib/env.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const POC_ROOT = path.resolve(import.meta.dirname, '..');
const SOURCES_DIR = path.join(POC_ROOT, 'sources');

const args = process.argv.slice(2);
const urlArg = args.find((a) => !a.startsWith('--'));
const slugArg = args.find((a) => a.startsWith('--slug='))?.split('=')[1];

if (!urlArg) {
  console.error('Usage: npm run url-to-md -- <url> [--slug=name]');
  process.exit(1);
}

const url: string = urlArg;

main().catch((err) => {
  console.error('[url-to-md] 失败：', err.message);
  process.exit(1);
});

async function main() {
  console.log(`[url-to-md] fetching: ${url}`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; sbj-website-w0-poc/0.1)',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  console.log(`[url-to-md] fetched: ${html.length} bytes`);

  const cleaned = htmlToMarkdown(html);
  const slug = slugArg ?? slugFromUrl(url);
  const outPath = path.join(SOURCES_DIR, `${slug}.md`);

  const annotated = annotateLineNumbers(
    [
      `<!-- source: ${url} -->`,
      `<!-- fetched: ${new Date().toISOString()} -->`,
      '',
      cleaned,
    ].join('\n')
  );

  await fs.mkdir(SOURCES_DIR, { recursive: true });
  await fs.writeFile(outPath, annotated, 'utf-8');
  console.log(`[url-to-md] 完成 → ${outPath}（${annotated.split('\n').length} 行）`);
  console.log(`[url-to-md] 提示：粗略清洗后请人工检查 ${outPath} 是否含导航/页脚噪声，需要时手动删除`);
}

function htmlToMarkdown(html: string): string {
  // 极简清洗：移除 script/style/nav/footer/aside；提取 article/main 优先；保留段落和标题
  let s = html;

  // 移除明显噪声标签
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
  s = s.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '');
  s = s.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
  s = s.replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, '');
  s = s.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');

  // 优先取 <article> 或 <main> 中的内容
  const articleMatch = s.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = s.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = s.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const inner = articleMatch?.[1] ?? mainMatch?.[1] ?? bodyMatch?.[1] ?? s;

  // 转换主要标签
  let md = inner
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')
    .replace(/<h5\b[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n')
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // 兜底：剥离剩余标签
  md = md.replace(/<\/?[a-z][a-z0-9-]*\b[^>]*>/gi, '');

  // HTML entity 解码（最常见的几个）
  md = md
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

  // 多余空行收敛
  md = md.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  return md;
}

function slugFromUrl(u: string): string {
  try {
    const url = new URL(u);
    const last = url.pathname.split('/').filter(Boolean).pop() ?? 'page';
    return last.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]/gi, '-').toLowerCase().slice(0, 50) || 'page';
  } catch {
    return 'page-' + Date.now();
  }
}

function annotateLineNumbers(md: string): string {
  return md
    .split('\n')
    .map((line, i) => `<!-- L:${i + 1} -->${line}`)
    .join('\n');
}
