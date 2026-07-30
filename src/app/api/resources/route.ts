import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLevelFromExperience, XP_RULES } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const country = searchParams.get("country");
    const year = searchParams.get("year");
    const minRating = searchParams.get("minRating");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const where: any = {};

    if (type && type !== "all") {
      where.type = type;
    }

    if (country && country !== "all") {
      where.country = country;
    }

    if (year && year !== "all") {
      if (year.includes("-")) {
        const [minY, maxY] = year.split("-");
        where.AND = where.AND || [];
        if (minY) where.AND.push({ year: { gte: minY } });
        if (maxY) where.AND.push({ year: { lte: maxY } });
      } else if (year.endsWith("以前")) {
        const cutoff = year.replace("以前", "");
        where.year = { lte: cutoff };
      } else {
        where.year = year;
      }
    }

    if (minRating && minRating !== "all") {
      if (minRating.includes("-")) {
        const [minR, maxR] = minRating.split("-");
        where.AND = where.AND || [];
        if (minR) where.AND.push({ rating: { gte: parseFloat(minR) } });
        if (maxR) where.AND.push({ rating: { lte: parseFloat(maxR) } });
      } else {
        // Fallback for old format (single number as min)
        where.rating = { gte: parseFloat(minRating) };
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { originalTitle: { contains: search } },
      ];
    }

    const resources = await prisma.resource.findMany({
      where,
      include: {
        links: true,
        createdBy: {
          select: { username: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
    });

    return NextResponse.json(resources);
  } catch (error: any) {
    console.error("Fetch resources error:", error);
    const message = error?.message || "未知错误";
    return NextResponse.json(
      { error: `获取资源列表失败: ${message}`, details: message },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const {
      tmdbId,
      title,
      originalTitle,
      posterPath,
      backdropPath,
      overview,
      year,
      type,
      genres,
      rating,
      currentEpisode,
      totalEpisodes,
      status,
      notes,
      country,
    } = body;

    if (!tmdbId || !title) {
      return NextResponse.json(
        { error: "缺少必要的资源信息" },
        { status: 400 }
      );
    }

    const existing = await prisma.resource.findUnique({
      where: { tmdbId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "该资源已存在", resourceId: existing.id },
        { status: 409 }
      );
    }

    const resource = await prisma.resource.create({
      data: {
        tmdbId,
        title,
        originalTitle,
        posterPath,
        backdropPath,
        overview,
        year,
        type: type || "movie",
        genres: genres ? JSON.stringify(genres) : null,
        rating,
        currentEpisode,
        totalEpisodes,
        status,
        notes,
        country: country || null,
        createdById: (session.user as any).id,
      },
    });

    // Add XP for creating a new resource (+10, daily cap 100)
    try {
      const userId = (session.user as any).id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        const todayResourcesCount = await prisma.resource.count({
          where: {
            createdById: userId,
            createdAt: { gte: startOfToday },
          },
        });

        const xpPerResource = XP_RULES.CREATE_RESOURCE;
        const dailyCap = XP_RULES.CREATE_RESOURCE_DAILY_CAP;
        const todayEarned = todayResourcesCount * xpPerResource;

        if (todayEarned < dailyCap) {
          const remaining = Math.min(xpPerResource, dailyCap - todayEarned);
          const newExperience = (user.experience || 0) + remaining;
          const newLevel = getLevelFromExperience(newExperience);

          await prisma.user.update({
            where: { id: userId },
            data: {
              experience: newExperience,
              level: Math.min(newLevel, 999),
            },
          });
        }
      }
    } catch (xpError) {
      console.error("Failed to add XP for resource creation:", xpError);
    }

    return NextResponse.json(resource, { status: 201 });
  } catch (error: any) {
    console.error("Create resource error:", error);
    const message = error?.message || "未知错误";
    return NextResponse.json(
      { error: `创建资源失败: ${message}`, details: message },
      { status: 503 }
    );
  }
}
