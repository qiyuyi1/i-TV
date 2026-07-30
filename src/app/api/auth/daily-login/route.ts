import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLevelFromExperience, XP_RULES } from "@/lib/constants";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    if (user.lastLoginXp === todayStr) {
      return NextResponse.json({
        success: true,
        alreadyClaimed: true,
        message: "今日已领取每日登录奖励",
      });
    }

    const newExperience = (user.experience || 0) + XP_RULES.DAILY_LOGIN;
    const newLevel = getLevelFromExperience(newExperience);

    await prisma.user.update({
      where: { id: userId },
      data: {
        experience: newExperience,
        level: Math.min(newLevel, 999),
        lastLoginXp: todayStr,
      },
    });

    return NextResponse.json({
      success: true,
      alreadyClaimed: false,
      xpAwarded: XP_RULES.DAILY_LOGIN,
      newExperience,
      newLevel: Math.min(newLevel, 999),
      message: `登录成功，获得 ${XP_RULES.DAILY_LOGIN} 经验值`,
    });
  } catch (error: any) {
    console.error("Daily login XP error:", error);
    return NextResponse.json(
      { error: error.message || "领取失败" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    return NextResponse.json({
      alreadyClaimed: user.lastLoginXp === todayStr,
      lastLoginXp: user.lastLoginXp,
    });
  } catch (error: any) {
    console.error("Check daily login XP error:", error);
    return NextResponse.json(
      { error: error.message || "检查失败" },
      { status: 500 }
    );
  }
}