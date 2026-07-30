import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { username: params.username },
      include: {
        resources: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            title: true,
            type: true,
            posterPath: true,
          },
        },
        links: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            resource: {
              select: { id: true, title: true },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            resources: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Fetch user error:", error);
    const detail = error instanceof Error
      ? error.message
      : (error as any)?.message || JSON.stringify(error);
    return NextResponse.json(
      { error: "获取用户信息失败", detail },
      { status: 500 }
    );
  }
}
