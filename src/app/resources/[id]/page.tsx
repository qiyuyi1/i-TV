"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getImageUrl } from "@/lib/tmdb";
import { getTypeLabel } from "@/lib/resourceTypes";

interface ResourceLink {
  id: string;
  label: string;
  url: string;
  type: string;
  addedBy?: { username: string };
  createdAt: string;
}

interface Resource {
  id: string;
  title: string;
  originalTitle: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  year: string | null;
  type: string;
  genres: string | null;
  rating: number | null;
  currentEpisode: string | null;
  totalEpisodes: string | null;
  status: string | null;
  notes: string | null;
  links: ResourceLink[];
  createdBy?: { username: string } | null;
}

const linkTypes = [
  "夸克网盘",
  "光鸭网盘",
];

const statusOptions = ["更新中", "已完结", "待更新"];

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddLink, setShowAddLink] = useState(false);
  const [showEditInfo, setShowEditInfo] = useState(false);
  const [newLink, setNewLink] = useState({ label: "", url: "", type: "夸克网盘" });
  const [editForm, setEditForm] = useState({
    currentEpisode: "",
    totalEpisodes: "",
    status: "",
    notes: "",
    title: "",
    overview: "",
    posterPath: "",
    backdropPath: "",
  });

  useEffect(() => {
    fetchResource();
  }, [params.id]);

  const fetchResource = async () => {
    const res = await fetch(`/api/resources/${params.id}`);
    const data = await res.json();
    setResource(data);
    setEditForm({
      currentEpisode: data.currentEpisode || "",
      totalEpisodes: data.totalEpisodes || "",
      status: data.status || "",
      notes: data.notes || "",
      title: data.title || "",
      overview: data.overview || "",
      posterPath: data.posterPath || "",
      backdropPath: data.backdropPath || "",
    });
    setLoading(false);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.label || !newLink.url) return;

    const res = await fetch(`/api/resources/${params.id}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newLink),
    });

    if (res.ok) {
      setNewLink({ label: "", url: "", type: "夸克网盘" });
      setShowAddLink(false);
      fetchResource();
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm("确定删除这个链接吗？")) return;

    await fetch(`/api/resources/${params.id}/links/${linkId}`, {
      method: "DELETE",
    });
    fetchResource();
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch(`/api/resources/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });

    if (res.ok) {
      setShowEditInfo(false);
      fetchResource();
    }
  };

  const handleDeleteResource = async () => {
    if (!confirm("确定删除这个资源吗？此操作不可撤销！")) return;

    await fetch(`/api/resources/${params.id}`, { method: "DELETE" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="pt-20 min-h-screen">
        <div className="max-w-6xl mx-auto px-4">
          <div className="glass rounded-2xl p-8 animate-pulse">
            <div className="h-8 w-48 bg-white/10 rounded mb-4" />
            <div className="h-4 w-32 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">资源不存在</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const genres = resource.genres ? JSON.parse(resource.genres) : [];

  return (
    <div className="pt-20 pb-16">
      {resource.backdropPath && (
        <div
          className="fixed inset-0 w-full h-64 opacity-30 blur-xl"
          style={{
            backgroundImage: `url(${getImageUrl(
              resource.backdropPath,
              "original"
            )})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-6">
          <Link
            href="/"
            className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            返回列表
          </Link>
        </div>

        <div className="glass rounded-2xl">
          <div className="md:flex">
            <div className="md:w-64 flex-shrink-0 self-center">
              {resource.posterPath ? (
                <img
                  src={getImageUrl(resource.posterPath, "w500")}
                  alt={resource.title}
                  className="w-full max-h-[70vh] md:max-h-[calc(100vh-10rem)] object-contain block rounded-t-2xl md:rounded-l-2xl"
                />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-800 flex items-center justify-center">
                    <span className="text-6xl">🎬</span>
                  </div>
                )}
            </div>

            <div className="flex-1 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
                      {getTypeLabel(resource.type)}
                    </span>
                    {resource.rating && (
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                        ★ {resource.rating.toFixed(1)}
                      </span>
                    )}
                    {resource.year && (
                      <span className="text-gray-400 text-sm">
                        {resource.year}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                    {resource.title}
                  </h1>
                  {resource.originalTitle && (
                    <p className="text-gray-400 text-sm">
                      {resource.originalTitle}
                    </p>
                  )}
                </div>

                {session && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteResource}
                      className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>

              {genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {genres.map((genre: any, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-white/10 text-gray-300 rounded text-xs"
                    >
                      {genre.name || genre}
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <div className="text-gray-500 text-xs mb-1">更新状态</div>
                  <div
                    className={`font-medium ${
                      resource.status === "更新中"
                        ? "text-blue-400"
                        : resource.status === "已完结"
                        ? "text-green-400"
                        : resource.status === "待更新"
                        ? "text-amber-400"
                        : "text-gray-300"
                    }`}
                  >
                    {resource.status || "未知"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">当前集数</div>
                  <div className="font-medium text-white">
                    {resource.currentEpisode
                      ? `${resource.currentEpisode}${
                          resource.totalEpisodes
                            ? ` / ${resource.totalEpisodes}`
                            : ""
                        } 集`
                      : "未更新"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">资源数</div>
                  <div className="font-medium text-white">
                    {resource.links?.length || 0} 个
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">添加者</div>
                  <div className="font-medium text-white">
                    {resource.createdBy?.username || "未知"}
                  </div>
                </div>
              </div>

              {resource.overview && (
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-2">剧情简介</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {resource.overview}
                  </p>
                </div>
              )}

              {resource.notes && (
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-2">备注</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {resource.notes}
                  </p>
                </div>
              )}

              {session && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowEditInfo(!showEditInfo)}
                    className="px-4 py-2 glass glass-hover text-white rounded-lg transition-colors text-sm"
                  >
                    {showEditInfo ? "取消编辑" : "编辑信息"}
                  </button>
                  <button
                    onClick={() => setShowAddLink(!showAddLink)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    {showAddLink ? "取消" : "+ 添加链接"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showEditInfo && session && (
          <div className="mt-6 glass rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">编辑资源信息</h3>
            <form onSubmit={handleUpdateInfo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-gray-300 text-sm mb-2">
                  标题
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="资源标题"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  当前集数
                </label>
                <input
                  type="text"
                  value={editForm.currentEpisode}
                  onChange={(e) =>
                    setEditForm({ ...editForm, currentEpisode: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="如：12"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  总集数
                </label>
                <input
                  type="text"
                  value={editForm.totalEpisodes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, totalEpisodes: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="如：24"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  更新状态
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="" className="bg-gray-900 text-white">未知</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s} className="bg-gray-900 text-white">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  海报路径
                </label>
                <input
                  type="text"
                  value={editForm.posterPath}
                  onChange={(e) =>
                    setEditForm({ ...editForm, posterPath: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="支持 TMDB 路径 /abc123.jpg 或图片URL"
                />
                <p className="text-gray-500 text-xs mt-1">
                  任意图片URL即可
                </p>
                {editForm.posterPath && (
                  <div className="mt-2">
                    <img
                      src={getImageUrl(editForm.posterPath, "w185")}
                      alt="海报预览"
                      className="w-24 h-36 object-cover rounded-lg border border-white/10"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-300 text-sm mb-2">
                  背景图路径
                </label>
                <input
                  type="text"
                  value={editForm.backdropPath}
                  onChange={(e) =>
                    setEditForm({ ...editForm, backdropPath: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="支持 TMDB 路径 /abc123.jpg 或图片URL"
                />
                <p className="text-gray-500 text-xs mt-1">
                  用于详情页顶部的模糊背景效果，可选
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-300 text-sm mb-2">剧情简介</label>
                <textarea
                  value={editForm.overview}
                  onChange={(e) =>
                    setEditForm({ ...editForm, overview: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  rows={3}
                  placeholder="更新剧情简介..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-300 text-sm mb-2">备注</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  rows={3}
                  placeholder="添加备注信息..."
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  保存修改
                </button>
              </div>
            </form>
          </div>
        )}

        {showAddLink && session && (
          <div className="mt-6 glass rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">添加资源链接</h3>
            <form onSubmit={handleAddLink} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  链接类型
                </label>
                <select
                  value={newLink.type}
                  onChange={(e) =>
                    setNewLink({ ...newLink, type: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {linkTypes.map((t) => (
                    <option key={t} value={t} className="bg-gray-900 text-white">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  名称/标签
                </label>
                <input
                  type="text"
                  value={newLink.label}
                  onChange={(e) =>
                    setNewLink({ ...newLink, label: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="如：夸克网盘-高清"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  链接地址
                </label>
                <input
                  type="url"
                  value={newLink.url}
                  onChange={(e) =>
                    setNewLink({ ...newLink, url: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="https://..."
                  required
                />
              </div>
              <div className="md:col-span-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  添加链接
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">资源链接</h2>
            {session && (
              <button
                onClick={() => setShowAddLink(!showAddLink)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                + 添加新链接
              </button>
            )}
          </div>

          {resource.links && resource.links.length > 0 ? (
            <div className="grid gap-3">
              {resource.links.map((link) => (
                <div
                  key={link.id}
                  className="glass glass-hover rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                        {link.type}
                      </span>
                      <span className="text-white font-medium">
                        {link.label}
                      </span>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 text-sm hover:text-blue-400 truncate block"
                    >
                      {link.url}
                    </a>
                    {link.addedBy && (
                      <p className="text-gray-500 text-xs mt-1">
                        由 {link.addedBy.username} 添加于{" "}
                        {new Date(link.createdAt).toLocaleDateString("zh-CN")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      访问
                    </a>
                    {session && (
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 glass rounded-xl">
              <div className="text-4xl mb-3">🔗</div>
              <p className="text-gray-400">暂无资源链接</p>
              {session && (
                <button
                  onClick={() => setShowAddLink(true)}
                  className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  添加第一个链接
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
