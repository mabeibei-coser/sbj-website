/**
 * 引用合法性校验（D-12）。
 * 白名单 = 政府域名（gov.cn / rsj.sh.gov.cn / huangpu.gov.cn / zzjb.rsj.sh.gov.cn）
 *       + 本系统 wiki 路径（/wiki/policy/<slug> 或 /wiki/biz/<slug>，可带 #anchor）。
 * 白名单外的链接由 lib/qa/answer.ts 触发显式第二次 callLlm({ caller: "qa.answer.retry" })，
 * 重试仍非白名单则丢弃 + 整体降级到 partial（D-12）。
 *
 * 不在本模块的事：fetch HTTP / DNS 校验 —— 仅 regex，离线判断。
 */

const URL_WHITELIST: ReadonlyArray<RegExp> = [
  /^https?:\/\/([a-z0-9-]+\.)*gov\.cn(\/|$|\?|#)/i,
  /^https?:\/\/([a-z0-9-]+\.)*rsj\.sh\.gov\.cn(\/|$|\?|#)/i,
  /^https?:\/\/([a-z0-9-]+\.)*huangpu\.gov\.cn(\/|$|\?|#)/i,
  /^https?:\/\/zzjb\.rsj\.sh\.gov\.cn(\/|$|\?|#)/i,
] as const;

const SLUG_WHITELIST = /^\/?wiki\/(policy|biz)\/[a-z0-9-]+(?:#[a-z0-9-]+)?$/i;

export function isAllowedCitation(url: string): boolean {
  if (typeof url !== "string" || url.length === 0) return false;
  const trimmed = url.trim();
  if (SLUG_WHITELIST.test(trimmed)) return true;
  return URL_WHITELIST.some((re) => re.test(trimmed));
}

export function filterCitations(citations: string[]): { kept: string[]; dropped: string[] } {
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const c of citations) {
    (isAllowedCitation(c) ? kept : dropped).push(c);
  }
  return { kept, dropped };
}
