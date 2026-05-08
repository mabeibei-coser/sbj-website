/**
 * Admin/工作人员 Session (INF-06, CRM-02)
 *
 * 来源: D:\career-report\lib\admin-session.ts (iron-session + bcrypt 模式)
 * 改造点:
 * - AdminSession 加 role 字段 ('admin' | 'reviewer') 为 CRM-03 留口子
 * - 启动 lazy 校验 ADMIN_PASSWORD_HASH (base64 of bcrypt) + ADMIN_SESSION_PASSWORD (≥32 字符)
 * - cookieName 改成 sbj_admin_session
 *
 * Phase 1 只支持单一 admin 密码 (从 env 读)，role 永远是 'admin'。
 * CRM-03 (Phase 4) 会改成多账号 + reviewer 等级。
 */

import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export type AdminRole = "admin" | "reviewer";

export interface AdminSession {
  /** 是否登录成功 */
  isAdmin: boolean;
  /** 角色，缺省视作 'admin' (向后兼容) */
  role?: AdminRole;
  /** 登录时间戳 (ms) */
  loggedInAt?: number;
  /** 用户标识 (Phase 4 多账号后启用)，目前固定 "default" */
  userId?: string;
}

let validated = false;

/**
 * 校验 env 配置。第一次调用时执行；缺失或不合规直接抛错。
 */
function validateEnv(): void {
  if (validated) return;

  const rawHash = process.env.ADMIN_PASSWORD_HASH;
  if (!rawHash) {
    throw new Error(
      "ADMIN_PASSWORD_HASH 未设置。生成: node -e \"require('bcryptjs').hash('your-pwd',12).then(h=>console.log(Buffer.from(h).toString('base64')))\""
    );
  }
  const decoded = Buffer.from(rawHash, "base64").toString("utf8");
  // bcrypt hash 形如 $2a$12$... 长度 60
  if (!/^\$2[aby]\$\d{2}\$.{53}$/.test(decoded)) {
    throw new Error(
      "ADMIN_PASSWORD_HASH 解码后不是合法的 bcrypt hash (期望 $2a$12$... 60 字符)"
    );
  }

  const sessionPwd = process.env.ADMIN_SESSION_PASSWORD;
  if (!sessionPwd) {
    throw new Error(
      "ADMIN_SESSION_PASSWORD 未设置。生成: node -e \"console.log(require('crypto').randomBytes(48).toString('base64'))\""
    );
  }
  if (sessionPwd.length < 32) {
    throw new Error(`ADMIN_SESSION_PASSWORD 长度不足: 期望 ≥32 字符，实际 ${sessionPwd.length}`);
  }

  validated = true;
}

function buildSessionOptions(): SessionOptions {
  validateEnv();
  return {
    password: process.env.ADMIN_SESSION_PASSWORD!,
    cookieName: "sbj_admin_session",
    cookieOptions: {
      // 本地 dev 默认 false (HTTP)；prod 强制 true (HTTPS)
      secure:
        process.env.ADMIN_COOKIE_SECURE !== "false" &&
        process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 天
    },
  };
}

export async function getAdminSession() {
  return getIronSession<AdminSession>(await cookies(), buildSessionOptions());
}

export async function loginAdmin(password: string): Promise<boolean> {
  validateEnv();
  // ADMIN_PASSWORD_HASH 用 base64 存，避免 dotenv 对 $ 字符的转义干扰
  const raw = process.env.ADMIN_PASSWORD_HASH!;
  const hash = Buffer.from(raw, "base64").toString("utf8");
  const ok = await bcrypt.compare(password, hash);
  if (!ok) return false;
  const s = await getAdminSession();
  s.isAdmin = true;
  s.role = "admin"; // Phase 1 单一账号，恒为 admin
  s.userId = "default";
  s.loggedInAt = Date.now();
  await s.save();
  return true;
}

export async function logoutAdmin(): Promise<void> {
  const s = await getAdminSession();
  s.destroy();
}

/**
 * 测试用: 重置启动校验缓存。生产代码不要调用。
 * @internal
 */
export function __resetAdminSessionValidationForTest(): void {
  validated = false;
}
