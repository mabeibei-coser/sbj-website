/**
 * lib/llm-client.ts 单元测试 (T4 / INF-03)
 *
 * 覆盖控制流: 主成功 / 主失败回退 / 全失败抛首因 / 无 vendor 配置
 * 不真调任何真实 LLM API；vendor adapter + audit 都 mock。
 */

import { describe, expect, it, beforeEach, vi } from "vitest";

// 必须在 import llm-client 之前 mock 依赖
vi.mock("@/lib/llm-vendors/deepseek", () => ({
  getDeepseekClient: vi.fn(),
  estimateDeepseekCost: vi.fn(() => 1),
}));
vi.mock("@/lib/llm-vendors/doubao", () => ({
  getDoubaoClient: vi.fn(),
  estimateDoubaoCost: vi.fn(() => 2),
}));
vi.mock("@/lib/llm-vendors/iflytek", () => ({
  getIflytekClient: vi.fn(),
  estimateIflytekCost: vi.fn(() => 3),
}));
vi.mock("@/lib/audit", () => ({
  logLlmCall: vi.fn(async () => undefined),
  hashPrompt: vi.fn(() => "fakehash"),
}));

import { callLlm } from "@/lib/llm-client";
import { getDeepseekClient } from "@/lib/llm-vendors/deepseek";
import { getDoubaoClient } from "@/lib/llm-vendors/doubao";
import { getIflytekClient } from "@/lib/llm-vendors/iflytek";
import { logLlmCall } from "@/lib/audit";

interface MockClient {
  chat: { completions: { create: ReturnType<typeof vi.fn> } };
}

function makeMockClient(opts: {
  responseContent?: string;
  shouldThrow?: Error;
  tokensIn?: number;
  tokensOut?: number;
}): MockClient {
  const create = vi.fn(async () => {
    if (opts.shouldThrow) throw opts.shouldThrow;
    return {
      choices: [{ message: { content: opts.responseContent ?? "" } }],
      usage: {
        prompt_tokens: opts.tokensIn ?? 10,
        completion_tokens: opts.tokensOut ?? 20,
      },
    };
  });
  return { chat: { completions: { create } } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("callLlm fallback chain", () => {
  it("DeepSeek 主成功，不走 fallback", async () => {
    vi.mocked(getDeepseekClient).mockReturnValue({
      client: makeMockClient({ responseContent: "hello from deepseek" }) as never,
      model: "deepseek-chat",
    });
    vi.mocked(getDoubaoClient).mockReturnValue(null);
    vi.mocked(getIflytekClient).mockReturnValue(null);

    const result = await callLlm({
      systemPrompt: "你是测试助手",
      userPrompt: "say hello",
      caller: "test.smoke",
    });

    expect(result.data).toBe("hello from deepseek");
    expect(result.vendor).toBe("deepseek");
    expect(result.isFallback).toBe(false);
    expect(result.tokensIn).toBe(10);
    expect(result.tokensOut).toBe(20);

    // 审计写入 1 次 success
    expect(logLlmCall).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logLlmCall).mock.calls[0][0]).toMatchObject({
      vendor: "deepseek",
      status: "success",
      isFallback: false,
    });
  });

  it("DeepSeek 失败 → 自动切豆包成功", async () => {
    vi.mocked(getDeepseekClient).mockReturnValue({
      client: makeMockClient({ shouldThrow: new Error("deepseek 429 rate limit") }) as never,
      model: "deepseek-chat",
    });
    vi.mocked(getDoubaoClient).mockReturnValue({
      client: makeMockClient({ responseContent: "hello from doubao" }) as never,
      model: "doubao-pro-32k",
    });
    vi.mocked(getIflytekClient).mockReturnValue(null);

    const result = await callLlm({
      systemPrompt: "test",
      userPrompt: "ping",
      caller: "test.fallback",
    });

    expect(result.vendor).toBe("doubao");
    expect(result.isFallback).toBe(true);
    expect(result.data).toBe("hello from doubao");

    // 审计写入 2 次: 1 fail + 1 success
    expect(logLlmCall).toHaveBeenCalledTimes(2);
    expect(vi.mocked(logLlmCall).mock.calls[0][0]).toMatchObject({
      vendor: "deepseek",
      status: "failed",
    });
    expect(vi.mocked(logLlmCall).mock.calls[1][0]).toMatchObject({
      vendor: "doubao",
      status: "success",
      isFallback: true,
    });
  });

  it("DeepSeek + 豆包都失败 → 切讯飞成功", async () => {
    vi.mocked(getDeepseekClient).mockReturnValue({
      client: makeMockClient({ shouldThrow: new Error("deepseek down") }) as never,
      model: "deepseek-chat",
    });
    vi.mocked(getDoubaoClient).mockReturnValue({
      client: makeMockClient({ shouldThrow: new Error("doubao down") }) as never,
      model: "doubao-pro-32k",
    });
    vi.mocked(getIflytekClient).mockReturnValue({
      client: makeMockClient({ responseContent: "hello from iflytek" }) as never,
      model: "4.0Ultra",
    });

    const result = await callLlm({
      systemPrompt: "test",
      userPrompt: "ping",
      caller: "test.deep-fallback",
    });

    expect(result.vendor).toBe("iflytek");
    expect(result.isFallback).toBe(true);
    expect(logLlmCall).toHaveBeenCalledTimes(3);
  });

  it("三家都失败 → 抛首因 (DeepSeek 错误)", async () => {
    vi.mocked(getDeepseekClient).mockReturnValue({
      client: makeMockClient({ shouldThrow: new Error("DEEPSEEK_PRIMARY_ERROR") }) as never,
      model: "deepseek-chat",
    });
    vi.mocked(getDoubaoClient).mockReturnValue({
      client: makeMockClient({ shouldThrow: new Error("doubao err") }) as never,
      model: "m",
    });
    vi.mocked(getIflytekClient).mockReturnValue({
      client: makeMockClient({ shouldThrow: new Error("iflytek err") }) as never,
      model: "m",
    });

    await expect(
      callLlm({ systemPrompt: "x", userPrompt: "x", caller: "test.all-fail" })
    ).rejects.toThrow("DEEPSEEK_PRIMARY_ERROR");

    expect(logLlmCall).toHaveBeenCalledTimes(3);
  });

  it("无 vendor 配置 → 抛 '无可用 LLM vendor'", async () => {
    vi.mocked(getDeepseekClient).mockReturnValue(null);
    vi.mocked(getDoubaoClient).mockReturnValue(null);
    vi.mocked(getIflytekClient).mockReturnValue(null);

    await expect(
      callLlm({ systemPrompt: "x", userPrompt: "x", caller: "test.no-vendor" })
    ).rejects.toThrow(/无可用 LLM vendor/);
    expect(logLlmCall).not.toHaveBeenCalled();
  });

  it("primaryVendor=doubao 时优先调豆包，DeepSeek 不调", async () => {
    vi.mocked(getDeepseekClient).mockReturnValue({
      client: makeMockClient({ responseContent: "deepseek" }) as never,
      model: "m",
    });
    vi.mocked(getDoubaoClient).mockReturnValue({
      client: makeMockClient({ responseContent: "doubao primary" }) as never,
      model: "doubao-m",
    });
    vi.mocked(getIflytekClient).mockReturnValue(null);

    const result = await callLlm({
      systemPrompt: "x",
      userPrompt: "x",
      caller: "test.primary-doubao",
      primaryVendor: "doubao",
    });

    expect(result.vendor).toBe("doubao");
    expect(result.isFallback).toBe(false);
  });

  it("validator 返回非 null 时触发 fallback", async () => {
    vi.mocked(getDeepseekClient).mockReturnValue({
      client: makeMockClient({ responseContent: "INVALID OUTPUT" }) as never,
      model: "m",
    });
    vi.mocked(getDoubaoClient).mockReturnValue({
      client: makeMockClient({ responseContent: "valid output" }) as never,
      model: "m",
    });
    vi.mocked(getIflytekClient).mockReturnValue(null);

    const result = await callLlm({
      systemPrompt: "x",
      userPrompt: "x",
      caller: "test.validator",
      validator: (raw) => (raw.includes("INVALID") ? "包含禁词" : null),
    });

    expect(result.vendor).toBe("doubao");
    expect(result.data).toBe("valid output");
  });

  it("parser 把 raw string 转成自定义类型", async () => {
    vi.mocked(getDeepseekClient).mockReturnValue({
      client: makeMockClient({ responseContent: '{"answer":42}' }) as never,
      model: "m",
    });
    vi.mocked(getDoubaoClient).mockReturnValue(null);
    vi.mocked(getIflytekClient).mockReturnValue(null);

    const result = await callLlm<{ answer: number }>({
      systemPrompt: "x",
      userPrompt: "x",
      caller: "test.parser",
      parser: (raw) => JSON.parse(raw),
    });

    expect(result.data).toEqual({ answer: 42 });
  });

  it("jsonMode 注入 response_format 和 system 前缀", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: '{"x":1}' } }],
      usage: { prompt_tokens: 5, completion_tokens: 5 },
    }));
    vi.mocked(getDeepseekClient).mockReturnValue({
      client: { chat: { completions: { create } } } as never,
      model: "m",
    });
    vi.mocked(getDoubaoClient).mockReturnValue(null);
    vi.mocked(getIflytekClient).mockReturnValue(null);

    await callLlm({
      systemPrompt: "原始 system",
      userPrompt: "x",
      caller: "test.json-mode",
      jsonMode: true,
    });

    expect(create).toHaveBeenCalledTimes(1);
    const callArgs = create.mock.calls[0][0] as {
      messages: { role: string; content: string }[];
      response_format?: { type: string };
    };
    expect(callArgs.response_format).toEqual({ type: "json_object" });
    expect(callArgs.messages[0].content).toContain("【输出约束 · 必须严格遵守】");
    expect(callArgs.messages[0].content).toContain("原始 system");
  });
});
