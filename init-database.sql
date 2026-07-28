CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Resource" (
  "id" TEXT NOT NULL,
  "tmdbId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "posterPath" TEXT,
  "overview" TEXT,
  "backdropPath" TEXT,
  "episodeUpdate" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ResourceLink" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT '夸克网盘',
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResourceLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Resource_tmdbId_key" ON "Resource"("tmdbId");
CREATE INDEX "ResourceLink_resourceId_idx" ON "ResourceLink"("resourceId");
