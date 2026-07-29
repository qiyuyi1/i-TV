"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getImageUrl } from "@/lib/tmdb";
import {
  RESOURCE_TYPES,
  getTypeLabel,
  getTMDBSearchType,
  getResourceType,
} from "@/lib/resourceTypes";

interface TMDBResult {
  id: number;
  title: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  media_type: string;
  genre_ids: number[];
  vote_average: number;
}

interface TMDBDetails {
  id: number;
  title: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  genres: Array<{ id: number; name: string }>;
  vote_average: number;
  number_of_episodes?: number;
  number_of_seasons?: number;
  status?: string;
  type?: string;
}

export default function AddResourcePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("movie");
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<TMDBDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searchError, setSearchError] = useState("");

  // 手动创建表单状态（用于独家制作等）
  const [manualMode, setManualMode] = useState(false);
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

  // 用户最终选择的保存类型（可能不同于搜索类型）
  const [finalType, setFinalType] = useState("movie");

  const currentSearchTypeInfo = getResourceType(searchType);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    // 如果选择了不通过 TMDB 搜索的类型，直接进入手动创建
    if (searchType === "exclusive" || !currentSearchTypeInfo?.tmdbSearchType) {
      setManualMode(true);
      setResults([]);
      setSearchError("");
      setFinalType(searchType);
      return;
    }

    if (!query.trim()) return;

    setLoading(true);
    setResults([]);
    setSearchError("");
    setManualMode(false);

    const tmdbSearchType = getTMDBSearchType(searchType);

    try {
      const res = await fetch(
        `/api/tmdb/search?query=${encodeURIComponent(
          query
        )}&type=${tmdbSearchType}`
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        // 如果搜索类型有指定 genre，优先过滤匹配的结果
        const typeInfo = getResourceType(searchType);
        let filtered = data;
        if (typeInfo?.tmdbGenreId) {
          filtered = data.filter(
            (item: TMDBResult) =>
              item.genre_ids?.includes(typeInfo.tmdbGenreId!) ||
              (item.media_type === searchType)
          );
          // 如果过滤后没结果，就用原始结果
          if (filtered.length === 0) filtered = data;
        }
        setResults(filtered);
        setFinalType(searchType);
      } else {
        setResults([]);
        setSearchError(data.error || "搜索失败，未找到相关结果");
      }
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
      setSearchError("网络请求失败，请稍后重试");
    }

    setLoading(false);
  };

  const handleSelectItem = async (item: TMDBResult) => {
    // 确定用什么类型去查详情
    const typeInfo = getResourceType(searchType);
    const detailType =
      typeInfo?.tmdbDetailType ||
      (item.media_type === "tv" ? "tv" : "movie");

    setLoading(true);

    try {
      const res = await fetch(
        `/api/tmdb/${item.id}?type=${detailType}`
      );
      const data = await res.json();
      setSelectedItem(data);
      // 根据搜索类型设置保存类型
      setFinalType(searchType);
    } catch (error) {
      console.error("Failed to fetch details:", error);
    }

    setLoading(false);
  };

  const handleAddToDatabase = async () => {
    if (manualMode) {
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
      setAdding(false);
      return;
    }

    if (!selectedItem) return;

    setAdding(true);

    const releaseDate =
      selectedItem.release_date || selectedItem.first_air_date;
    const year = releaseDate ? releaseDate.substring(0, 4) : null;

    const res = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmdbId: String(selectedItem.id),
        title: selectedItem.title || selectedItem.name,
        originalTitle:
          selectedItem.original_title || selectedItem.original_name,
        posterPath: selectedItem.poster_path,
        backdropPath: selectedItem.backdrop_path,
        overview: selectedItem.overview,
        year,
        type: finalType,
        genres: selectedItem.genres?.map((g) => g.name) || [],
        rating: selectedItem.vote_average,
        totalEpisodes: selectedItem.number_of_episodes
          ? String(selectedItem.number_of_episodes)
          : null,
        status: selectedItem.status,
      }),
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
      setAdding(false);
    }
  };

  const resetAll = () => {
    setSelectedItem(null);
    setManualMode(false);
    setResults([]);
    setSearchError("");
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
            从 TMDB 搜索并添加，或直接手动创建任意类型的资源
          </p>
        </div>

        {!selectedItem && !manualMode ? (
          <>
            <form onSubmit={handleSearch} className="glass rounded-2xl p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      !currentSearchTypeInfo?.tmdbSearchType
                        ? "选择类型后点击手动创建"
                        : "输入影片或剧集名称搜索..."
                    }
                    disabled={!currentSearchTypeInfo?.tmdbSearchType}
                    className="w-full px-4 py-3 pl-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
                  />
                  <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>

                <select
                  value={searchType}
                  onChange={(e) => {
                    setSearchType(e.target.value);
                    setResults([]);
                    setSearchError("");
                    setManualMode(false);
                  }}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                >
                  {searchType === "exclusive"
                    ? "手动创建"
                    : loading
                    ? "搜索中..."
                    : "搜索"}
                </button>

                {searchType !== "exclusive" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setManualMode(true);
                      setResults([]);
                      setSearchError("");
                      setFinalType(searchType);
                    }}
                    className="px-6 py-3 glass glass-hover text-white rounded-xl font-medium transition-colors"
                  >
                    手动创建
                  </button>
                )}
              </div>

              {searchError && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between">
                  <div className="text-red-400 text-sm">
                    <span className="font-medium">搜索提示：</span>
                    {searchError}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setManualMode(true);
                      setResults([]);
                      setSearchError("");
                      setFinalType(searchType);
                    }}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-colors"
                  >
                    切换到手动创建 →
                  </button>
                </div>
              )}

              <p className="mt-3 text-gray-500 text-sm">
                提示：如果 TMDB 搜索不到结果，或搜索服务暂时不可用，可以直接点击"手动创建"按钮来添加资源。
              </p>
            </form>

            {results.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  搜索结果（当前分类：{getTypeLabel(searchType)}）
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {results.map((item) => (
                    <button
                      key={`${item.media_type}-${item.id}`}
                      onClick={() => handleSelectItem(item)}
                      disabled={item.media_type === "person"}
                      className={`group relative overflow-hidden rounded-xl glass glass-hover transition-all text-left ${
                        item.media_type === "person"
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <div className="aspect-[2/3] relative">
                        {item.poster_path ? (
                          <img
                            src={getImageUrl(item.poster_path, "w342")}
                            alt={item.title || item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                            <span className="text-4xl">🎬</span>
                          </div>
                        )}
                        <div className="absolute inset-0 poster-gradient" />
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs text-white">
                            {item.media_type === "tv"
                              ? "剧集"
                              : item.media_type === "movie"
                              ? "电影"
                              : item.media_type === "person"
                              ? "人物"
                              : item.media_type}
                          </span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <h3 className="text-white text-sm font-medium truncate">
                            {item.title || item.name}
                          </h3>
                          <p className="text-gray-400 text-xs">
                            {(
                              item.release_date ||
                              item.first_air_date ||
                              ""
                            ).substring(0, 4)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            {!manualMode && selectedItem?.backdrop_path && (
              <div
                className="h-48 bg-cover bg-center relative"
                style={{
                  backgroundImage: `url(${getImageUrl(
                    selectedItem.backdrop_path,
                    "w780"
                  )})`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
              </div>
            )}

            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-48 flex-shrink-0">
                  {!manualMode && selectedItem?.poster_path ? (
                    <img
                      src={getImageUrl(selectedItem.poster_path, "w500")}
                      alt={selectedItem.title}
                      className="w-full aspect-[2/3] object-cover rounded-xl"
                    />
                  ) : manualMode && manualForm.posterPath ? (
                    <img
                      src={manualForm.posterPath}
                      alt={manualForm.title}
                      className="w-full aspect-[2/3] object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-800 rounded-xl flex items-center justify-center">
                      <span className="text-5xl">🎬</span>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  {manualMode ? (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-1">
                          手动创建 {getTypeLabel(finalType)}
                        </h2>
                        <p className="text-gray-400 text-sm">
                          填写以下信息创建资源
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            海报图片 URL
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
                            placeholder="https://.../poster.jpg"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-gray-300 text-sm mb-1">
                            简介
                          </label>
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
                    </div>
                  ) : (
                    selectedItem && (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
                            {getTypeLabel(finalType)}
                          </span>
                          {selectedItem.vote_average > 0 && (
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                              ★ {selectedItem.vote_average.toFixed(1)}
                            </span>
                          )}
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-1">
                          {selectedItem.title || selectedItem.name}
                        </h2>

                        {(selectedItem.original_title ||
                          selectedItem.original_name) && (
                          <p className="text-gray-400 text-sm mb-2">
                            {selectedItem.original_title ||
                              selectedItem.original_name}
                          </p>
                        )}

                        {(selectedItem.release_date ||
                          selectedItem.first_air_date) && (
                          <p className="text-gray-400 text-sm mb-4">
                            {selectedItem.release_date ||
                              selectedItem.first_air_date}
                          </p>
                        )}

                        {selectedItem.genres?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {selectedItem.genres.map((genre) => (
                              <span
                                key={genre.id}
                                className="px-2 py-1 bg-white/10 text-gray-300 rounded text-xs"
                              >
                                {genre.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {selectedItem.overview && (
                          <p className="text-gray-300 text-sm leading-relaxed mb-4">
                            {selectedItem.overview}
                          </p>
                        )}

                        {selectedItem.number_of_episodes && (
                          <div className="flex gap-4 text-sm text-gray-400">
                            <span>共 {selectedItem.number_of_seasons} 季</span>
                            <span>
                              {selectedItem.number_of_episodes} 集
                            </span>
                            {selectedItem.status && (
                              <span>状态: {selectedItem.status}</span>
                            )}
                          </div>
                        )}
                      </>
                    )
                  )}
                </div>
              </div>

              {/* 类型选择：允许用户在保存前修改最终分类 */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <label className="block text-gray-300 text-sm mb-2">
                  保存分类（可修改）：
                </label>
                <select
                  value={finalType}
                  onChange={(e) => setFinalType(e.target.value)}
                  className="w-full md:w-64 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={resetAll}
                  className="px-6 py-3 glass glass-hover text-white rounded-xl transition-colors"
                >
                  重新选择
                </button>
                <button
                  onClick={handleAddToDatabase}
                  disabled={adding}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                >
                  {adding ? "添加中..." : "添加到资源库"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
