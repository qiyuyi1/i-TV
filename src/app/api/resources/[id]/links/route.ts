import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
    const { label, url, type } = body;

    if (!label || !url) {
      return NextResponse.json(
        { error: "请填写链接名称和地址" },
        { status: 400 }
      );
    }

    const link = await prisma.resourceLink.create({
      data: {
        label,
        url,
        type: type || "夸克网盘",
        resourceId: params.id,
        addedById: (session.user as any).id,
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("Create link error:", error);
    return NextResponse.json(
      { error: "创建链接失败" },
      { status: 500 }
    );
  }
}
