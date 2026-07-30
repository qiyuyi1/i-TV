import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLevelFromExperience, XP_RULES } from "@/lib/constants";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await prisma.comment.findMany({
      where: { resourceId: params.id },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "asc" },
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

    // Nest comments: top-level first, then replies
    const topLevel = comments.filter((c: any) => !c.parentId);
    const replies = comments.filter((c: any) => c.parentId);

    const result = topLevel.map((comment: any) => ({
      ...comment,
      replies: replies.filter((r: any) => r.parentId === comment.id),
    }));

    return NextResponse.json(result);
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { content, parentId } = await request.json();

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
      where: { id: params.id },
    });

    if (!resource) {
      return NextResponse.json({ error: "资源不存在" }, { status: 404 });
    }

    // If replying, verify parent comment exists and belongs to same resource
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment || (parentComment as any).resourceId !== params.id) {
        return NextResponse.json(
          { error: "回复的评论不存在" },
          { status: 404 }
        );
      }
      // Don't allow replying to a reply (keep 1 level of nesting)
      if ((parentComment as any).parentId) {
        return NextResponse.json(
          { error: "只能回复顶级评论" },
          { status: 400 }
        );
      }
    }

    const userId = (session.user as any)?.id;

    const createData: Record<string, any> = {
      content: content.trim(),
      userId,
      resourceId: params.id,
    };
    if (parentId) {
      createData.parentId = parentId;
    }

    const comment = await prisma.comment.create({
      data: createData,
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

    // Add experience points for commenting (non-blocking)
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        const todayCommentsCount = await prisma.comment.count({
          where: {
            userId,
            createdAt: { gte: startOfToday },
          },
        });

        const xpPerComment = XP_RULES.COMMENT;
        const dailyCap = XP_RULES.COMMENT_DAILY_CAP;
        const todayEarned = todayCommentsCount * xpPerComment;

        if (todayEarned < dailyCap) {
          const remaining = Math.min(xpPerComment, dailyCap - todayEarned);
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
      console.error("Failed to add experience:", xpError);
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