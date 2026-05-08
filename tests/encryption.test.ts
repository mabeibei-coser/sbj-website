/**
 * lib/encryption.ts 单元测试 (T3 / INF-04)
 *
 * Plan 验证项:
 * - 加密后密文 != 明文
 * - 同明文加密两次密文不同 (随机 IV)
 * - 解密回原文
 * - 密文被篡改后解密报错 (GCM authTag)
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  encryptField,
  decryptField,
  hashField,
  __resetEncryptionKeyForTest,
} from "@/lib/encryption";

beforeEach(() => {
  __resetEncryptionKeyForTest();
});

describe("encryptField / decryptField", () => {
  it("密文 != 明文", () => {
    const plaintext = "13800138000";
    const encrypted = encryptField(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
  });

  it("同明文加密两次密文不同 (随机 IV)", () => {
    const plaintext = "13800138000";
    const a = encryptField(plaintext);
    const b = encryptField(plaintext);
    expect(a).not.toBe(b);
  });

  it("解密回原文", () => {
    const plaintext = "13800138000";
    const encrypted = encryptField(plaintext);
    expect(decryptField(encrypted)).toBe(plaintext);
  });

  it("中文字段正常加解密", () => {
    const plaintext = "张三的简历内容：曾任社保局窗口工作人员……";
    const encrypted = encryptField(plaintext);
    expect(decryptField(encrypted)).toBe(plaintext);
  });

  it("空字符串可加解密", () => {
    const encrypted = encryptField("");
    expect(decryptField(encrypted)).toBe("");
  });

  it("篡改 ciphertext 解密报错 (GCM authTag)", () => {
    const encrypted = encryptField("13800138000");
    const parts = encrypted.split(":");
    // 翻转 ciphertext 第一个字符
    const tampered = parts[2].startsWith("A")
      ? "B" + parts[2].slice(1)
      : "A" + parts[2].slice(1);
    const tamperedFull = [parts[0], parts[1], tampered, parts[3]].join(":");
    expect(() => decryptField(tamperedFull)).toThrow();
  });

  it("篡改 authTag 解密报错", () => {
    const encrypted = encryptField("13800138000");
    const parts = encrypted.split(":");
    const tamperedTag = parts[3].startsWith("A")
      ? "B" + parts[3].slice(1)
      : "A" + parts[3].slice(1);
    const tamperedFull = [parts[0], parts[1], parts[2], tamperedTag].join(":");
    expect(() => decryptField(tamperedFull)).toThrow();
  });

  it("格式错误的密文报错", () => {
    expect(() => decryptField("not-a-valid-format")).toThrow(/格式错误/);
    expect(() => decryptField("v1:a:b")).toThrow(/格式错误/);
  });

  it("不支持的版本号报错", () => {
    expect(() => decryptField("v999:a:b:c")).toThrow(/版本/);
  });

  it("非 string 输入抛 TypeError", () => {
    // @ts-expect-error 测试运行时类型检查
    expect(() => encryptField(null)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => decryptField(undefined)).toThrow(TypeError);
  });
});

describe("hashField", () => {
  it("相同输入相同输出", () => {
    expect(hashField("13800138000")).toBe(hashField("13800138000"));
  });

  it("不同输入不同输出", () => {
    expect(hashField("13800138000")).not.toBe(hashField("13800138001"));
  });

  it("输出是 base64 字符串", () => {
    const hash = hashField("13800138000");
    expect(hash).toMatch(/^[A-Za-z0-9+/=]+$/);
    // SHA256 是 32 字节，base64 编码后 44 字符 (含 padding)
    expect(hash.length).toBe(44);
  });

  it("非 string 输入抛 TypeError", () => {
    // @ts-expect-error
    expect(() => hashField(123)).toThrow(TypeError);
  });
});

describe("FIELD_ENCRYPTION_KEY 校验", () => {
  it("缺失 key 报错", () => {
    const original = process.env.FIELD_ENCRYPTION_KEY;
    delete process.env.FIELD_ENCRYPTION_KEY;
    __resetEncryptionKeyForTest();
    try {
      expect(() => encryptField("anything")).toThrow(/未设置/);
    } finally {
      process.env.FIELD_ENCRYPTION_KEY = original;
      __resetEncryptionKeyForTest();
    }
  });

  it("长度错误报错", () => {
    const original = process.env.FIELD_ENCRYPTION_KEY;
    process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(16, 0).toString("base64"); // 仅 16 字节
    __resetEncryptionKeyForTest();
    try {
      expect(() => encryptField("anything")).toThrow(/长度错误/);
    } finally {
      process.env.FIELD_ENCRYPTION_KEY = original;
      __resetEncryptionKeyForTest();
    }
  });
});
