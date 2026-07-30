import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserTitle, canAssignTitle } from "@/lib/constants";

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
    const isOwner = (session.user as any)?.isOwner;
    const isSuperAdmin = (session.user as any)?.isSuperAdmin;

    if (requesterRole !== "ADMIN" && !isOwner && !isSuperAdmin) {
      return NextResponse.json(
        { error: "权限不足，仅管理员及以上可操作" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role, assignRole, title: newTitle } = body;

    const user = await prisma.user.findUnique({
      where: { username: params.username },
    });

    if (!user) {
      return NextResponse.json(
        { error: `用户 ${params.username} 不存在` },
        { status: 404 }
      );
    }

    const updateData: any = {};
    const requesterInfo = { role: requesterRole, isOwner, isSuperAdmin };

    // Handle assignRole (new system)
    if (assignRole) {
      if (assignRole === "OWNER") {
        if (!isOwner) {
          return NextResponse.json(
            { error: "仅站长可设置站长头衔" },
            { status: 403 }
          );
        }
        updateData.isOwner = true;
        updateData.isSuperAdmin = false;
        updateData.role = "ADMIN";
        updateData.title = "站长";
      } else if (assignRole === "SUPER_ADMIN") {
        if (!isOwner) {
          return NextResponse.json(
            { error: "仅站长可设置副站长头衔" },
            { status: 403 }
          );
        }
        updateData.isSuperAdmin = true;
        updateData.isOwner = false;
        updateData.role = "ADMIN";
        updateData.title = "副站长";
      } else if (assignRole === "ADMIN") {
        if (!canAssignTitle(requesterInfo, "管理员")) {
          return NextResponse.json(
            { error: "权限不足" },
            { status: 403 }
          );
        }
        updateData.isOwner = false;
        updateData.isSuperAdmin = false;
        updateData.role = "ADMIN";
        updateData.title = "管理员";
      } else if (assignRole === "USER") {
        updateData.isOwner = false;
        updateData.isSuperAdmin = false;
        updateData.role = "USER";
        updateData.title = null;
      }
    } else if (role) {
      // Legacy role update
      if (role !== "ADMIN" && role !== "USER") {
        return NextResponse.json(
          { error: "角色值无效" },
          { status: 400 }
        );
      }
      updateData.role = role as "ADMIN" | "USER";
      if (role === "USER") {
        updateData.isOwner = false;
        updateData.isSuperAdmin = false;
        updateData.title = null;
      }
    } else if (newTitle !== undefined) {
      // Handle custom title assignment
      if (newTitle === null) {
        // Clearing title
        if (!isOwner && !isSuperAdmin) {
          return NextResponse.json(
            { error: "权限不足" },
            { status: 403 }
          );
        }
        updateData.title = null;
      } else {
        // Setting a specific title
        // Check if the assigner has permission to assign this title
        if (!canAssignTitle(requesterInfo, newTitle)) {
          return NextResponse.json(
            { error: `权限不足，无法分配"${newTitle}"头衔` },
            { status: 403 }
          );
        }
        updateData.title = newTitle;

        // If setting a special title, also set the corresponding flags
        if (newTitle === "站长") {
          if (!isOwner) {
            return NextResponse.json(
              { error: "仅站长可设置站长头衔" },
              { status: 403 }
            );
          }
          updateData.isOwner = true;
          updateData.isSuperAdmin = false;
          updateData.role = "ADMIN";
        } else if (newTitle === "副站长") {
          if (!isOwner) {
            return NextResponse.json(
              { error: "仅站长可设置副站长头衔" },
              { status: 403 }
            );
          }
          updateData.isSuperAdmin = true;
          updateData.isOwner = false;
          updateData.role = "ADMIN";
        } else if (newTitle === "管理员") {
          updateData.isOwner = false;
          updateData.isSuperAdmin = false;
          updateData.role = "ADMIN";
        } else {
          // Custom title - just set it
          updateData.isOwner = false;
          updateData.isSuperAdmin = false;
          // Keep role as is unless user is already an admin
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { username: params.username },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        isOwner: true,
        isSuperAdmin: true,
        title: true,
        level: true,
        experience: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `已更新用户 ${updatedUser.username} 的权限`,
      user: updatedUser,
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
      { error: "更新用户权限失败" },
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
    const isOwner = (session.user as any)?.isOwner;
    const isSuperAdmin = (session.user as any)?.isSuperAdmin;

    if (requesterRole !== "ADMIN" && !isOwner && !isSuperAdmin) {
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
        level: true,
        experience: true,
        title: true,
        isOwner: true,
        isSuperAdmin: true,
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
