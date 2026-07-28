import { NextResponse } from "next/server";
import { getTMDBDetails } from "@/lib/tmdb";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "movie";

    const details = await getTMDBDetails(params.id, type);
    return NextResponse.json(details);
  } catch (error) {
    console.error("TMDB details API error:", error);
    return NextResponse.json(
      { error: "获取TMDB详情失败" },
      { status: 500 }
    );
  }
}
