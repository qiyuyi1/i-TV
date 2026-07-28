"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getImageUrl } from "@/lib/tmdb";

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
  const [searchType, setSearchType] = useState("multi");
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<TMDBDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResults([]);

    const res = await fetch(
      `/api/tmdb/search?query=${encodeURIComponent(query)}&type=${searchType}`
    );
    const data = await res.json();
    setResults(data);
    setLoading(false);
  };

  const handleSelectItem = async (item: TMDBResult) => {
    const type = item.media_type === "tv" ? "tv" : "movie";
    setLoading(true);

    try {
      const res = await fetch(`/api/tmdb/${item.id}?type=${type}`);
      const data = await res.json();
      setSelectedItem(data);
    } catch (error) {
      console.error("Failed to fetch details:", error);
    }

    setLoading(false);
  };

  const handleAddToDatabase = async () => {
    if (!selectedItem) return;

    setAdding(true);

    const type = selectedItem.number_of_episodes ? "tv" : "movie";
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
        type,
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
    } else {
      const data = await res.json();
      alert(data.error || "添加失败");
      setAdding(false);
    }
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
            从 TMDB 搜索并添加你想要分享的影视资源
          </p>
        </div>

        {!selectedItem ? (
          <>
            <form onSubmit={handleSearch} className="glass rounded-2xl p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="输入影片或剧集名称搜索..."
                    className="w-full px-4 py-3 pl-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                  onChange={(e) => setSearchType(e.target.value)}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="multi">全部类型</option>
                  <option value="movie">电影</option>
                  <option value="tv">剧集</option>
                </select>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                >
                  {loading ? "搜索中..." : "搜索"}
                </button>
              </div>
            </form>

            {results.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  搜索结果
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
                            {(item.release_date || item.first_air_date || "").substring(
                              0,
                              4
                            )}
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
            {selectedItem.backdrop_path && (
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
                  {selectedItem.poster_path ? (
                    <img
                      src={getImageUrl(selectedItem.poster_path, "w500")}
                      alt={selectedItem.title}
                      className="w-full aspect-[2/3] object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-800 rounded-xl flex items-center justify-center">
                      <span className="text-5xl">🎬</span>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
                      {selectedItem.number_of_episodes ? "剧集" : "电影"}
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
                      <span>{selectedItem.number_of_episodes} 集</span>
                      {selectedItem.status && (
                        <span>状态: {selectedItem.status}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={() => setSelectedItem(null)}
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
