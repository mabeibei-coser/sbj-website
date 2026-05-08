/**
 * Admin 后台首页 (Phase 1 占位)
 * - 未登录: middleware 会拦截 → 跳到 /admin/login
 * - 已登录: 显示占位 + 退出按钮
 *
 * Phase 4 (CRM) 改成市民列表 + 数据看板。
 */

import { getAdminSession } from "@/lib/admin-session";
import Link from "next/link";

export default async function AdminHomePage() {
  const session = await getAdminSession();
  return (
    <main className="flex-1 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">工作人员后台</h1>
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              退出登录
            </button>
          </form>
        </header>
        <section className="rounded-lg border border-gray-200 p-6 space-y-2">
          <h2 className="text-lg font-medium">当前会话</h2>
          <dl className="text-sm text-gray-700 space-y-1">
            <div>
              <dt className="inline font-medium">角色：</dt>
              <dd className="inline">{session.role ?? "admin"}</dd>
            </div>
            <div>
              <dt className="inline font-medium">用户：</dt>
              <dd className="inline">{session.userId ?? "default"}</dd>
            </div>
            <div>
              <dt className="inline font-medium">登录时间：</dt>
              <dd className="inline">
                {session.loggedInAt ? new Date(session.loggedInAt).toLocaleString("zh-CN") : "—"}
              </dd>
            </div>
          </dl>
        </section>
        <section className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
          <p>Phase 1 占位。后续 phase 接入：</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Phase 2: 政策问答 wiki 编辑</li>
            <li>Phase 3: 职业诊断报告审阅</li>
            <li>Phase 4: 市民管理 + 5 级标签 + 服务记录</li>
            <li>Phase 5: 创业诊断报告审阅</li>
          </ul>
          <p className="mt-2">
            <Link href="/" className="underline">
              返回市民端首页
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
