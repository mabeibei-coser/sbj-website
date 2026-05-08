/**
 * Next.js proxy (INF-06)
 *
 * Next.js 16 把 `middleware` 概念改名为 `proxy`：文件路径 middleware.ts → proxy.ts，
 * 导出函数 middleware → proxy。功能完全等价。
 *
 * 鉴权两层:
 * 1. 路径前缀: /admin/* (页面) + /api/admin/* (API)
 *    - /admin/login 自身放行 (避免登录页死循环)
 *    - 未登录:
 *      * /admin/* → 302 重定向到 /admin/login?next=<原路径>
 *      * /api/admin/* → 401 JSON
 * 2. 角色: /api/admin/admin-only/* 要 role==='admin'，reviewer 401
 *
 * 设计:
 * - 在 Edge runtime 跑，直接使用 iron-session getIronSession(req, res, options)
 * - 不调 lib/admin-session.ts 的 getAdminSession() (那个走 cookies() RSC 路径)
 * - middleware 只读 session、不写；route handler 才写
 */

import { NextResponse, type NextRequest } from "next/server";
import { getIronSession, type SessionOptions } from "iron-session";
import type { AdminSession } from "@/lib/admin-session";

const SESSION_COOKIE_NAME = "sbj_admin_session";

/**
 * Build session options at runtime. middleware 不能在模块顶部读 process.env (Edge 限制)。
 */
/**
 * 当 ADMIN_SESSION_PASSWORD 缺失或太短时，不给 iron-session 解析机会。
 * 直接让调用方返回 503 / redirect。
 * 返回 null 表示配置有误。
 */
function buildOptions(): SessionOptions | null {
  const password = process.env.ADMIN_SESSION_PASSWORD;
  if (!password || password.length < 32) {
    return null;
  }
  return {
    password,
    cookieName: SESSION_COOKIE_NAME,
    cookieOptions: {
      secure:
        process.env.ADMIN_COOKIE_SECURE !== "false" &&
        process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

const ADMIN_PAGE_PREFIX = "/admin";
const ADMIN_API_PREFIX = "/api/admin";
const ADMIN_LOGIN_PATH = "/admin/login";
const ADMIN_LOGIN_API = "/api/admin/login"; // 登录 API 自己放行
// 仅 admin role (非 reviewer) 可访问
const ADMIN_ONLY_API_PREFIX = "/api/admin/admin-only";

function isProtectedPagePath(pathname: string): boolean {
  // /admin/login 自身放行
  if (pathname === ADMIN_LOGIN_PATH || pathname.startsWith(ADMIN_LOGIN_PATH + "/")) return false;
  return pathname === ADMIN_PAGE_PREFIX || pathname.startsWith(ADMIN_PAGE_PREFIX + "/");
}

function isProtectedApiPath(pathname: string): boolean {
  // /api/admin/login 自身放行
  if (pathname === ADMIN_LOGIN_API) return false;
  return pathname.startsWith(ADMIN_API_PREFIX + "/");
}

function isAdminOnlyApiPath(pathname: string): boolean {
  return pathname.startsWith(ADMIN_ONLY_API_PREFIX + "/") || pathname === ADMIN_ONLY_API_PREFIX;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPage = isProtectedPagePath(pathname);
  const isApi = isProtectedApiPath(pathname);
  if (!isPage && !isApi) return NextResponse.next();

  const opts = buildOptions();
  if (!opts) {
    // ADMIN_SESSION_PASSWORD 未配置: 强制拒绝，不给 iron-session 解析机会
    if (isPage) {
      const loginUrl = new URL(ADMIN_LOGIN_PATH, req.url);
      loginUrl.searchParams.set("error", "server_misconfigured");
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.json({ error: "服务端配置错误: ADMIN_SESSION_PASSWORD 未设置" }, { status: 503 });
  }

  const res = NextResponse.next();
  const session = await getIronSession<AdminSession>(req, res, opts);

  if (!session.isAdmin) {
    if (isPage) {
      const loginUrl = new URL(ADMIN_LOGIN_PATH, req.url);
      // 留个 next 参数登录后跳回原页面
      if (pathname !== ADMIN_PAGE_PREFIX) {
        loginUrl.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 角色校验: admin-only API 只允许 admin (Phase 1 单账号下永远满足；为 Phase 4 reviewer 留口子)
  if (isApi && isAdminOnlyApiPath(pathname)) {
    const role = session.role ?? "admin";
    if (role !== "admin") {
      return NextResponse.json({ error: "权限不足: 仅 admin 可访问" }, { status: 403 });
    }
  }

  return res;
}

export const config = {
  // 仅匹配受保护路径，避免在 / 等公开路径上空跑 (减小 Edge cold start)
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
