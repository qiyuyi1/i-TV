-- ============================================
-- i帅TV 数据库初始化脚本
-- 在 Supabase SQL Editor 中运行
-- ============================================

-- 启用 UUID 扩展（如果尚未启用）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建角色枚举类型
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 创建用户表
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

-- 创建资源表
CREATE TABLE IF NOT EXISTS "resources" (
    "id" TEXT NOT NULL,
    "tmdbId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "overview" TEXT,
    "year" TEXT,
    "type" TEXT NOT NULL DEFAULT 'movie',
    "genres" TEXT,
    "rating" DOUBLE PRECISION,
    "currentEpisode" TEXT,
    "totalEpisodes" TEXT,
    "status" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "resources_tmdbId_key" ON "resources"("tmdbId");
CREATE INDEX IF NOT EXISTS "resources_createdById_idx" ON "resources"("createdById");

-- 创建资源链接表
CREATE TABLE IF NOT EXISTS "resource_links" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT '夸克',
    "quality" TEXT NOT NULL DEFAULT '普通',
    "resourceId" TEXT NOT NULL,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resource_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "resource_links_resourceId_idx" ON "resource_links"("resourceId");
CREATE INDEX IF NOT EXISTS "resource_links_addedById_idx" ON "resource_links"("addedById");

-- 创建评论表
CREATE TABLE IF NOT EXISTS "comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "comments_userId_idx" ON "comments"("userId");
CREATE INDEX IF NOT EXISTS "comments_resourceId_idx" ON "comments"("resourceId");

-- 添加外键约束（如果不存在）
DO $$ BEGIN
    ALTER TABLE "resources" ADD CONSTRAINT "resources_createdById_fkey" 
        FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "resource_links" ADD CONSTRAINT "resource_links_resourceId_fkey" 
        FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "resource_links" ADD CONSTRAINT "resource_links_addedById_fkey" 
        FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_resourceId_fkey" 
        FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 启用行级安全策略（可选）
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resource_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "resources_type_idx" ON "resources"("type");
CREATE INDEX IF NOT EXISTS "resources_createdAt_idx" ON "resources"("createdAt");

-- ============================================
-- 初始化完成！
-- 接下来在 Supabase Dashboard 中：
-- 1. 运行注册页面创建账号
-- 2. 然后访问 /api/admin/setup 端点设置为站长
-- ============================================
