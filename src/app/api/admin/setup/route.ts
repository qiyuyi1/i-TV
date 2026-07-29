import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    const expectedToken = process.env.NEXTAUTH_SECRET;
    if (!token || token !== expectedToken) {
      return NextResponse.json(
        { error: "验证失败" },
        { status: 403 }
      );
    }

    const userId = (session.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "用户信息无效" }, { status: 400 });
    }

    // Check if an owner already exists
    const existingOwner = await prisma.user.findFirst({
      where: { isOwner: true },
    });

    if (existingOwner) {
      return NextResponse.json(
        { error: "系统已有站长" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        role: "ADMIN",
        isOwner: true,
        isSuperAdmin: false,
        title: "站长",
      },
      select: { id: true, username: true, role: true, isOwner: true },
    });

    return NextResponse.json({
      success: true,
      message: `已将用户 ${user.username} 设为站长`,
      user,
    });
  } catch (error) {
    console.error("First admin setup error:", error);
    return NextResponse.json(
      { error: "设置站长失败" },
      { status: 500 }
    );
  }
}
