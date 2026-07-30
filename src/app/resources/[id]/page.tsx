"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getImageUrl } from "@/lib/image";
import { getTypeLabel } from "@/lib/resourceTypes";
import {
  QUALITY_OPTIONS,
  STORAGE_OPTIONS,
  getUserTitle,
  getLevelFromExperience,
  hasAdminPermission,
} from "@/lib/constants";

interface ResourceLink {
  id: string;
  label: string;
  url: string;
  type: string;
  quality?: string;
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
  createdBy?: { id: string; username: string } | null;
}

interface Comment {
  id: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  user: {
    id: string;
    username: string;
    level: number;
    experience: number;
    title: string | null;
    role: string;
    isOwner: boolean;
    isSuperAdmin: boolean;
  };
}

const statusOptions = ["更新中", "已完结", "待更新"];

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddLink, setShowAddLink] = useState(false);
  const [showEditInfo, setShowEditInfo] = useState(false);
  const [newLink, setNewLink] = useState({
    storage: STORAGE_OPTIONS[0],
    quality: QUALITY_OPTIONS[0],
    url: "",
  });
  const [editForm, setEditForm] = useState({
    currentEpisode: "",
    totalEpisodes: "",
    status: "",
    notes: "",
    title: "",
    originalTitle: "",
    overview: "",
    posterPath: "",
    backdropPath: "",
  });

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [openMenuLinkId, setOpenMenuLinkId] = useState<string | null>(null);

  useEffect(() => {
    fetchResource();
    fetchComments();
  }, [params.id]);

  const fetchResource = async () => {
    try {
      const res = await fetch(`/api/resources/${params.id}`);
      if (!res.ok) {
        setResource(null);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setResource(data);
      setEditForm({
        currentEpisode: data.currentEpisode || "",
        totalEpisodes: data.totalEpisodes || "",
        status: data.status || "",
        notes: data.notes || "",
        title: data.title || "",
        originalTitle: data.originalTitle || "",
        overview: data.overview || "",
        posterPath: data.posterPath || "",
        backdropPath: data.backdropPath || "",
      });
    } catch (error) {
      console.error("Fetch resource error:", error);
      setResource(null);
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/resources/${params.id}/comments`);
      const data = await res.json();
      setComments(data);
    } catch (error) {
      console.error("Fetch comments error:", error);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.url) return;

    const label = `${newLink.storage}${newLink.quality}`;

    const res = await fetch(`/api/resources/${params.id}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        url: newLink.url,
        type: newLink.storage,
        quality: newLink.quality,
      }),
    });

    if (res.ok) {
      setNewLink({ storage: STORAGE_OPTIONS[0], quality: QUALITY_OPTIONS[0], url: "" });
      setShowAddLink(false);
      fetchResource();
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm("确定删除这个链接吗？删除将扣除添加者 5 XP。")) return;

    await fetch(`/api/resources/${params.id}/links/${linkId}`, {
      method: "DELETE",
    });
    setOpenMenuLinkId(null);
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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const res = await fetch(`/api/resources/${params.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment.trim() }),
    });

    if (res.ok) {
      setNewComment("");
      setShowCommentForm(false);
      fetchComments();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("确定删除这条评论吗？")) return;

    await fetch(`/api/resources/${params.id}/comments/${commentId}`, {
      method: "DELETE",
    });
    fetchComments();
  };

  const handleTogglePin = async (commentId: string, currentPinned: boolean) => {
    await fetch(`/api/resources/${params.id}/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !currentPinned }),
    });
    fetchComments();
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

  let genres: any[] = [];
  if (resource.genres) {
    if (Array.isArray(resource.genres)) {
      genres = resource.genres;
    } else {
      try {
        genres = JSON.parse(resource.genres);
      } catch {
        genres = [];
      }
    }
  }

  const canEdit = session && (
    (session.user as any)?.role === "ADMIN" ||
    (session.user as any)?.id === resource.createdBy?.id
  );

  const sessionUser = session?.user as any;
  const canAdminAction = session && hasAdminPermission({
    role: sessionUser?.role,
    isOwner: sessionUser?.isOwner,
    isSuperAdmin: sessionUser?.isSuperAdmin,
  });

  const getCommentUserBadge = (user: Comment["user"]) => {
    const title = getUserTitle({
      role: user.role,
      isOwner: user.isOwner,
      isSuperAdmin: user.isSuperAdmin,
      title: user.title,
    });

    if (title) {
      const colorMap: Record<string, string> = {
        "站长": "bg-amber-500/20 text-amber-400",
        "副站长": "bg-purple-500/20 text-purple-400",
        "管理员": "bg-red-500/20 text-red-400",
      };
      const colorClass = colorMap[title] || "bg-blue-500/20 text-blue-400";
      return (
        <span className={`px-2 py-0.5 text-xs rounded font-medium ${colorClass}`}>
          {title}
        </span>
      );
    }

    const level = getLevelFromExperience(user.experience);
    return (
      <span className="px-2 py-0.5 text-xs rounded font-medium bg-gray-600/40 text-gray-300">
        LV{level}
      </span>
    );
  };

  return (
    <div className="pt-20 pb-16">
      {resource.backdropPath && (() => {
          const backdropUrl = getImageUrl(resource.backdropPath, "original");
          if (!backdropUrl) return null;
          return (
            <>
              <div
                className="fixed inset-0 w-full h-full pointer-events-none"
                style={{
                  backgroundImage: `url(${backdropUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.35,
                }}
              />
              <div className="fixed inset-0 w-full h-full pointer-events-none bg-gradient-to-b from-gray-950/60 via-gray-950/30 to-gray-950/80" />
            </>
          );
        })()}

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
              {resource.posterPath && (() => {
                const posterUrl = getImageUrl(resource.posterPath, "w500");
                if (!posterUrl) return null;
                return (
                  <img
                    src={posterUrl}
                    alt={resource.title}
                    className="w-full max-h-[70vh] md:max-h-[calc(100vh-10rem)] object-contain block rounded-t-2xl md:rounded-l-2xl"
                  />
                );
              })()}
              {!resource.posterPath && (
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
                    {resource.rating != null && (
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                        ★ {Number(resource.rating).toFixed(1)}
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
                    {(resource.links || []).length} 个
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">添加者</div>
                  <div className="font-medium text-white">
                    {resource.createdBy?.username ? (
                      <Link
                        href={`/user/${resource.createdBy?.username}`}
                        className="hover:text-blue-400 transition-colors"
                      >
                        {resource.createdBy.username}
                      </Link>
                    ) : (
                      "未知"
                    )}
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

              {canEdit && (
                <div className="flex flex-wrap gap-3 mb-4">
                  <button
                    onClick={() => setShowEditInfo(!showEditInfo)}
                    className="px-4 py-2 glass glass-hover text-white rounded-lg transition-colors text-sm"
                  >
                    {showEditInfo ? "取消编辑" : "编辑信息"}
                  </button>
                  <button
                    onClick={handleDeleteResource}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                  >
                    删除资源
                  </button>
                  <button
                    onClick={() => setShowAddLink(!showAddLink)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    {showAddLink ? "取消" : "+ 添加链接"}
                  </button>
                </div>
              )}

              {(resource.links || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {(resource.links || []).map((link) => (
                    <div key={link.id} className="relative">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass glass-hover text-sm text-blue-300 hover:text-blue-200 transition-colors"
                      >
                        <span>{link.label}</span>
                      </a>
                      {session && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuLinkId(openMenuLinkId === link.id ? null : link.id);
                          }}
                          className="ml-1 text-gray-500 hover:text-red-400 transition-colors"
                          title="管理链接"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="4" cy="10" r="1.5" />
                            <circle cx="10" cy="10" r="1.5" />
                            <circle cx="16" cy="10" r="1.5" />
                          </svg>
                        </button>
                      )}
                      {openMenuLinkId === link.id && (
                        <div className="absolute left-0 mt-1 z-20 glass rounded-lg py-1 min-w-[120px] shadow-xl">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-white/5"
                          >
                            打开链接
                          </a>
                          <button
                            onClick={() => handleDeleteLink(link.id)}
                            className="block w-full text-left px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            删除链接 (-5 XP)
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!canEdit && session && (!resource.links || resource.links.length === 0) && (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm">暂无资源链接</p>
                </div>
              )}

              {openMenuLinkId && (
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setOpenMenuLinkId(null)}
                />
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
              <div className="md:col-span-2">
                <label className="block text-gray-300 text-sm mb-2">
                  原名
                </label>
                <input
                  type="text"
                  value={editForm.originalTitle}
                  onChange={(e) =>
                    setEditForm({ ...editForm, originalTitle: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="原始标题（可选）"
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
                  placeholder="支持图片路径或URL，如 /abc123.jpg"
                />
                <p className="text-gray-500 text-xs mt-1">
                  任意图片URL即可
                </p>
                {editForm.posterPath && (() => {
                    const previewUrl = getImageUrl(editForm.posterPath, "w185");
                    if (!previewUrl) return null;
                    return (
                      <div className="mt-2">
                        <img
                          src={previewUrl}
                          alt="海报预览"
                          className="w-24 h-36 object-cover rounded-lg border border-white/10"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    );
                  })()}
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
                  placeholder="支持图片路径或URL，如 /abc123.jpg"
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
                  网盘类型
                </label>
                <select
                  value={newLink.storage}
                  onChange={(e) =>
                    setNewLink({ ...newLink, storage: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {STORAGE_OPTIONS.map((t) => (
                    <option key={t} value={t} className="bg-gray-900 text-white">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  资源质量
                </label>
                <select
                  value={newLink.quality}
                  onChange={(e) =>
                    setNewLink({ ...newLink, quality: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {QUALITY_OPTIONS.map((q) => (
                    <option key={q} value={q} className="bg-gray-900 text-white">
                      {q}
                    </option>
                  ))}
                </select>
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
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">标签预览：</span>
                  <span className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-sm">
                    {newLink.storage}{newLink.quality}
                  </span>
                </div>
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

        <div className="mt-6 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              评论 ({comments.length})
            </h2>
            {session && (
              <button
                onClick={() => setShowCommentForm(!showCommentForm)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {showCommentForm ? "取消" : "+ 发表评论"}
              </button>
            )}
          </div>

          {showCommentForm && session && (
            <form onSubmit={handleAddComment} className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                rows={3}
                placeholder="写下你的评论... (最多500字)"
                maxLength={500}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-500 text-xs">
                  {newComment.length}/500
                </span>
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                >
                  发送评论
                </button>
              </div>
            </form>
          )}

          {!session && (
            <div className="text-center py-4 mb-4">
              <p className="text-gray-400 text-sm">
                <Link href="/login" className="text-blue-400 hover:text-blue-300">
                  登录
                </Link>{" "}
                后即可发表评论
              </p>
            </div>
          )}

          {comments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-gray-400 text-sm">暂无评论，来发表第一条吧</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const isOwner = sessionUser?.id === comment.user.id;
                const canDeleteComment = isOwner || canAdminAction;
                const canPinComment = canAdminAction;

                return (
                  <div
                    key={comment.id}
                    className={`glass rounded-xl p-4 ${
                      comment.isPinned ? "border-amber-500/30 bg-amber-500/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {comment.isPinned && (
                          <span className="text-amber-400" title="置顶评论">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5.5 2a.5.5 0 000 1h.5v3.5L3 9h4v7a1 1 0 001 1h4a1 1 0 001-1V9h4L14 6.5V3h.5a.5.5 0 000-1h-9z" />
                            </svg>
                          </span>
                        )}
                        <Link
                          href={`/user/${comment.user.username}`}
                          className="text-white font-medium hover:text-blue-400 transition-colors"
                        >
                          {comment.user.username}
                        </Link>
                        {getCommentUserBadge(comment.user)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">
                          {new Date(comment.createdAt).toLocaleString("zh-CN")}
                        </span>
                        {canPinComment && (
                          <button
                            onClick={() => handleTogglePin(comment.id, comment.isPinned)}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              comment.isPinned
                                ? "text-amber-400 hover:text-amber-300"
                                : "text-gray-500 hover:text-amber-400"
                            }`}
                            title={comment.isPinned ? "取消置顶" : "置顶评论"}
                          >
                            {comment.isPinned ? "取消置顶" : "置顶"}
                          </button>
                        )}
                        {canDeleteComment && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs px-2 py-1 text-red-400 hover:text-red-300 transition-colors"
                            title="删除评论"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}