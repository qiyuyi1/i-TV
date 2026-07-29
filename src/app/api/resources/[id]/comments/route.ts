import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLevelFromExperience } from "@/lib/constants";

export async function GET(
  request: Request,
  { params }: { params: { resourceId: string } }
) {
  try {
    const comments = await prisma.comment.findMany({
      where: { resourceId: params.resourceId },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        user: {
          select: {
            id: true,
            username: true,
            level: true,
            experience: true,
            title: true,
            role: true,
            isOwner: true,
            isSuperAdmin: true,
          },
        },
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Fetch comments error:", error);
    return NextResponse.json(
      { error: "获取评论失败" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { resourceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { content } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "评论内容不能为空" },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: "评论内容不能超过500字符" },
        { status: 400 }
      );
    }

    const resource = await prisma.resource.findUnique({
      where: { id: params.resourceId },
    });

    if (!resource) {
      return NextResponse.json({ error: "资源不存在" }, { status: 404 });
    }

    const userId = (session.user as any)?.id;

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId,
        resourceId: params.resourceId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            level: true,
            experience: true,
            title: true,
            role: true,
            isOwner: true,
            isSuperAdmin: true,
          },
        },
      },
    });

    // Add experience points for commenting
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = today;

      const todayCommentsCount = await prisma.comment.count({
        where: {
          userId,
          createdAt: { gte: startOfToday },
        },
      });

      // Max 50 XP per day from comments (10 comments max)
      if (todayCommentsCount <= 10) {
        const newExperience = user.experience + 5;
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

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json(
      { error: "评论发送失败" },
      { status: 500 }
    );
  }
}
