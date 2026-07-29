import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const where: any = {};

    if (type && type !== "all") {
      where.type = type;
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
      orderBy: { createdAt: "desc" },
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
        createdById: (session.user as any).id,
      },
    });

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
