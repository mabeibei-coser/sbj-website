/**
 * lib/audit.ts 单元测试 (T5 / INF-05)
 *
 * 仅测纯函数 (hashPrompt / extractRequestMeta)。
 * logAudit/logLlmCall/logConsent 需要真实 DB，留到集成测试 (T11 + Postgres docker up)。
 */

import { describe, expect, it } from "vitest";
import { hashPrompt, extractRequestMeta } from "@/lib/audit";

describe("hashPrompt", () => {
  it("相同输入相同输出", () => {
    expect(hashPrompt("system", "user")).toBe(hashPrompt("system", "user"));
  });

  it("system 和 user 字段不可互换 (有分隔符)", () => {
    // "ab" + "c" 和 "a" + "bc" 应该 hash 不同 (分隔符空格防歧义)
    expect(hashPrompt("ab", "c")).not.toBe(hashPrompt("a", "bc"));
  });

  it("输出 32 hex 字符", () => {
    const hash = hashPrompt("hello", "world");
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe("extractRequestMeta", () => {
  function mockReq(headers: Record<string, string>) {
    return {
      headers: {
        get: (key: string) => headers[key.toLowerCase()] ?? null,
      },
    } as Parameters<typeof extractRequestMeta>[0];
  }

  it("X-Forwarded-For 优先", () => {
    const meta = extractRequestMeta(
      mockReq({
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
        "x-real-ip": "9.9.9.9",
        "user-agent": "Mozilla/Test",
      })
    );
    expect(meta.ip).toBe("1.2.3.4");
    expect(meta.userAgent).toBe("Mozilla/Test");
  });

  it("X-Real-IP 回退", () => {
    const meta = extractRequestMeta(mockReq({ "x-real-ip": "9.9.9.9" }));
    expect(meta.ip).toBe("9.9.9.9");
  });

  it("无 IP 头返回 null", () => {
    const meta = extractRequestMeta(mockReq({}));
    expect(meta.ip).toBeNull();
    expect(meta.userAgent).toBeNull();
  });

  it("XFF 多 IP 取第一个 (最近代理前的客户端)", () => {
    const meta = extractRequestMeta(mockReq({ "x-forwarded-for": "10.0.0.1" }));
    expect(meta.ip).toBe("10.0.0.1");
  });
});
