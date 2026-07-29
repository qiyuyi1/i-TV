import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: { resourceId: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: params.commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "评论不存在" }, { status: 404 });
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    const isOwner = (session.user as any)?.isOwner;
    const isSuperAdmin = (session.user as any)?.isSuperAdmin;

    // Only comment owner or admins can delete
    if (comment.userId !== userId && userRole !== "ADMIN" && !isOwner && !isSuperAdmin) {
      return NextResponse.json(
        { error: "无权删除此评论" },
        { status: 403 }
      );
    }

    // If someone else's comment is deleted by admin, deduct XP
    if (comment.userId !== userId) {
      const commenter = await prisma.user.findUnique({
        where: { id: comment.userId },
      });

      if (commenter) {
        const newExperience = Math.max(0, commenter.experience - 5);
        const newLevel = Math.max(1, Math.floor(newExperience / 200) + 1);

        await prisma.user.update({
          where: { id: comment.userId },
          data: {
            experience: newExperience,
            level: newLevel,
          },
        });
      }
    }

    await prisma.comment.delete({
      where: { id: params.commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete comment error:", error);
    return NextResponse.json(
      { error: "删除评论失败" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { resourceId: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const isOwner = (session.user as any)?.isOwner;
    const isSuperAdmin = (session.user as any)?.isSuperAdmin;

    // Only admins can pin comments
    if (userRole !== "ADMIN" && !isOwner && !isSuperAdmin) {
      return NextResponse.json(
        { error: "无权置顶评论" },
        { status: 403 }
      );
    }

    const { isPinned } = await request.json();

    const comment = await prisma.comment.update({
      where: { id: params.commentId },
      data: { isPinned },
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Update comment error:", error);
    return NextResponse.json(
      { error: "更新评论失败" },
      { status: 500 }
    );
  }
}
