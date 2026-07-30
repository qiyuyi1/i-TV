"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getUserTitle, getLevelFromExperience, getAssignableTitles } from "@/lib/constants";
import { getImageUrl } from "@/lib/image";

interface UserProfile {
  id: string;
  username: string;
  role: string;
  level: number;
  experience: number;
  title: string | null;
  isOwner: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  resources: Array<{
    id: string;
    title: string;
    type: string;
    posterPath: string | null;
  }>;
  links: Array<{
    id: string;
    type: string;
    quality: string;
    url: string;
    resource: { id: string; title: string };
  }>;
  _count: { comments: number; resources: number };
}

function TitleBadge({ title, level }: { title: string; level: number }) {
  if (title === "站长") {
    return (
      <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium border border-amber-500/30">
        {title}
      </span>
    );
  }
  if (title === "副站长") {
    return (
      <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium border border-orange-500/30">
        {title}
      </span>
    );
  }
  if (title === "管理员") {
    return (
      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium border border-blue-500/30">
        {title}
      </span>
    );
  }
  if (title) {
    return (
      <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium border border-purple-500/30">
        {title}
      </span>
    );
  }
  return (
    <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm font-medium">
      {"LV"}{level}
    </span>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const { data: session } = useSession();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.username) {
      fetchUser();
    }
  }, [params.username]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/${params.username}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (error) {
      console.error("Fetch user error:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="pt-20 min-h-screen">
        <div className="max-w-4xl mx-auto px-4">
          <div className="glass rounded-2xl p-8 animate-pulse">
            <div className="h-8 w-48 bg-white/10 rounded mb-4" />
            <div className="h-4 w-32 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">用户不存在</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const title = getUserTitle(user);
  const level = getLevelFromExperience(user.experience);
  const isOwner = session?.user && (session.user as any).isOwner;
  const isSuperAdmin = session?.user && (session.user as any).isSuperAdmin;
  const canEditUser = isOwner || (isSuperAdmin && !user.isOwner && !user.isSuperAdmin);
  const isSpecialUser = user.isOwner || user.isSuperAdmin || user.role === "ADMIN";

  const requesterInfo = {
    role: (session?.user as any)?.role,
    isOwner: (session?.user as any)?.isOwner,
    isSuperAdmin: (session?.user as any)?.isSuperAdmin,
  };

  const assignableTitles = getAssignableTitles(requesterInfo);

  const handleAssignTitle = async (titleValue: string | null) => {
    try {
      const res = await fetch(`/api/admin/users/${user.username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleValue }),
      });
      if (res.ok) fetchUser();
    } catch (err) {
      console.error("Assign title error:", err);
    }
  };

  const renderPoster = (posterPath: string | null, title: string) => {
    if (!posterPath) {
      return (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <span className="text-4xl">🎬</span>
        </div>
      );
    }
    const imgUrl = getImageUrl(posterPath, "w342");
    if (!imgUrl) {
      return (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <span className="text-4xl">🎬</span>
        </div>
      );
    }
    return (
      <img
        src={imgUrl}
        alt={title}
        className="w-full h-full object-cover"
      />
    );
  };

  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass rounded-2xl p-6 md:p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{user.username}</h1>
              <div className="flex items-center gap-2 mt-2">
                <TitleBadge title={title} level={level} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center glass rounded-xl p-3">
              <div className="text-2xl font-bold text-white">{"LV"}{level}</div>
              <div className="text-gray-400 text-xs">等级</div>
            </div>
            <div className="text-center glass rounded-xl p-3">
              <div className="text-2xl font-bold text-white">{user.experience}</div>
              <div className="text-gray-400 text-xs">经验值</div>
            </div>
            <div className="text-center glass rounded-xl p-3">
              <div className="text-2xl font-bold text-white">{user._count.resources}</div>
              <div className="text-gray-400 text-xs">添加资源</div>
            </div>
            <div className="text-center glass rounded-xl p-3">
              <div className="text-2xl font-bold text-white">{user._count.comments}</div>
              <div className="text-gray-400 text-xs">评论数</div>
            </div>
          </div>

          {canEditUser && user.username !== (session?.user as any)?.username && assignableTitles.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {assignableTitles.map((t) => (
                <button
                  key={t.value === null ? "clear" : t.value}
                  onClick={() => handleAssignTitle(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    t.value === null
                      ? "bg-gray-600 hover:bg-gray-700 text-white"
                      : t.value === "站长"
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : t.value === "副站长"
                      ? "bg-orange-600 hover:bg-orange-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">📦 添加的资源</h2>
          {user.resources.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {user.resources.map((resource) => (
                <Link
                  key={resource.id}
                  href={`/resources/${resource.id}`}
                  className="glass glass-hover rounded-xl overflow-hidden block"
                >
                  <div className="aspect-[2/3]">
                    {renderPoster(resource.posterPath, resource.title)}
                  </div>
                  <div className="p-2">
                    <div className="text-white text-sm truncate">{resource.title}</div>
                    <div className="text-gray-400 text-xs">{resource.type}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">还没有添加任何资源</p>
          )}
        </div>

        {user.links.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">🔗 添加的链接</h2>
            <div className="space-y-2">
              {user.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass glass-hover rounded-xl p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                        {link.type}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                        {link.quality}
                      </span>
                      <span className="text-white">{link.resource.title}</span>
                    </div>
                  </div>
                  <span className="text-blue-400 text-sm">访问 →</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
