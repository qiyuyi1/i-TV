"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import ResourceCard from "@/components/ResourceCard";
import { RESOURCE_TYPES, getTypeLabel } from "@/lib/resourceTypes";

interface Resource {
  id: string;
  title: string;
  posterPath: string | null;
  year: string | null;
  type: string;
  rating: number | null;
  country: string | null;
  currentEpisode: string | null;
  totalEpisodes: string | null;
  status: string | null;
  links: Array<{ id: string }>;
}

const COUNTRY_OPTIONS = [
  { value: "all", label: "全部" },
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

const SORT_OPTIONS = [
  { value: "createdAt", order: "desc", label: "最新发布" },
  { value: "rating", order: "desc", label: "评分从高到低" },
  { value: "rating", order: "asc", label: "评分从低到高" },
  { value: "year", order: "desc", label: "年份从新到旧" },
  { value: "year", order: "asc", label: "年份从旧到新" },
];

export default function HomePage() {
  const { data: session } = useSession();
  const [resources, setResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("all");
  const [year, setYear] = useState("all");
  const [minRating, setMinRating] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchResources();
  }, [filter, country, year, minRating, sortBy, sortOrder]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.append("type", filter);
      if (country !== "all") params.append("country", country);
      if (year !== "all") params.append("year", year);
      if (minRating !== "all") params.append("minRating", minRating);
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
      const res = await fetch(`/api/resources?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setResources(data);
      } else {
        console.error("Failed to fetch resources:", data);
        setResources([]);
      }
    } catch (error) {
      console.error("Fetch resources error:", error);
      setResources([]);
    }
    setLoading(false);
  };

  const filteredResources = Array.isArray(resources) ? resources.filter((r) => {
    if (!search) return true;
    return (
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r as any).originalTitle?.toLowerCase().includes(search.toLowerCase())
    );
  }) : [];

  const yearOptions = ["all", ...Array.from(new Set(resources.filter(r => r.year).map(r => r.year!))).sort().reverse()];

  const hasActiveFilters = filter !== "all" || country !== "all" || year !== "all" || minRating !== "all";

  const clearFilters = () => {
    setFilter("all");
    setCountry("all");
    setYear("all");
    setMinRating("all");
  };

  return (
    <div className="pt-20 pb-16 min-h-screen relative">
      {/* Decorative gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Section */}
        <div className="mb-10">
          <div className="glass rounded-3xl p-6 md:p-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                    i帅TV
                  </h1>
                  <p className="text-gray-300 text-lg">
                    ✨ 超级无敌强大的资源站
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-3">
                  <div className="glass rounded-xl px-4 py-2 text-center">
                    <div className="text-2xl font-bold text-white">{resources.length}</div>
                    <div className="text-xs text-gray-400">资源</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="🔍 搜索影片名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-transparent text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl transition-all flex items-center gap-2 ${
                showFilters || hasActiveFilters
                  ? "bg-blue-600 text-white"
                  : "glass text-gray-300 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>筛选</span>
              {hasActiveFilters && (
                <span className="ml-1 w-2 h-2 bg-amber-400 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="glass rounded-2xl p-6 mb-6 space-y-4 animate-in slide-in-from-top-2">
            {/* Type Filter */}
            <div>
              <label className="text-gray-300 text-sm mb-2 block">类型</label>
              <div className="flex gap-2 flex-wrap">
                {["all", ...RESOURCE_TYPES.map((t) => t.value)].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-4 py-2 rounded-xl text-sm transition-all ${
                      filter === type
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                        : "bg-white/5 text-gray-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {type === "all" ? "全部" : getTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* Country Filter */}
            <div>
              <label className="text-gray-300 text-sm mb-2 block">国家/地区</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {COUNTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Year Filter */}
              <div>
                <label className="text-gray-300 text-sm mb-2 block">年份</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="all" className="bg-gray-900 text-white">全部年份</option>
                  {yearOptions.filter(y => y !== "all").map((y) => (
                    <option key={y} value={y} className="bg-gray-900 text-white">{y}年</option>
                  ))}
                </select>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="text-gray-300 text-sm mb-2 block">最低评分</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="all" className="bg-gray-900 text-white">不限</option>
                  <option value="9" className="bg-gray-900 text-white">9.0+</option>
                  <option value="8" className="bg-gray-900 text-white">8.0+</option>
                  <option value="7" className="bg-gray-900 text-white">7.0+</option>
                  <option value="6" className="bg-gray-900 text-white">6.0+</option>
                </select>
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="text-gray-300 text-sm mb-2 block">排序方式</label>
              <div className="flex gap-2 flex-wrap">
                {SORT_OPTIONS.map((opt) => {
                  const isActive = sortBy === opt.value && sortOrder === opt.order;
                  return (
                    <button
                      key={`${opt.value}-${opt.order}`}
                      onClick={() => {
                        setSortBy(opt.value);
                        setSortOrder(opt.order);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                          : "bg-white/5 text-gray-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  ✕ 清除所有筛选
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active filter tags */}
        {hasActiveFilters && !showFilters && (
          <div className="flex gap-2 flex-wrap mb-4">
            {filter !== "all" && (
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs border border-blue-500/30">
                类型: {getTypeLabel(filter)}
              </span>
            )}
            {country !== "all" && (
              <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs border border-green-500/30">
                国家: {COUNTRY_OPTIONS.find(c => c.value === country)?.label}
              </span>
            )}
            {year !== "all" && (
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs border border-purple-500/30">
                年份: {year}年
              </span>
            )}
            {minRating !== "all" && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs border border-amber-500/30">
                评分: {minRating}+
              </span>
            )}
          </div>
        )}

        {/* Resource Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] rounded-2xl glass animate-pulse"
              />
            ))}
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="glass rounded-2xl py-20 text-center">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl text-white mb-2">暂无资源</h3>
            <p className="text-gray-400 mb-6">
              {session
                ? "成为第一个添加资源的人吧！"
                : "登录后即可添加影视资源"}
            </p>
            {session && (
              <a
                href="/resources/add"
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/25"
              >
                添加资源
              </a>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}