"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserInfo {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  _count?: { resources: number };
}

export default function AdminPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResult, setSearchResult] = useState<UserInfo | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [setupMessage, setSetupMessage] = useState("");

  const isAdmin = session && (session.user as any)?.role === "ADMIN";

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;

    setActionMessage("");
    try {
      const res = await fetch(`/api/admin/users/${searchUsername.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResult(data);
      } else {
        const data = await res.json();
        setSearchResult(null);
        setActionMessage(data.error || "用户不存在");
      }
    } catch {
      setActionMessage("查询失败");
    }
  };

  const handleChangeRole = async (username: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        const data = await res.json();
        setActionMessage(`✅ ${data.message}`);
        setSearchResult((prev) =>
          prev ? { ...prev, role: newRole } : null
        );
      } else {
        const data = await res.json();
        setActionMessage(`❌ ${data.error || "操作失败"}`);
      }
    } catch {
      setActionMessage("❌ 网络请求失败");
    }
  };

  const handleFirstAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupToken.trim()) {
      setSetupMessage("请输入令牌");
      return;
    }

    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: setupToken.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setSetupMessage(`✅ ${data.message}，正在刷新...`);
        await updateSession();
        setTimeout(() => router.refresh(), 1500);
      } else {
        const data = await res.json();
        setSetupMessage(`❌ ${data.error || "设置失败"}`);
      }
    } catch {
      setSetupMessage("❌ 网络请求失败");
    }
  };

  // Not logged in
  if (!session) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center glass rounded-2xl p-8 max-w-md">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-2xl text-white mb-2">请先登录</h1>
          <p className="text-gray-400 mb-4">登录后可申请成为首个管理员</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            前往登录
          </Link>
        </div>
      </div>
    );
  }

  // Logged in but not admin - show first admin setup
  if (!isAdmin) {
    return (
      <div className="pt-20 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">管理员设置</h1>
            <p className="text-gray-400">
              当前账户：{(session.user as any)?.username}（普通用户）
            </p>
          </div>

          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-2xl">⚡</div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  首个管理员设置
                </h2>
                <p className="text-gray-400 text-sm">
                  如果系统尚无管理员，你可以使用安全令牌将当前账户升级为管理员
                </p>
              </div>
            </div>

            <form onSubmit={handleFirstAdminSetup} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  安全令牌 (NEXTAUTH_SECRET)
                </label>
                <input
                  type="password"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="输入 NEXTAUTH_SECRET 的值"
                />
                <p className="text-gray-500 text-xs mt-1">
                  此令牌可在 Vercel 项目 → Settings → Environment Variables 中查看
                </p>
              </div>

              {setupMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  setupMessage.startsWith("✅")
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}>
                  {setupMessage}
                </div>
              )}

              <button
                type="submit"
                className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
              >
                升级为管理员
              </button>
            </form>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="text-white font-medium mb-2">💡 获取令牌方法</h3>
            <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
              <li>登录 Vercel → 进入 i-TV 项目</li>
              <li>点击顶部 Settings → 左侧 Environment Variables</li>
              <li>找到 <code className="text-amber-400">NEXTAUTH_SECRET</code>，点击眼睛图标显示值</li>
              <li>复制该值并粘贴到上方输入框</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            管理员控制台
          </h1>
          <p className="text-gray-400">
            管理用户权限和系统设置
          </p>
        </div>

        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            👤 查询用户
          </h2>
          <form onSubmit={handleSearchUser} className="flex gap-4">
            <input
              type="text"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              placeholder="输入用户名..."
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              查询
            </button>
          </form>

          {actionMessage && (
            <div className="mt-4 p-3 bg-white/5 rounded-lg text-sm text-gray-300">
              {actionMessage}
            </div>
          )}

          {searchResult && (
            <div className="mt-6 glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {searchResult.username}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    注册于 {new Date(searchResult.createdAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    searchResult.role === "ADMIN"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {searchResult.role === "ADMIN" ? "管理员" : "普通用户"}
                </span>
              </div>

              <div className="flex gap-3">
                {searchResult.role !== "ADMIN" && (
                  <button
                    onClick={() =>
                      handleChangeRole(searchResult.username, "ADMIN")
                    }
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm transition-colors"
                  >
                    设为管理员
                  </button>
                )}
                {searchResult.role === "ADMIN" && (
                  <button
                    onClick={() =>
                      handleChangeRole(searchResult.username, "USER")
                    }
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                  >
                    取消管理员
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            ⚡ 快捷操作
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/resources/add"
              className="glass glass-hover rounded-xl p-4 transition-colors"
            >
              <h3 className="text-white font-medium mb-1">添加资源</h3>
              <p className="text-gray-400 text-sm">
                从 TMDB 搜索并添加新的影视资源
              </p>
            </Link>
            <Link
              href="/"
              className="glass glass-hover rounded-xl p-4 transition-colors"
            >
              <h3 className="text-white font-medium mb-1">返回首页</h3>
              <p className="text-gray-400 text-sm">
                查看所有资源列表
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
