"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import ResourceCard from "@/components/ResourceCard";
import GlassSelect from "@/components/GlassSelect";
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

const YEAR_OPTIONS = [
  { value: "all", label: "全部年份" },
  { value: "2020-2030", label: "2020-2030年" },
  { value: "2010-2020", label: "2010-2020年" },
  { value: "2000-2010", label: "2000-2010年" },
  { value: "1990-2000", label: "1990-2000年" },
  { value: "1980-1990", label: "1980-1990年" },
  { value: "1970-1980", label: "1970-1980年" },
  { value: "1970以前", label: "1970年以前" },
];

const RATING_OPTIONS = [
  { value: "all", label: "不限" },
  { value: "9-10", label: "9-10分" },
  { value: "8-9", label: "8-9分" },
  { value: "7-8", label: "7-8分" },
  { value: "6-7", label: "6-7分" },
  { value: "5-6", label: "5-6分" },
  { value: "0-5", label: "5分以下" },
];

const SORT_OPTIONS = [
  { value: "createdAt", order: "desc", label: "最新发布" },
  { value: "rating", order: "desc", label: "评分从高到低" },
  { value: "rating", order: "asc", label: "评分从低到高" },
  { value: "year", order: "desc", label: "年份从新到旧" },
  { value: "year", order: "asc", label: "年份从旧到新" },
];

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" />
      <path d="M19 14L19.75 16.25L22 17L19.75 17.75L19 20L18.25 17.75L16 17L18.25 16.25L19 14Z" opacity="0.7" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

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

  const hasActiveFilters = filter !== "all" || country !== "all" || year !== "all" || minRating !== "all";

  const clearFilters = () => {
    setFilter("all");
    setCountry("all");
    setYear("all");
    setMinRating("all");
  };

  const getYearLabel = (v: string) => {
    const opt = YEAR_OPTIONS.find((o) => o.value === v);
    return opt?.label || v;
  };

  const getRatingLabel = (v: string) => {
    const opt = RATING_OPTIONS.find((o) => o.value === v);
    return opt?.label || v;
  };

  return (
    <div className="pt-20 pb-16 min-h-screen relative">
      {/* Decorative gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="liquid-glass rounded-3xl p-6 md:p-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 via-transparent to-purple-500/3" />
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                    i帅TV
                  </h1>
                  <p className="text-gray-300 text-lg flex items-center gap-2">
                    <SparkleIcon className="w-5 h-5 text-blue-400" />
                    超级无敌强大的资源站
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-3">
                  <div className="glass-strong rounded-xl px-5 py-2.5 text-center">
                    <div className="text-2xl font-bold text-white">{resources.length}</div>
                    <div className="text-xs text-gray-400">资源</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-5">
          <div className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="搜索影片名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 pl-11 bg-transparent text-white placeholder-gray-500 focus:outline-none text-[15px]"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl transition-all flex items-center gap-2 ${
                showFilters || hasActiveFilters
                  ? "glass-strong text-white"
                  : "glass text-gray-300 hover:text-white"
              }`}
            >
              <FilterIcon className="w-4 h-4" />
              <span className="text-sm">筛选</span>
              {hasActiveFilters && (
                <span className="ml-1 w-1.5 h-1.5 bg-amber-400 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="glass rounded-2xl p-6 mb-6 space-y-5">
            {/* Type Filter */}
            <div>
              <label className="text-gray-400 text-xs mb-2 block uppercase tracking-wider">类型</label>
              <div className="flex gap-2 flex-wrap">
                {["all", ...RESOURCE_TYPES.map((t) => t.value)].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
                      filter === type
                        ? "glass-strong text-white"
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
              <label className="text-gray-400 text-xs mb-2 block uppercase tracking-wider">国家/地区</label>
              <GlassSelect
                value={country}
                onChange={setCountry}
                options={COUNTRY_OPTIONS}
                placeholder="选择国家/地区"
                className="sm:w-64"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Year Filter */}
              <div>
                <label className="text-gray-400 text-xs mb-2 block uppercase tracking-wider">年份</label>
                <GlassSelect
                  value={year}
                  onChange={setYear}
                  options={YEAR_OPTIONS}
                  placeholder="选择年份"
                />
              </div>

              {/* Rating Filter */}
              <div>
                <label className="text-gray-400 text-xs mb-2 block uppercase tracking-wider">评分</label>
                <GlassSelect
                  value={minRating}
                  onChange={setMinRating}
                  options={RATING_OPTIONS}
                  placeholder="选择评分区间"
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="text-gray-400 text-xs mb-2 block uppercase tracking-wider">排序方式</label>
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
                          ? "glass-strong text-white"
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
              <div className="flex justify-end pt-2">
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
              <span className="px-3 py-1 bg-white/5 text-gray-200 rounded-full text-xs border border-white/10">
                类型: {getTypeLabel(filter)}
              </span>
            )}
            {country !== "all" && (
              <span className="px-3 py-1 bg-white/5 text-gray-200 rounded-full text-xs border border-white/10">
                国家: {COUNTRY_OPTIONS.find(c => c.value === country)?.label}
              </span>
            )}
            {year !== "all" && (
              <span className="px-3 py-1 bg-white/5 text-gray-200 rounded-full text-xs border border-white/10">
                年份: {getYearLabel(year)}
              </span>
            )}
            {minRating !== "all" && (
              <span className="px-3 py-1 bg-white/5 text-gray-200 rounded-full text-xs border border-white/10">
                评分: {getRatingLabel(minRating)}
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
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <h3 className="text-xl text-white mb-2">暂无资源</h3>
            <p className="text-gray-400 mb-6">
              {session
                ? "成为第一个添加资源的人吧！"
                : "登录后即可添加影视资源"}
            </p>
            {session && (
              <a
                href="/resources/add"
                className="inline-block px-6 py-3 glass-strong text-white rounded-xl transition-all hover:bg-white/15"
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
