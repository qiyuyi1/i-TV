"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface UserInfo {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  _count?: { resources: number };
}

export default function AdminPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResult, setSearchResult] = useState<UserInfo | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/resources");
      // We'll fetch users differently
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

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
        // Refresh search result
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

  if (!session || (session.user as any)?.role !== "ADMIN") {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center glass rounded-2xl p-8 max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl text-white mb-2">权限不足</h1>
          <p className="text-gray-400 mb-4">
            此页面仅管理员可访问
          </p>
          <Link
            href="/"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

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
