"use client";

import Link from "next/link";
import { getImageUrl } from "@/lib/tmdb";

interface ResourceCardProps {
  resource: {
    id: string;
    title: string;
    posterPath: string | null;
    year?: string | null;
    type: string;
    rating?: number | null;
    currentEpisode?: string | null;
    totalEpisodes?: string | null;
    status?: string | null;
    links?: Array<{ id: string }>;
  };
}

export default function ResourceCard({ resource }: ResourceCardProps) {
  const typeLabel = resource.type === "movie" ? "电影" : "剧集";
  const statusColor = {
    更新中: "text-blue-400",
    已完结: "text-green-400",
    待更新: "text-amber-400",
  };

  return (
    <Link
      href={`/resources/${resource.id}`}
      className="group relative overflow-hidden rounded-xl glass glass-hover transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10"
    >
      <div className="aspect-[2/3] relative overflow-hidden">
        {resource.posterPath ? (
          <img
            src={getImageUrl(resource.posterPath, "w500")}
            alt={resource.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-gray-500 text-4xl">🎬</span>
          </div>
        )}

        <div className="absolute inset-0 poster-gradient opacity-60 group-hover:opacity-80 transition-opacity" />

        <div className="absolute top-2 left-2 flex gap-2">
          <span className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs text-white">
            {typeLabel}
          </span>
          {resource.rating && (
            <span className="px-2 py-1 bg-amber-500/80 backdrop-blur-sm rounded text-xs text-white font-medium">
              ★ {resource.rating.toFixed(1)}
            </span>
          )}
        </div>

        {resource.currentEpisode && (
          <div className="absolute top-2 right-2">
            <span
              className={`px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs ${
                statusColor[
                  resource.status as keyof typeof statusColor
                ] || "text-white"
              }`}
            >
              {resource.currentEpisode}
              {resource.totalEpisodes ? `/${resource.totalEpisodes}` : ""}集
            </span>
          </div>
        )}

        {resource.links && resource.links.length > 0 && (
          <div className="absolute bottom-2 right-2">
            <span className="px-2 py-1 bg-blue-600/80 backdrop-blur-sm rounded text-xs text-white">
              {resource.links.length} 个资源
            </span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white font-semibold text-sm truncate group-hover:text-blue-400 transition-colors">
            {resource.title}
          </h3>
          {resource.year && (
            <p className="text-gray-400 text-xs mt-0.5">{resource.year}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
