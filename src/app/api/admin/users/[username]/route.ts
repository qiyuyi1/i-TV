import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const requesterRole = (session.user as any)?.role;
    if (requesterRole !== "ADMIN") {
      return NextResponse.json(
        { error: "权限不足，仅管理员可操作" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!role || (role !== "ADMIN" && role !== "USER")) {
      return NextResponse.json(
        { error: "角色值无效，必须是 ADMIN 或 USER" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { username: params.username },
      data: { role: role as "ADMIN" | "USER" },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `已将用户 ${user.username} 的角色更新为 ${user.role}`,
      user,
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json(
        { error: `用户 ${params.username} 不存在` },
        { status: 404 }
      );
    }
    console.error("Update user role error:", error);
    return NextResponse.json(
      { error: "更新用户角色失败" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const requesterRole = (session.user as any)?.role;
    if (requesterRole !== "ADMIN") {
      return NextResponse.json(
        { error: "权限不足" },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: params.username },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        _count: { select: { resources: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: `用户 ${params.username} 不存在` },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Fetch user error:", error);
    return NextResponse.json(
      { error: "获取用户信息失败" },
      { status: 500 }
    );
  }
}
