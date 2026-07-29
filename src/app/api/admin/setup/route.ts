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

    // Simple security: require a token that matches NEXTAUTH_SECRET
    const expectedToken = process.env.NEXTAUTH_SECRET;
    if (!token || token !== expectedToken) {
      return NextResponse.json(
        { error: "验证失败" },
        { status: 403 }
      );
    }

    // Check if any admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      return NextResponse.json(
        {
          error: "已存在管理员，无法使用首次设置。请联系现有管理员通过管理后台操作。",
        },
        { status: 400 }
      );
    }

    const userId = (session.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "用户信息无效" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: "ADMIN" },
      select: { id: true, username: true, role: true },
    });

    return NextResponse.json({
      success: true,
      message: `已将用户 ${user.username} 设为管理员`,
      user,
    });
  } catch (error) {
    console.error("First admin setup error:", error);
    return NextResponse.json(
      { error: "设置管理员失败" },
      { status: 500 }
    );
  }
}
