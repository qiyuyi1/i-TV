import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLevelFromExperience } from "@/lib/constants";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const links = await prisma.resourceLink.findMany({
      where: { resourceId: params.id },
      orderBy: { createdAt: "asc" },
      include: {
        addedBy: {
          select: { username: true },
        },
      },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error("Fetch links error:", error);
    return NextResponse.json(
      { error: "获取链接列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const { url, type, quality } = body;

    if (!url) {
      return NextResponse.json(
        { error: "请填写链接地址" },
        { status: 400 }
      );
    }

    const linkType = type || "夸克";
    const linkQuality = quality || "普通";
    const label = `${linkType}${linkQuality}`;

    const link = await prisma.resourceLink.create({
      data: {
        label,
        url,
        type: linkType,
        quality: linkQuality,
        resourceId: params.id,
        addedById: (session.user as any).id,
      },
    });

    // Add 30 XP for adding a link
    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      const newExperience = user.experience + 30;
      const newLevel = getLevelFromExperience(newExperience);

      await prisma.user.update({
        where: { id: userId },
        data: {
          experience: newExperience,
          level: Math.min(newLevel, 999),
        },
      });
    }

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("Create link error:", error);
    return NextResponse.json(
      { error: "创建链接失败" },
      { status: 500 }
    );
  }
}
