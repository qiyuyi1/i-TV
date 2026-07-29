"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { getUserTitle } from "@/lib/constants";

export default function Navbar() {
  const { data: session } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const title = session ? getUserTitle(session.user as any) : "";
  const isOwner = session?.user && (session.user as any).isOwner;
  const isSuperAdmin = session?.user && (session.user as any).isSuperAdmin;
  const isAdmin = session?.user && (session.user as any).role === "ADMIN";
  const hasAdminAccess = isOwner || isSuperAdmin || isAdmin;

  const getTitleBadgeClass = (title: string) => {
    if (title === "站长") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    if (title === "副站长") return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    if (title === "管理员") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    return "bg-purple-500/20 text-purple-400 border-purple-500/30";
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "glass shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">帅</span>
            </div>
            <span className="text-xl font-bold text-white">i帅TV</span>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/"
              className="text-gray-300 hover:text-white transition-colors"
            >
              首页
            </Link>
            {hasAdminAccess && (
              <Link
                href="/admin"
                className="text-amber-400 hover:text-amber-300 transition-colors"
              >
                管理后台
              </Link>
            )}
            {session && (
              <Link
                href="/resources/add"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                添加资源
              </Link>
            )}
            {session ? (
              <div className="flex items-center gap-3">
                <Link
                  href={`/user/${(session.user as any)?.username}`}
                  className="text-gray-300 hover:text-white text-sm transition-colors"
                >
                  {(session.user as any)?.username}
                </Link>
                {title && (
                  <span className={`px-2 py-0.5 text-xs rounded-full border ${getTitleBadgeClass(title)}`}>
                    {title}
                  </span>
                )}
                <button
                  onClick={() => signOut()}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  退出
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  注册
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white p-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden glass border-t border-white/10">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-300 hover:text-white py-2"
            >
              首页
            </Link>
            {session && (
              <Link
                href="/resources/add"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-blue-400 hover:text-blue-300 py-2"
              >
                添加资源
              </Link>
            )}
            {hasAdminAccess && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-amber-400 hover:text-amber-300 py-2"
              >
                管理后台
              </Link>
            )}
            {session ? (
              <>
                <div className="text-gray-400 text-sm py-2">
                  <Link
                    href={`/user/${(session.user as any)?.username}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="hover:text-white"
                  >
                    {(session.user as any)?.username}
                  </Link>
                  {title && (
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full border ${getTitleBadgeClass(title)}`}>
                      {title}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="text-red-400 hover:text-red-300 py-2"
                >
                  退出登录
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-gray-300 hover:text-white py-2"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-blue-400 hover:text-blue-300 py-2"
                >
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
