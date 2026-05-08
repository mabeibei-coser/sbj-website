import './env.js';
import OpenAI from 'openai';

const apiKey = process.env.DEEPSEEK_API_KEY;
const baseURL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1';
const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

if (!apiKey) {
  throw new Error('DEEPSEEK_API_KEY 未设置。把 .env.example 拷为 .env.local 并填入 key。');
}

export const deepseek = new OpenAI({ apiKey, baseURL });

export const DEEPSEEK_MODEL = model;

export interface ChatOptions {
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: 'text' | 'json_object';
}

export async function chat(opts: ChatOptions): Promise<{ content: string; usage: OpenAI.CompletionUsage | undefined }> {
  const response = await deepseek.chat.completions.create({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    temperature: opts.temperature ?? 0.1,
    max_tokens: opts.max_tokens ?? 4000,
    response_format: opts.response_format === 'json_object' ? { type: 'json_object' } : undefined,
  });

  const choice = response.choices[0];
  if (!choice?.message?.content) {
    throw new Error('DeepSeek 返回空 content');
  }

  return {
    content: choice.message.content,
    usage: response.usage,
  };
}

export interface TokenBudget {
  used_prompt: number;
  used_completion: number;
  used_total: number;
  limit: number;
}

export function checkBudget(budget: TokenBudget): void {
  if (budget.used_total > budget.limit) {
    throw new Error(
      `Token 预算超限：已用 ${budget.used_total} / 上限 ${budget.limit}。` +
      `MAX_TOKENS_PER_RUN 在 .env.local 调整。`
    );
  }
}

export function accumulate(budget: TokenBudget, usage: OpenAI.CompletionUsage | undefined): TokenBudget {
  if (!usage) return budget;
  return {
    ...budget,
    used_prompt: budget.used_prompt + (usage.prompt_tokens ?? 0),
    used_completion: budget.used_completion + (usage.completion_tokens ?? 0),
    used_total: budget.used_total + (usage.total_tokens ?? 0),
  };
}
