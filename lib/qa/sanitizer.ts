/**
 * 用户输入护栏（D-13）：
 * 1) 预过滤典型 jailbreak 关键词 → 命中触发 miss 兜底，不调 LLM
 * 2) wrapQuestionXml: 把用户输入用 <user_question> 包裹，转义 & < > 防 closing tag injection
 * 3) truncateAnswerToLimit: 1000 字硬截断（D-10），按完整句号回退
 *
 * 不在本模块的事：LLM 调用 / DB 访问 —— 纯字符串处理，无副作用。
 */

const INJECTION_PATTERNS: ReadonlyArray<RegExp> = [
  /忽略.{0,4}(上述|前面|之前|以上).{0,4}指令/i,
  /(?:^|\s)(你|now)\s*(是|为|are|act\s+as)\s*(DAN|jailbreak|admin|root|管理员)/i,
  /^\s*system\s*[:：]/im,
  /pretend\s+(you\s+are|to\s+be)/i,
  /ignore\s+(?:all\s+)?previous\s+(?:instructions?|prompts?)/i,
  /你\s*现在\s*是\s*(DAN|jailbreak|admin)/i,
] as const;

export function detectPromptInjection(question: string): { triggered: boolean; pattern?: string } {
  for (const re of INJECTION_PATTERNS) {
    if (re.test(question)) {
      return { triggered: true, pattern: re.source };
    }
  }
  return { triggered: false };
}

export function wrapQuestionXml(question: string): string {
  const escaped = question.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<user_question>${escaped}</user_question>`;
}

const ILIKE_ELLIPSIS = "...（受字数限制，详见原文链接）";

export function truncateAnswerToLimit(answer: string, max = 1000): string {
  if (answer.length <= max) return answer;
  const truncated = answer.slice(0, max);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf("。"),
    truncated.lastIndexOf("！"),
    truncated.lastIndexOf("？"),
    truncated.lastIndexOf(".")
  );
  const cut = lastSentenceEnd > max * 0.5 ? lastSentenceEnd + 1 : max;
  return truncated.slice(0, cut) + ILIKE_ELLIPSIS;
}
