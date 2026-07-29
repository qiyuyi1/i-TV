import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: params.id },
      include: {
        links: {
          orderBy: { createdAt: "asc" },
          include: {
            addedBy: {
              select: { username: true },
            },
          },
        },
        createdBy: {
          select: { id: true, username: true },
        },
      },
    });

    if (!resource) {
      return NextResponse.json({ error: "资源不存在" }, { status: 404 });
    }

    return NextResponse.json(resource);
  } catch (error) {
    console.error("Fetch resource error:", error);
    return NextResponse.json(
      { error: "获取资源详情失败" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: params.id },
    });

    if (!resource) {
      return NextResponse.json({ error: "资源不存在" }, { status: 404 });
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    const isOwner = (session.user as any)?.isOwner;
    const isSuperAdmin = (session.user as any)?.isSuperAdmin;

    const hasAdminAccess = userRole === "ADMIN" || isOwner || isSuperAdmin;

    // Allow update if user is the creator or an admin
    if (resource.createdById !== userId && !hasAdminAccess) {
      return NextResponse.json(
        { error: "无权修改此资源，仅创建者或管理员可操作" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      currentEpisode,
      totalEpisodes,
      status,
      notes,
      overview,
      title,
      originalTitle,
      posterPath,
      backdropPath,
    } = body;

    const updateData: any = {};

    if (currentEpisode !== undefined) updateData.currentEpisode = currentEpisode;
    if (totalEpisodes !== undefined) updateData.totalEpisodes = totalEpisodes;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (overview !== undefined) updateData.overview = overview;
    if (title !== undefined) updateData.title = title;
    if (originalTitle !== undefined) updateData.originalTitle = originalTitle || null;
    if (posterPath !== undefined) updateData.posterPath = posterPath || null;
    if (backdropPath !== undefined) updateData.backdropPath = backdropPath || null;

    const updatedResource = await prisma.resource.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updatedResource);
  } catch (error) {
    console.error("Update resource error:", error);
    return NextResponse.json(
      { error: "更新资源失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: params.id },
    });

    if (!resource) {
      return NextResponse.json({ error: "资源不存在" }, { status: 404 });
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    const isOwner = (session.user as any)?.isOwner;
    const isSuperAdmin = (session.user as any)?.isSuperAdmin;

    const hasAdminAccess = userRole === "ADMIN" || isOwner || isSuperAdmin;

    // Allow deletion if user is the creator or an admin
    if (resource.createdById !== userId && !hasAdminAccess) {
      return NextResponse.json(
        { error: "无权删除此资源" },
        { status: 403 }
      );
    }

    await prisma.resource.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete resource error:", error);
    return NextResponse.json(
      { error: "删除资源失败" },
      { status: 500 }
    );
  }
}
