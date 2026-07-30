import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();

    // Check if parent_id column already exists
    const { data, error } = await supabase
      .from("comments")
      .select("id, parent_id")
      .limit(1);

    if (!error) {
      // parent_id column exists (we got data without error)
      return NextResponse.json({ 
        success: true, 
        message: "parent_id column already exists, reply feature is ready" 
      });
    }

    // If error mentions column doesn't exist, provide SQL
    const errorMsg = error?.message || String(error);
    
    if (errorMsg.includes("parent_id") || errorMsg.includes("column")) {
      return NextResponse.json({
        success: false,
        message: "需要手动添加 parent_id 列",
        sql: "ALTER TABLE comments ADD COLUMN parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE;",
        instruction: "请在 Supabase Dashboard → SQL Editor 中执行上述 SQL 语句"
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: errorMsg,
      sql: "ALTER TABLE comments ADD COLUMN parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE;",
      instruction: "请在 Supabase Dashboard → SQL Editor 中执行上述 SQL 语句"
    }, { status: 500 });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Migration failed",
        sql: "ALTER TABLE comments ADD COLUMN parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE;",
        instruction: "请在 Supabase Dashboard → SQL Editor 中执行上述 SQL 语句"
      },
      { status: 500 }
    );
  }
}