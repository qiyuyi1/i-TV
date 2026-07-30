import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLevelFromExperience, XP_RULES } from "@/lib/constants";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; linkId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const link = await prisma.resourceLink.findUnique({
      where: { id: params.linkId },
    });

    if (!link) {
      return NextResponse.json({ error: "链接不存在" }, { status: 404 });
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    const isOwner = (session.user as any)?.isOwner;
    const isSuperAdmin = (session.user as any)?.isSuperAdmin;

    const hasAdminAccess = userRole === "ADMIN" || isOwner || isSuperAdmin;

    // Only link owner or admins can delete
    if (link.addedById !== userId && !hasAdminAccess) {
      return NextResponse.json(
        { error: "无权删除此链接" },
        { status: 403 }
      );
    }

    // If admin deletes someone else's link, deduct XP from the creator
    if (link.addedById && link.addedById !== userId && hasAdminAccess) {
      try {
        const linkCreator = await prisma.user.findUnique({
          where: { id: link.addedById },
        });

        if (linkCreator) {
          const xpDeduction = XP_RULES.ADD_LINK;
          const currentExp = linkCreator.experience || 0;
          const newExperience = Math.max(0, currentExp - xpDeduction);
          const newLevel = Math.max(1, getLevelFromExperience(newExperience));

          await prisma.user.update({
            where: { id: link.addedById },
            data: {
              experience: newExperience,
              level: newLevel,
            },
          });
        }
      } catch (xpError) {
        console.error("Failed to deduct XP:", xpError);
      }
    }

    await prisma.resourceLink.delete({
      where: { id: params.linkId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete link error:", error);
    return NextResponse.json(
      { error: "删除链接失败" },
      { status: 500 }
    );
  }
}
