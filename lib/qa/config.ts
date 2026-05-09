/**
 * QA 模块运行时常量。仅纯常量，无副作用。
 * 来源：02-CONTEXT.md D-09 / D-10 / D-11 / D-12
 * 不在本模块的事：Prisma 调用 / fs / LLM call —— 那些写在 lib/qa/*.ts 各自模块。
 */

export const QA_CONFIG = {
  RETRIEVAL_THRESHOLD: 0.1,       // D-09: pg_trgm word_similarity 低于此值进 miss（autoplan B1: 0.3→0.1）
  MAX_ANSWER_CHARS: 1000,         // D-10: 中文字符上限
  RETRY_LINK_WHITELIST_TIMES: 1,  // D-12: 引用白名单失败重试次数
  TOP_K: 3,                       // D-08: 检索返回 top-3
} as const;

export const FALLBACK_PHRASE_MISS = `未在本系统知识库中匹配到相关政策。
建议联系黄浦区社保局窗口确认：
- 地址：上海市黄浦区中山南一路 555 号
- 电话：63011095
- 办事大厅：周一至周五 9:00-17:00`;

export const FALLBACK_PHRASE_PARTIAL_PREFIX = `以下信息有待与窗口确认：`;
