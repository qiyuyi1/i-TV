"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import ResourceCard from "@/components/ResourceCard";

interface Resource {
  id: string;
  title: string;
  posterPath: string | null;
  year: string | null;
  type: string;
  rating: number | null;
  currentEpisode: string | null;
  totalEpisodes: string | null;
  status: string | null;
  links: Array<{ id: string }>;
}

export default function HomePage() {
  const { data: session } = useSession();
  const [resources, setResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
  }, [filter]);

  const fetchResources = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.append("type", filter);
    const res = await fetch(`/api/resources?${params}`);
    const data = await res.json();
    setResources(data);
    setLoading(false);
  };

  const filteredResources = resources.filter((r) => {
    if (!search) return true;
    return (
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r as any).originalTitle?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">影视资源库</h1>
          <p className="text-gray-400">
            发现和分享精彩的电影与剧集资源
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="搜索影片名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 pl-12 glass rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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

          <div className="flex gap-2">
            {["all", "movie", "tv"].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-3 rounded-xl transition-all ${
                  filter === type
                    ? "bg-blue-600 text-white"
                    : "glass text-gray-300 hover:text-white"
                }`}
              >
                {type === "all" ? "全部" : type === "movie" ? "电影" : "剧集"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] rounded-xl glass animate-pulse"
              />
            ))}
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl text-gray-300 mb-2">暂无资源</h3>
            <p className="text-gray-500 mb-6">
              {session
                ? "成为第一个添加资源的人吧！"
                : "登录后即可添加影视资源"}
            </p>
            {session && (
              <a
                href="/resources/add"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
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
