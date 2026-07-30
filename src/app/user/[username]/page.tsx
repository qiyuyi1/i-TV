"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getUserTitle, getLevelFromExperience, getAssignableTitles, XP_RULES } from "@/lib/constants";
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

function IconChartBar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16V10m4 6V6m4 10v-8m4 8V8" />
    </svg>
  );
}

function IconEdit({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function IconLink({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function IconMessage({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}

function IconPackage({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function IconFilm({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" />
      <path d="M19 14L19.75 16.25L22 17L19.75 17.75L19 20L18.25 17.75L16 17L18.25 16.25L19 14Z" opacity="0.7" />
    </svg>
  );
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

function XPRulesCard() {
  const rules = [
    { action: "创建资源", xp: `+${XP_RULES.CREATE_RESOURCE} XP`, cap: `每日上限 ${XP_RULES.CREATE_RESOURCE_DAILY_CAP} XP`, icon: IconEdit, color: "from-blue-500 to-cyan-500" },
    { action: "添加网盘链接", xp: `+${XP_RULES.ADD_LINK} XP`, cap: "无每日上限", icon: IconLink, color: "from-green-500 to-emerald-500" },
    { action: "发表评论", xp: `+${XP_RULES.COMMENT} XP`, cap: `每日上限 ${XP_RULES.COMMENT_DAILY_CAP} XP`, icon: IconMessage, color: "from-purple-500 to-pink-500" },
    { action: "每日登录", xp: `+${XP_RULES.DAILY_LOGIN} XP`, cap: "每天一次（不扣除）", icon: IconSun, color: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="glass rounded-2xl p-6 mb-6">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <IconChartBar className="w-5 h-5 text-blue-400" />
        经验值规则
        <span className="text-xs text-gray-400 ml-2 font-normal">每200经验值升一级</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {rules.map((rule) => (
          <div
            key={rule.action}
            className="glass glass-hover rounded-xl p-4 transition-all border border-white/5"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${rule.color} flex items-center justify-center mb-3`}>
              <rule.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-white font-medium text-sm mb-1">{rule.action}</div>
            <div className="text-blue-400 font-bold text-lg">{rule.xp}</div>
            <div className="text-gray-500 text-xs mt-1">{rule.cap}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
        <IconSparkles className="w-4 h-4 flex-shrink-0" />
        <span>若资源/链接/评论被删除，相应经验值会被扣除。每日登录奖励不会被扣除。</span>
      </div>
    </div>
  );
}

function DailyLoginCard({ onClaim }: { onClaim: () => void }) {
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkClaimStatus();
  }, []);

  const checkClaimStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch("/api/auth/daily-login");
      if (res.ok) {
        const data = await res.json();
        setAlreadyClaimed(data.alreadyClaimed);
      } else {
        setAlreadyClaimed(false);
      }
    } catch {
      setAlreadyClaimed(false);
    }
    setCheckingStatus(false);
  };

  const handleClaim = async () => {
    setClaiming(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/daily-login", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && !data.alreadyClaimed) {
          setAlreadyClaimed(true);
          setMessage(`获得 ${data.xpAwarded} 经验值！`);
          onClaim();
        } else {
          setMessage(data.message || "今日已领取");
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "领取失败");
      }
    } catch {
      setMessage("领取失败");
    }
    setClaiming(false);
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className={`glass rounded-2xl p-6 mb-6 border ${alreadyClaimed ? "border-gray-600/30" : "border-amber-500/30"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${alreadyClaimed ? "bg-gray-700/50" : "bg-gradient-to-br from-amber-500 to-orange-500"}`}>
            <IconSun className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">每日登录奖励</h3>
            <p className="text-gray-400 text-sm">
              {checkingStatus ? "检查中..." : alreadyClaimed ? "今日已领取，明天再来哦~" : `今日可领取 +${XP_RULES.DAILY_LOGIN} 经验值`}
            </p>
          </div>
        </div>
        <button
          onClick={handleClaim}
          disabled={checkingStatus || alreadyClaimed || claiming}
          className={`px-6 py-2 rounded-xl font-medium transition-all ${
            alreadyClaimed
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/25"
          }`}
        >
          {claiming ? "领取中..." : checkingStatus ? "检查中" : alreadyClaimed ? "已领取" : "领取奖励"}
        </button>
      </div>
      {message && (
        <div className="mt-3 text-center text-amber-300 text-sm">{message}</div>
      )}
    </div>
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
  const nextLevelExp = level * 200;
  const progressPercent = ((user.experience % 200) / 200) * 100;
  const isOwnProfile = session?.user && (session.user as any).username === user.username;
  const isOwner = session?.user && (session.user as any).isOwner;
  const isSuperAdmin = session?.user && (session.user as any).isSuperAdmin;
  const canEditUser = isOwner || (isSuperAdmin && !user.isOwner && !user.isSuperAdmin);

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
          <IconFilm className="w-10 h-10 text-gray-600" />
        </div>
      );
    }
    const imgUrl = getImageUrl(posterPath, "w342");
    if (!imgUrl) {
      return (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <IconFilm className="w-10 h-10 text-gray-600" />
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
        <div className="glass-strong rounded-2xl p-6 md:p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
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

          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>升级进度</span>
              <span>{user.experience % 200} / 200 → LV{level + 1}</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {canEditUser && user.username !== (session?.user as any)?.username && assignableTitles.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-4">
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

        {isOwnProfile && <DailyLoginCard onClaim={fetchUser} />}

        {isOwnProfile && <XPRulesCard />}

        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <IconPackage className="w-5 h-5 text-blue-400" />
            添加的资源
          </h2>
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
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <IconLink className="w-5 h-5 text-blue-400" />
              添加的链接
            </h2>
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
