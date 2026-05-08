#!/usr/bin/env tsx
/**
 * URL → markdown（端到端，专为微信公众号文章设计）
 *
 * 套路：
 * 1. fetch 用桌面 Chrome UA + Referer 绕过 mp.weixin.qq.com 反爬
 *    （参考 ~/.claude/skills/wechat-article-fetch-ua-bypass）
 * 2. 在 HTML 转 markdown 之前先清洗：
 *    - 删头图块 / 二维码 / 关注公众号卡 / 底部推荐 / script / style
 *    - 微信图片懒加载 src 从 data-src 提取到 src
 * 3. 输出顶部 YAML frontmatter（sourceUrl / fetchedAt / title / kbType）+ markdown body，
 *    文件名 <slugFromTitle>-<YYYY-MM-DD>.md，目录 knowledge/policy-sources/wechat-archives/
 *
 * Usage:
 *   npm run wiki:url-to-md -- "https://mp.weixin.qq.com/s/xxx"
 *   npm run wiki:url-to-md -- "url1" "url2" --output=knowledge/policy-sources/wechat-archives --kb=policy
 */
// 优先加载 .env.local（与 Next.js 行为一致），再 fallback 到 .env
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });
loadDotenv({ path: ".env" });
import fs from "node:fs/promises";
import path from "node:path";

// 微信文章反爬绕过：桌面 Chrome 124 UA 通常够，遇到拦截升级到微信内置 MicroMessenger UA。
// （参考 ~/.claude/skills/wechat-article-fetch-ua-bypass）
const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const WECHAT_INAPP_UA =
  "Mozilla/5.0 (Linux; Android 10; PCT-AL10 Build/HUAWEIPCT-AL10) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.127 Mobile Safari/537.36 NetType/WIFI Language/zh_CN MicroMessenger/8.0.42.2460(0x28002A30) WeChat/arm64 Weixin GPVersion/1 NetType/WIFI";

// fetch UA 优先级：默认走桌面 Chrome；如响应被拦截，升级到 MicroMessenger 重试
const UA_FALLBACKS: string[] = [DEFAULT_UA, WECHAT_INAPP_UA];

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const urls = args.filter((a) => !a.startsWith("--"));
const outputArg = flags.find((a) => a.startsWith("--output="))?.split("=")[1];
const kbArg = (flags.find((a) => a.startsWith("--kb="))?.split("=")[1] ?? "policy") as
  | "policy"
  | "biz";

const OUTPUT_DIR = outputArg
  ? path.resolve(process.cwd(), outputArg)
  : path.join(process.cwd(), "knowledge", "policy-sources", "wechat-archives");

if (urls.length === 0) {
  console.error(
    "Usage: tsx scripts/wiki/url-to-md.ts <url1> [<url2> ...] [--output=<dir>] [--kb=policy|biz]"
  );
  process.exit(1);
}

if (!["policy", "biz"].includes(kbArg)) {
  console.error(`--kb 必须是 policy 或 biz，收到：${kbArg}`);
  process.exit(1);
}

// 简单 cookie jar：fetch 时收集 set-cookie，下次请求带回
const cookieJar = new Map<string, string>();

main().catch((err) => {
  console.error("[url-to-md] 失败：", err instanceof Error ? err.message : err);
  process.exit(1);
});

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`[url-to-md] output dir: ${OUTPUT_DIR}`);
  console.log(`[url-to-md] kbType: ${kbArg}`);
  console.log(`[url-to-md] urls: ${urls.length}`);

  for (const url of urls) {
    try {
      await fetchOne(url);
    } catch (err) {
      console.error(`[url-to-md] FAIL ${url}:`, err instanceof Error ? err.message : err);
    }
  }
}

async function fetchOne(url: string): Promise<void> {
  console.log(`[url-to-md] fetching: ${url}`);
  const html = await fetchWithUaBypass(url);
  console.log(`[url-to-md] fetched: ${html.length} bytes`);

  // 微信文章的主体 HTML 在 id="js_content" 中。如果定位不到，认为 UA 被拦截或 URL 失效。
  const isWechat = /mp\.weixin\.qq\.com/i.test(url);
  if (isWechat && !html.includes('id="js_content"')) {
    throw new Error(
      "微信文章内容定位不到（缺 id=\"js_content\"），可能 UA 被拦截或 URL 失效"
    );
  }

  const title = extractTitle(html);
  const cleanedHtml = cleanWechatHtml(html);
  const md = htmlToMarkdown(cleanedHtml);

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const slug = slugify(title) || slugFromUrl(url);
  const filename = `${slug}-${date}.md`;
  const outPath = path.join(OUTPUT_DIR, filename);

  const fetchedAt = new Date().toISOString();
  const front = [
    "---",
    `sourceUrl: ${url}`,
    `fetchedAt: ${fetchedAt}`,
    `title: ${title.replace(/\n/g, " ").trim()}`,
    `kbType: ${kbArg}`,
    "---",
    "",
    `# ${title.trim()}`,
    "",
    md.trim(),
    "",
  ].join("\n");

  await fs.writeFile(outPath, front, "utf-8");
  console.log(`[url-to-md] OK → ${outPath} (${front.split("\n").length} 行)`);
}

/**
 * fetch + 桌面 UA + Referer + 简单 cookie jar；遇到 set-cookie 收集，下一次回带。
 * 拦截时升级到 MicroMessenger UA 重试一次（D-16 + skill `wechat-article-fetch-ua-bypass`）。
 */
async function fetchWithUaBypass(url: string): Promise<string> {
  let lastErr: unknown = null;
  for (let i = 0; i < UA_FALLBACKS.length; i++) {
    const ua = UA_FALLBACKS[i];
    try {
      return await fetchOnceWithUa(url, ua);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[url-to-md] UA #${i + 1} ${ua.includes("MicroMessenger") ? "(MicroMessenger)" : "(Chrome)"} 失败：${msg}`
      );
      // 仅在拦截 / 403 / 412 等情况下尝试下一个 UA；明确网络错则直接抛
      if (i === UA_FALLBACKS.length - 1) break;
      continue;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("fetch 全部 UA 都失败");
}

async function fetchOnceWithUa(url: string, ua: string): Promise<string> {
  const headers: Record<string, string> = {
    "User-Agent": ua,
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    Referer: /mp\.weixin\.qq\.com/i.test(url)
      ? "https://mp.weixin.qq.com/"
      : new URL(url).origin + "/",
  };
  // 把 cookieJar 拼成 Cookie header 回带
  if (cookieJar.size > 0) {
    headers.Cookie = Array.from(cookieJar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  // 收集 set-cookie
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    for (const part of setCookie.split(/,(?=[^;]+=)/)) {
      const [kv] = part.split(";");
      if (kv) {
        const idx = kv.indexOf("=");
        if (idx > 0) cookieJar.set(kv.slice(0, idx).trim(), kv.slice(idx + 1).trim());
      }
    }
  }

  const html = await res.text();
  // 兜底拦截标志
  if (/环境异常/.test(html) || /请稍后再试/.test(html)) {
    throw new Error("响应含 '环境异常 / 请稍后再试'，UA 可能被升级拦截");
  }
  return html;
}

/**
 * 微信公众号 HTML 清洗（D-16）：
 * - 删 <script> <style> <noscript>
 * - 删头图块 rich_media_thumb_wrp
 * - 删二维码图片 img.qr_code 和二维码 section
 * - 删 "关注公众号" 卡（135editor + 关注 文本）
 * - 删底部推荐 rich_media_area_extra
 * - 微信图片懒加载：data-src 提取到 src
 */
function cleanWechatHtml(html: string): string {
  let s = html;

  // 删 script / style / noscript
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");

  // 头图块（顶部封面）
  s = s.replace(/<div\b[^>]*class="[^"]*rich_media_thumb_wrp[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");

  // 二维码 img / section（包含 qrcode / qr_code）
  s = s.replace(/<img\b[^>]*class="[^"]*qr_code[^"]*"[^>]*>/gi, "");
  s = s.replace(/<img\b[^>]*data-type="qrcode"[^>]*>/gi, "");
  s = s.replace(
    /<section\b[^>]*data-tools="[^"]*qrcode[^"]*"[^>]*>[\s\S]*?<\/section>/gi,
    ""
  );

  // 135editor 关注卡（含 "关注" 字样的 section）
  s = s.replace(/<section\b[^>]*data-tools="135editor"[^>]*>([\s\S]*?)<\/section>/gi, (m, inner) =>
    /关注/.test(inner) ? "" : m
  );

  // 底部推荐
  s = s.replace(
    /<div\b[^>]*class="[^"]*rich_media_area_extra[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ""
  );

  // 微信图片懒加载：data-src → src（替换或追加）
  s = s.replace(
    /<img\b([^>]*?)\sdata-src="([^"]+)"([^>]*)>/gi,
    (_m, before, src, after) => `<img${before} src="${src}"${after}>`
  );

  return s;
}

/**
 * 简化版 HTML → markdown。优先取 id="js_content" / <article> / <main>，
 * 然后转换主要标签 + 兜底剥离。
 */
function htmlToMarkdown(html: string): string {
  let s = html;

  // 取 js_content（微信主体）→ article → main → body 兜底
  const jsContent = s.match(/<div\b[^>]*id="js_content"[^>]*>([\s\S]*?)<\/div>/i);
  const articleMatch = s.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = s.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = s.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const inner =
    jsContent?.[1] ?? articleMatch?.[1] ?? mainMatch?.[1] ?? bodyMatch?.[1] ?? s;

  // 删 nav / footer / aside / header（微信里基本没有，但兜底）
  let body = inner
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // 转换主要标签
  body = body
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n")
    .replace(/<h5\b[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n")
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<img\b[^>]*?src="([^"]*)"[^>]*>/gi, "![]($1)");

  // 兜底剥离剩余标签
  body = body.replace(/<\/?[a-z][a-z0-9-]*\b[^>]*>/gi, "");

  // HTML entity 解码
  body = body
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

  // 多余空行收敛
  body = body.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  return body;
}

/**
 * 从 HTML 抽 h1 / og:title / <title> 三档兜底。
 */
function extractTitle(html: string): string {
  // 1. 微信 og:title
  const og = html.match(/<meta\b[^>]*property="og:title"[^>]*content="([^"]+)"/i);
  if (og?.[1]) return decodeEntities(og[1]).trim();
  // 2. js_content 内首个 h1
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1?.[1]) return stripTags(h1[1]).trim();
  // 3. <title>
  const t = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (t?.[1]) return stripTags(t[1]).trim();
  return "untitled";
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, ""));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * 标题 → slug：取前 32 字符，去掉非字母数字中划线，多余空格转 -
 */
function slugify(title: string): string {
  const t = (title || "").trim().slice(0, 32);
  return t
    .replace(/[\s　]+/g, "-")
    .replace(/[^\w一-龥-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function slugFromUrl(u: string): string {
  try {
    const url = new URL(u);
    const last = url.pathname.split("/").filter(Boolean).pop() ?? "page";
    return (
      last
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9-]/gi, "-")
        .toLowerCase()
        .slice(0, 50) || "page"
    );
  } catch {
    return "page-" + Date.now();
  }
}
