"use client";

import Link from "next/link";
import { getImageUrl } from "@/lib/image";
import { getTypeLabel } from "@/lib/resourceTypes";

interface ResourceCardProps {
  resource: {
    id: string;
    title: string;
    posterPath: string | null;
    year?: string | null;
    type: string;
    rating?: number | null;
    country?: string | null;
    currentEpisode?: string | null;
    totalEpisodes?: string | null;
    status?: string | null;
    links?: Array<{ id: string }>;
  };
}

function IconFilm({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

export default function ResourceCard({ resource }: ResourceCardProps) {
  const typeLabel = getTypeLabel(resource.type);
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
            <IconFilm className="w-12 h-12 text-gray-600" />
          </div>
        )}

        <div className="absolute inset-0 poster-gradient opacity-60 group-hover:opacity-80 transition-opacity" />

        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="px-2 py-0.5 glass text-white rounded text-xs sm:text-sm">
            {typeLabel}
          </span>
        </div>

        {resource.rating && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 glass text-white rounded text-xs sm:text-sm font-medium">
              ★ {resource.rating.toFixed(1)}
            </span>
          </div>
        )}

        {resource.currentEpisode && (
          <div className="absolute top-9 right-2">
            <span
              className={`px-2 py-0.5 glass rounded text-xs sm:text-sm whitespace-nowrap ${
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
            <span className="px-2 py-1 glass text-white rounded text-xs">
              {resource.links.length} 个资源
            </span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white font-semibold text-sm truncate group-hover:text-blue-400 transition-colors">
            {resource.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            {resource.year && (
              <span className="text-gray-300 text-xs">{resource.year}</span>
            )}
            {resource.country && (
              <span className="text-gray-300 text-xs">· {resource.country}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
