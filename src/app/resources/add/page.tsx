"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getImageUrl } from "@/lib/image";
import { RESOURCE_TYPES, getTypeLabel } from "@/lib/resourceTypes";

export default function AddResourcePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [adding, setAdding] = useState(false);
  const [finalType, setFinalType] = useState("movie");

  const [manualForm, setManualForm] = useState({
    title: "",
    originalTitle: "",
    overview: "",
    year: "",
    posterPath: "",
    backdropPath: "",
    rating: "",
    genres: "",
    totalEpisodes: "",
    status: "",
  });

  const handleAddToDatabase = async () => {
    if (!manualForm.title.trim()) {
      alert("请输入标题");
      return;
    }

    setAdding(true);

    const payload = {
      tmdbId: `manual-${Date.now()}`,
      title: manualForm.title.trim(),
      originalTitle: manualForm.originalTitle.trim() || null,
      posterPath: manualForm.posterPath.trim() || null,
      backdropPath: manualForm.backdropPath.trim() || null,
      overview: manualForm.overview.trim() || null,
      year: manualForm.year.trim() || null,
      type: finalType,
      genres: manualForm.genres
        ? manualForm.genres
            .split(/[,，]/)
            .map((g) => g.trim())
            .filter(Boolean)
        : [],
      rating: manualForm.rating ? parseFloat(manualForm.rating) : null,
      totalEpisodes: manualForm.totalEpisodes.trim() || null,
      status: manualForm.status.trim() || null,
    };

    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const resource = await res.json();
        router.push(`/resources/${resource.id}`);
      } else if (res.status === 409) {
        const data = await res.json();
        if (data.resourceId) {
          router.push(`/resources/${data.resourceId}`);
        } else {
          alert(data.error || "该资源已存在");
        }
      } else {
        const data = await res.json();
        alert(data.error || "添加失败");
      }
    } catch (err) {
      alert("网络请求失败");
    }
    setAdding(false);
  };

  const resetAll = () => {
    setManualForm({
      title: "",
      originalTitle: "",
      overview: "",
      year: "",
      posterPath: "",
      backdropPath: "",
      rating: "",
      genres: "",
      totalEpisodes: "",
      status: "",
    });
  };

  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 mb-4"
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
            返回首页
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">添加影视资源</h1>
          <p className="text-gray-400">
            手动创建资源，添加后其他用户即可查看和分享链接
          </p>
        </div>

        <div className="glass rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
              {getTypeLabel(finalType)}
            </span>
            <span className="text-gray-400 text-sm">手动创建</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-gray-300 text-sm mb-1">
                分类 *
              </label>
              <select
                value={finalType}
                onChange={(e) => setFinalType(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-gray-900 text-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-300 text-sm mb-1">
                标题 *
              </label>
              <input
                type="text"
                value={manualForm.title}
                onChange={(e) =>
                  setManualForm({
                    ...manualForm,
                    title: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="如：独家节目第一季"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">
                原名
              </label>
              <input
                type="text"
                value={manualForm.originalTitle}
                onChange={(e) =>
                  setManualForm({
                    ...manualForm,
                    originalTitle: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="选填"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">
                年份
              </label>
              <input
                type="text"
                value={manualForm.year}
                onChange={(e) =>
                  setManualForm({
                    ...manualForm,
                    year: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="如：2025"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">
                评分
              </label>
              <input
                type="text"
                value={manualForm.rating}
                onChange={(e) =>
                  setManualForm({
                    ...manualForm,
                    rating: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="如：8.5"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">
                总集数
              </label>
              <input
                type="text"
                value={manualForm.totalEpisodes}
                onChange={(e) =>
                  setManualForm({
                    ...manualForm,
                    totalEpisodes: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="如：12"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">
                更新状态
              </label>
              <select
                value={manualForm.status}
                onChange={(e) =>
                  setManualForm({
                    ...manualForm,
                    status: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="" className="bg-gray-900 text-white">未知</option>
                <option value="更新中" className="bg-gray-900 text-white">更新中</option>
                <option value="已完结" className="bg-gray-900 text-white">已完结</option>
                <option value="待更新" className="bg-gray-900 text-white">待更新</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-300 text-sm mb-1">
                分类标签（用逗号分隔）
              </label>
              <input
                type="text"
                value={manualForm.genres}
                onChange={(e) =>
                  setManualForm({
                    ...manualForm,
                    genres: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="如：动作,科幻,冒险"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-300 text-sm mb-1">
                海报图片
              </label>
              <input
                type="text"
                value={manualForm.posterPath}
                onChange={(e) =>
                  setManualForm({
                    ...manualForm,
                    posterPath: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="任意图片URL即可"
              />
              {manualForm.posterPath && (
                <div className="mt-2">
                  <img
                    src={getImageUrl(manualForm.posterPath, "w185")}
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
              <label className="block text-gray-300 text-sm mb-1">
                背景图（用于详情页背景效果）
              </label>
              <input
                type="text"
                value={manualForm.backdropPath}
                onChange={(e) =>
                  setManualForm({
                    ...manualForm,
                    backdropPath: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="任意图片URL即可（可选）"
              />
              {manualForm.backdropPath && (
                <div className="mt-2">
                  <img
                    src={getImageUrl(manualForm.backdropPath, "w300")}
                    alt="背景预览"
                    className="w-full h-32 object-cover rounded-lg border border-white/10"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-300 text-sm mb-1">简介</label>
              <textarea
                rows={4}
                value={manualForm.overview}
                onChange={(e) =>
                  setManualForm({
                    ...manualForm,
                    overview: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="写点什么..."
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-6 pt-6 border-t border-white/10">
            <button
              onClick={resetAll}
              className="px-6 py-3 glass glass-hover text-white rounded-xl transition-colors"
            >
              重置
            </button>
            <button
              onClick={handleAddToDatabase}
              disabled={adding || !manualForm.title.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
            >
              {adding ? "添加中..." : "添加到资源库"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
