import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, username, password } = body;

    // Verify token
    const expectedToken = process.env.NEXTAUTH_SECRET;
    if (!token || token !== expectedToken) {
      return NextResponse.json(
        { error: "验证失败：token 不正确" },
        { status: 403 }
      );
    }

    // Mode 1: Direct setup with username and password (no login required)
    if (username && password) {
      // Check if an owner already exists
      const existingOwner = await prisma.user.findFirst({
        where: { isOwner: true },
      });

      if (existingOwner) {
        return NextResponse.json(
          { error: "系统已有站长，请联系现有站长" },
          { status: 400 }
        );
      }

      // Check if username already exists
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        // Update existing user to become owner
        const user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            role: "ADMIN",
            isOwner: true,
            isSuperAdmin: false,
            title: "站长",
            level: 50,
            experience: 9999,
          },
          select: { id: true, username: true, role: true, isOwner: true, title: true },
        });

        return NextResponse.json({
          success: true,
          message: `已将用户 ${user.username} 设为站长`,
          user,
        });
      }

      // Create new user as owner
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = `cl${Date.now()}${Math.random().toString(36).substring(2, 8)}`;

      const user = await prisma.user.create({
        data: {
          id: userId,
          username,
          password: hashedPassword,
          role: "ADMIN",
          isOwner: true,
          isSuperAdmin: false,
          title: "站长",
          level: 50,
          experience: 9999,
        },
        select: { id: true, username: true, role: true, isOwner: true, title: true },
      });

      return NextResponse.json({
        success: true,
        message: `已创建站长账号：${user.username}`,
        user,
      });
    }

    // Mode 2: Logged-in user becomes owner (requires session)
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录或提供用户名密码" }, { status: 401 });
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
        level: 50,
        experience: 9999,
      },
      select: { id: true, username: true, role: true, isOwner: true, title: true },
    });

    return NextResponse.json({
      success: true,
      message: `已将用户 ${user.username} 设为站长`,
      user,
    });
  } catch (error: any) {
    console.error("Admin setup error:", error);
    return NextResponse.json(
      { error: `设置站长失败: ${error?.message || "未知错误"}` },
      { status: 500 }
    );
  }
}

// GET endpoint to check if database is accessible and show current status
export async function GET() {
  try {
    const usersCount = await prisma.user.count();
    const resourcesCount = await prisma.resource.count();
    const owner = await prisma.user.findFirst({ where: { isOwner: true } });

    return NextResponse.json({
      success: true,
      database: "connected",
      stats: {
        users: usersCount,
        resources: resourcesCount,
        hasOwner: !!owner,
        ownerUsername: owner?.username || null,
      },
    });
  } catch (error: any) {
    console.error("Database check error:", error);
    return NextResponse.json(
      {
        success: false,
        database: "disconnected",
        error: error?.message || "数据库连接失败",
        hint: "请检查 DATABASE_URL 环境变量是否正确",
      },
      { status: 503 }
    );
  }
}
