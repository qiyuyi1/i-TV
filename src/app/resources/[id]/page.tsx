"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import GlassSelect from "@/components/GlassSelect";
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
  country: string | null;
  currentEpisode: string | null;
  totalEpisodes: string | null;
  status: string | null;
  notes: string | null;
  links: ResourceLink[];
  createdBy?: { id: string; username: string } | null;
}

interface CommentUser {
  id: string;
  username: string;
  level: number;
  experience: number;
  title: string | null;
  role: string;
  isOwner: boolean;
  isSuperAdmin: boolean;
}

interface Comment {
  id: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  parentId?: string | null;
  user: CommentUser;
  replies?: Comment[];
}

const statusOptions = ["更新中", "已完结", "待更新"];

const COUNTRY_EDIT_OPTIONS = [
  { value: "", label: "请选择" },
  { value: "中国大陆", label: "🇨🇳 中国大陆" },
  { value: "中国香港", label: "🇭🇰 中国香港" },
  { value: "中国台湾", label: "🇹🇼 中国台湾" },
  { value: "美国", label: "🇺🇸 美国" },
  { value: "韩国", label: "🇰🇷 韩国" },
  { value: "日本", label: "🇯🇵 日本" },
  { value: "英国", label: "🇬🇧 英国" },
  { value: "法国", label: "🇫🇷 法国" },
  { value: "德国", label: "🇩🇪 德国" },
  { value: "泰国", label: "🇹🇭 泰国" },
  { value: "其他", label: "🌍 其他" },
];

const STATUS_EDIT_OPTIONS = [
  { value: "", label: "未知" },
  { value: "更新中", label: "更新中" },
  { value: "已完结", label: "已完结" },
  { value: "待更新", label: "待更新" },
];

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
    country: "",
    rating: "",
  });

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

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
        country: data.country || "",
        rating: data.rating != null ? String(data.rating) : "",
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
    if (!confirm("确定删除这个链接吗？")) return;

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

  const [commentError, setCommentError] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setCommentError("");
    setSubmittingComment(true);

    try {
      const body: Record<string, any> = { content: newComment.trim() };
      if (replyingTo) {
        body.parentId = replyingTo.id;
      }

      const res = await fetch(`/api/resources/${params.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setNewComment("");
        setShowCommentForm(false);
        setReplyingTo(null);
        fetchComments();
      } else {
        setCommentError(data.error || "评论发送失败");
      }
    } catch (error) {
      setCommentError("网络错误，请重试");
    } finally {
      setSubmittingComment(false);
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

    // 普通用户显示等级
    const level = getLevelFromExperience(user.experience);
    return (
      <span className="px-2 py-0.5 text-xs rounded font-medium bg-gray-600/40 text-gray-300">
        LV{level}
      </span>
    );
  };

  const backdropUrl = resource.backdropPath ? getImageUrl(resource.backdropPath, "original") : null;

  return (
    <div className="pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
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

        <div className="liquid-glass rounded-2xl relative">
          {backdropUrl && (
            <div 
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{
                backgroundImage: `url(${backdropUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.22,
              }}
            />
          )}
          <div className="md:flex relative z-10">
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
                  <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 p-6 md:p-8">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-2 py-1 glass-tag-dark text-white rounded text-xs shrink-0">
                      {getTypeLabel(resource.type)}
                    </span>
                    {resource.rating != null && (
                      <span className="px-2 py-1 glass-tag-amber text-white rounded text-xs shrink-0">
                        ★ {Number(resource.rating).toFixed(1)}
                      </span>
                    )}
                    {(resource.year || resource.country) && (
                      <span className="text-gray-400 text-sm whitespace-nowrap">
                        {resource.year}
                        {resource.year && resource.country ? " · " : ""}
                        {resource.country || ""}
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

                {canEdit && (
                  <button
                    onClick={handleDeleteResource}
                    className="shrink-0 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm flex items-center gap-1.5 border border-red-500/20"
                    title="删除资源"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    删除
                  </button>
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
                    onClick={() => setShowAddLink(!showAddLink)}
                    className="px-4 py-2 glass-strong hover:bg-white/15 text-white rounded-lg transition-colors text-sm"
                  >
                    {showAddLink ? "取消" : "+ 添加链接"}
                  </button>
                </div>
              )}

              {(resource.links || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {(resource.links || []).map((link) => (
                    <div key={link.id} className="inline-flex items-center gap-0.5 group">
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
                            if (confirm(`确定删除链接「${link.label}」吗？`)) {
                              handleDeleteLink(link.id);
                            }
                          }}
                          className="ml-0.5 p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-60 group-hover:opacity-100"
                          title="删除链接"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
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
                  国家/地区
                </label>
                <GlassSelect
                  value={editForm.country || ""}
                  onChange={(v) =>
                    setEditForm({ ...editForm, country: v })
                  }
                  options={COUNTRY_EDIT_OPTIONS}
                  placeholder="请选择"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  评分
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={editForm.rating}
                  onChange={(e) =>
                    setEditForm({ ...editForm, rating: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="如：8.5"
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
                <GlassSelect
                  value={editForm.status || ""}
                  onChange={(v) =>
                    setEditForm({ ...editForm, status: v })
                  }
                  options={STATUS_EDIT_OPTIONS}
                  placeholder="未知"
                />
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
                  className="px-6 py-2 glass-strong hover:bg-white/15 text-white rounded-lg transition-colors"
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
                  className="px-6 py-2 glass-strong hover:bg-white/15 text-white rounded-lg transition-colors"
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
              评论 ({comments.reduce((sum, c) => sum + 1 + ((c as any).replies?.length || 0), 0)})
            </h2>
            {session && (
              <button
                onClick={() => {
                  setShowCommentForm(!showCommentForm);
                  if (!showCommentForm) {
                    setReplyingTo(null);
                  }
                }}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {showCommentForm ? "取消" : "+ 发表评论"}
              </button>
            )}
          </div>

          {showCommentForm && session && (
            <form onSubmit={handleAddComment} className="mb-6">
              {commentError && (
                <div className="mb-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm">
                  {commentError}
                </div>
              )}
              {replyingTo && (
                <div className="mb-2 px-3 py-2 bg-blue-500/10 text-blue-300 rounded-lg text-sm flex items-center justify-between">
                  <span>正在回复 @{replyingTo.user.username}</span>
                  <button
                    type="button"
                    onClick={() => { setReplyingTo(null); setShowCommentForm(false); }}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    取消回复
                  </button>
                </div>
              )}
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                rows={3}
                placeholder={replyingTo ? `回复 @${replyingTo.user.username}...` : "写下你的评论... (最多500字)"}
                maxLength={500}
                disabled={submittingComment}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-500 text-xs">
                  {newComment.length}/500
                </span>
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className="px-4 py-2 glass-strong hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                >
                  {submittingComment ? "发送中..." : (replyingTo ? "发送回复" : "发送评论")}
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
              <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              <p className="text-gray-400 text-sm">暂无评论，来发表第一条吧</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const isOwner = sessionUser?.id === comment.user.id;
                const canDeleteComment = isOwner || canAdminAction;
                const canPinComment = canAdminAction;
                const replies = (comment as any).replies || [];

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
                    {session && (
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            setReplyingTo(comment);
                            setShowCommentForm(true);
                          }}
                          className="text-xs text-gray-500 hover:text-blue-400 transition-colors"
                        >
                          回复
                        </button>
                      </div>
                    )}

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="mt-3 pl-4 border-l-2 border-white/10 space-y-3">
                        {replies.map((reply: Comment) => {
                          const replyIsOwner = sessionUser?.id === reply.user.id;
                          const canDeleteReply = replyIsOwner || canAdminAction;
                          return (
                            <div key={reply.id} className="glass rounded-lg p-3 bg-white/[0.02]">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/user/${reply.user.username}`}
                                    className="text-white text-sm font-medium hover:text-blue-400 transition-colors"
                                  >
                                    {reply.user.username}
                                  </Link>
                                  {getCommentUserBadge(reply.user)}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 text-xs">
                                    {new Date(reply.createdAt).toLocaleString("zh-CN")}
                                  </span>
                                  {canDeleteReply && (
                                    <button
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                    >
                                      删除
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {reply.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}