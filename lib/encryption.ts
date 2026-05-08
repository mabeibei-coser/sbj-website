/**
 * 字段加密 (INF-04)
 * AES-256-GCM (Authenticated Encryption with Associated Data)
 *
 * 用法:
 *   const ciphertext = encryptField(phone);  // 写库
 *   const plaintext = decryptField(ciphertext);  // 读库
 *   const hash = hashField(phone);  // 写 phone_hash 列，可索引/可搜索
 *
 * 设计:
 * - 密钥来自 process.env.FIELD_ENCRYPTION_KEY (32 字节 base64)
 * - 启动时校验密钥长度，缺失或长度不对直接 throw
 * - 输出格式: "v1:iv:ciphertext:authTag" (4 段，全部 base64)，v1 为版本前缀供未来轮换
 * - 同明文加密两次密文不同 (随机 IV)
 * - 篡改密文/authTag 会在解密时报错 (GCM 内置完整性校验)
 *
 * 不在本模块的事:
 * - 自动加解密 Prisma 字段 (走 service 层显式调用，避免 Prisma 版本耦合)
 * - 密钥轮换 (v2/v3 前缀预留，需要时再实现)
 *
 * server-only:
 * - 依赖 node:crypto，不允许出现在 client 组件
 */

import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // GCM 推荐 96 bit
const KEY_BYTES = 32; // AES-256

let cachedKey: Buffer | null = null;

/**
 * 加载密钥并校验长度。第一次调用时执行；后续命中缓存。
 * 测试时可以通过 `__resetEncryptionKeyForTest()` 强制重新加载。
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY 未设置。生成: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(raw, "base64");
  } catch {
    throw new Error("FIELD_ENCRYPTION_KEY 不是合法的 base64 字符串");
  }
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY 长度错误: 期望 ${KEY_BYTES} 字节 (base64 解码后)，实际 ${buf.length} 字节`
    );
  }
  cachedKey = buf;
  return cachedKey;
}

/**
 * 加密字符串。
 * @returns "v1:iv:ciphertext:authTag" 形式的 base64 串
 */
export function encryptField(plaintext: string): string {
  if (typeof plaintext !== "string") {
    throw new TypeError("encryptField 仅接受 string 输入");
  }
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    ciphertext.toString("base64"),
    authTag.toString("base64"),
  ].join(":");
}

/**
 * 解密字符串。任何篡改都会 throw。
 */
export function decryptField(encrypted: string): string {
  if (typeof encrypted !== "string") {
    throw new TypeError("decryptField 仅接受 string 输入");
  }
  const parts = encrypted.split(":");
  if (parts.length !== 4) {
    throw new Error(`decryptField: 格式错误，期望 4 段，实际 ${parts.length}`);
  }
  const [version, ivB64, ciphertextB64, authTagB64] = parts;
  if (version !== VERSION) {
    throw new Error(`decryptField: 不支持的密文版本 ${version}，当前期望 ${VERSION}`);
  }
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

/**
 * 计算字段 keyed hash (HMAC-SHA256)。用于 phone_hash 这种"可索引、可搜索、不可逆"的列。
 *
 * 使用 HMAC-SHA256 (keyed on FIELD_ENCRYPTION_KEY) 而非裸 SHA256：
 * - 裸 SHA256: 11 位手机号空间 10^11 ≈ 37 bit，拿到 DB 只读权限即可枚举全表手机号。
 * - HMAC-SHA256: 攻击者需要同时拿到密钥才能枚举，安全性与加密字段同级。
 *
 * ⚠️ 迁移注意: 改 hash 算法后现有 phone_hash 值全部失效，需要一次性重新计算。
 *   Phase 1 无生产数据，直接 reset migrate 即可。
 */
export function hashField(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError("hashField 仅接受 string 输入");
  }
  return createHmac("sha256", getKey()).update(value, "utf8").digest("base64");
}

/**
 * 测试用: 强制重新读取环境变量。生产代码不要调用。
 * @internal
 */
export function __resetEncryptionKeyForTest(): void {
  cachedKey = null;
}
