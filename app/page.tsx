/**
 * 市民端首页 - Phase 1 占位。Phase 2 政策问答 / Phase 3 职业诊断 / Phase 5 创业诊断
 * 上线后这里会改成三模块入口。
 */
export default function HomePage() {
  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-4">
        <h1 className="text-3xl font-semibold">上海黄浦区 智能就业创业服务</h1>
        <p className="text-gray-600">
          Phase 1 脚手架占位。后续 phase 接入：政策问答 / 智能职业诊断 / 智能创业诊断。
        </p>
        <p className="text-sm text-gray-500">
          工作人员请访问{" "}
          <a href="/admin/login" className="underline">
            后台登录
          </a>
          。
        </p>
      </div>
    </main>
  );
}
