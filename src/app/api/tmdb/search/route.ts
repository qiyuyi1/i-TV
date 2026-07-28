import { NextResponse } from "next/server";
import { searchTMDB, getTMDBDetails } from "@/lib/tmdb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const type = searchParams.get("type") || "multi";

    if (!query) {
      return NextResponse.json(
        { error: "请提供搜索关键词" },
        { status: 400 }
      );
    }

    const results = await searchTMDB(query, type);
    return NextResponse.json(results);
  } catch (error) {
    console.error("TMDB search API error:", error);
    return NextResponse.json(
      { error: "TMDB搜索失败" },
      { status: 500 }
    );
  }
}
