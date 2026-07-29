"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUserTitle, hasAdminPermission, canManageUsers } from "@/lib/constants";

interface UserInfo {
  id: string;
  username: string;
  role: string;
  level: number;
  experience: number;
  title: string | null;
  isOwner: boolean;
  isSuperAdmin: boolean;
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
  const [customTitle, setCustomTitle] = useState("");

  const isOwner = session && (session.user as any)?.isOwner;
  const isSuperAdmin = session && (session.user as any)?.isSuperAdmin;
  const isAdmin = session && (session.user as any)?.role === "ADMIN";
  const hasAdminAccess = isOwner || isSuperAdmin || isAdmin;

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

  const handleAssignRole = async (username: string, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignRole: role }),
      });

      if (res.ok) {
        const data = await res.json();
        setActionMessage(`✅ ${data.message}`);
        setSearchResult((prev) =>
          prev ? { ...prev, role: data.user.role, isOwner: data.user.isOwner, isSuperAdmin: data.user.isSuperAdmin, title: data.user.title } : null
        );
      } else {
        const data = await res.json();
        setActionMessage(`❌ ${data.error || "操作失败"}`);
      }
    } catch {
      setActionMessage("❌ 网络请求失败");
    }
  };

  const handleSetCustomTitle = async (username: string) => {
    if (!customTitle.trim()) return;
    try {
      const res = await fetch(`/api/admin/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: customTitle.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setActionMessage(`✅ 已设置头衔：${data.user.title}`);
        setSearchResult((prev) =>
          prev ? { ...prev, title: data.user.title } : null
        );
        setCustomTitle("");
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
          <p className="text-gray-400 mb-4">登录后可申请成为首个站长</p>
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
  if (!hasAdminAccess) {
    return (
      <div className="pt-20 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">站长设置</h1>
            <p className="text-gray-400">
              当前账户：{(session.user as any)?.username}（普通用户）
            </p>
          </div>

          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-2xl">⚡</div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  首个站长设置
                </h2>
                <p className="text-gray-400 text-sm">
                  如果系统尚无站长，你可以使用安全令牌将当前账户升级为站长
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
                  此令牌可在部署平台的环境变量中查看
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
                升级为站长
              </button>
            </form>
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
            管理控制台
          </h1>
          <p className="text-gray-400">
            管理用户权限和系统设置
            {isOwner && <span className="ml-2 text-amber-400">(站长模式)</span>}
            {isSuperAdmin && <span className="ml-2 text-orange-400">(副站长模式)</span>}
            {isAdmin && !isOwner && !isSuperAdmin && <span className="ml-2 text-blue-400">(管理员模式)</span>}
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
                <div className="flex items-center gap-2">
                  {(() => {
                    const title = getUserTitle(searchResult);
                    if (title) {
                      return (
                        <span className={`px-3 py-1 rounded text-xs font-medium ${
                          title === "站长" ? "bg-amber-500/20 text-amber-400" :
                          title === "副站长" ? "bg-orange-500/20 text-orange-400" :
                          title === "管理员" ? "bg-blue-500/20 text-blue-400" :
                          "bg-purple-500/20 text-purple-400"
                        }`}>
                          {title}
                        </span>
                      );
                    }
                    return (
                      <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded text-xs font-medium">
                        LV{searchResult.level}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center glass rounded-lg p-2">
                  <div className="text-lg font-bold text-white">{searchResult.experience}</div>
                  <div className="text-gray-400 text-xs">经验值</div>
                </div>
                <div className="text-center glass rounded-lg p-2">
                  <div className="text-lg font-bold text-white">{searchResult._count?.resources || 0}</div>
                  <div className="text-gray-400 text-xs">添加资源</div>
                </div>
                <div className="text-center glass rounded-lg p-2">
                  <div className="text-lg font-bold text-white">{searchResult.level}</div>
                  <div className="text-gray-400 text-xs">等级</div>
                </div>
              </div>

              <div className="space-y-3">
                {/* Role assignment - only for users below current admin level */}
                {isOwner && (
                  <div className="flex gap-2 flex-wrap">
                    {!searchResult.isOwner && (
                      <>
                        {!searchResult.isSuperAdmin && searchResult.role !== "ADMIN" && (
                          <button
                            onClick={() => handleAssignRole(searchResult.username, "ADMIN")}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                          >
                            设为管理员
                          </button>
                        )}
                        {!searchResult.isSuperAdmin && (
                          <button
                            onClick={() => handleAssignRole(searchResult.username, "SUPER_ADMIN")}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors"
                          >
                            设为副站长
                          </button>
                        )}
                        {(searchResult.role === "ADMIN" || searchResult.isSuperAdmin) && (
                          <button
                            onClick={() => handleAssignRole(searchResult.username, "USER")}
                            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                          >
                            取消权限
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {isSuperAdmin && (
                  <div className="flex gap-2 flex-wrap">
                    {!searchResult.isOwner && !searchResult.isSuperAdmin && (
                      <>
                        {searchResult.role !== "ADMIN" && (
                          <button
                            onClick={() => handleAssignRole(searchResult.username, "ADMIN")}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                          >
                            设为管理员
                          </button>
                        )}
                        {searchResult.role === "ADMIN" && (
                          <button
                            onClick={() => handleAssignRole(searchResult.username, "USER")}
                            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                          >
                            取消管理员
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Custom title for non-admin users */}
                {(isOwner || isSuperAdmin) && !searchResult.isOwner && !searchResult.isSuperAdmin && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="设置自定义头衔（如：神人、仙人、凡人）"
                      className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <button
                      onClick={() => handleSetCustomTitle(searchResult.username)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                    >
                      设置头衔
                    </button>
                    {searchResult.title && (
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/admin/users/${searchResult.username}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ title: null }),
                          });
                          if (res.ok) {
                            setSearchResult((prev) => prev ? { ...prev, title: null } : null);
                            setActionMessage("✅ 已清除头衔");
                          }
                        }}
                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                      >
                        清除头衔
                      </button>
                    )}
                  </div>
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
                添加新的影视资源
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
