-- ============================================
-- 复制全部内容到 Supabase SQL Editor 执行
-- https://supabase.com/dashboard/project/wxaemtxkrryparukzdrv
-- ============================================

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

CREATE TABLE IF NOT EXISTS "Resource" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Resource_tmdbId_key" ON "Resource"("tmdbId");

CREATE TABLE IF NOT EXISTS "ResourceLink" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT '夸克网盘',
    "resourceId" TEXT NOT NULL,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceLink_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ResourceLink_resourceId_idx" ON "ResourceLink"("resourceId");

ALTER TABLE "Resource" ADD CONSTRAINT "Resource_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceLink" ADD CONSTRAINT "ResourceLink_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceLink" ADD CONSTRAINT "ResourceLink_addedById_fkey"
    FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;