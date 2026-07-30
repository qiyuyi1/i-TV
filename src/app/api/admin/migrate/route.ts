import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";

function getSupabaseConfig() {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const url =
    process.env.SUPABASE_URL ||
    (projectRef ? `https://${projectRef}.supabase.co` : null);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, serviceRoleKey };
}

async function executeSQL(sql: string): Promise<{ success: boolean; error?: string }> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  if (!url || !serviceRoleKey) {
    return { success: false, error: "Supabase configuration missing" };
  }

  try {
    const response = await fetch(`${url}/rest/v1/sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: text };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();

    const results: Array<{ name: string; status: string; sql: string }> = [];

    // 1. Add parent_id to comments (if not exists)
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("id, parent_id")
        .limit(1);

      if (error) throw error;
      results.push({
        name: "comments.parent_id",
        status: "ready",
        sql: "",
      });
    } catch {
      results.push({
        name: "comments.parent_id",
        status: "needs_migration",
        sql: "ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE;",
      });
    }

    // 2. Add country to resources
    try {
      const { data, error } = await supabase
        .from("resources")
        .select("id, country")
        .limit(1);

      if (error) throw error;
      results.push({
        name: "resources.country",
        status: "ready",
        sql: "",
      });
    } catch {
      results.push({
        name: "resources.country",
        status: "needs_migration",
        sql: "ALTER TABLE resources ADD COLUMN IF NOT EXISTS country TEXT;",
      });
    }

    // 3. Add last_login_xp to users
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, last_login_xp")
        .limit(1);

      if (error) throw error;
      results.push({
        name: "users.last_login_xp",
        status: "ready",
        sql: "",
      });
    } catch {
      results.push({
        name: "users.last_login_xp",
        status: "needs_migration",
        sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_xp TEXT;",
      });
    }

    const needsMigration = results.filter((r) => r.status === "needs_migration");
    const allReady = needsMigration.length === 0;

    return NextResponse.json({
      success: allReady,
      results,
      message: allReady
        ? "All schema updates are ready"
        : `需要运行 ${needsMigration.length} 条 SQL 语句`,
      sql: needsMigration.map((r) => r.sql).join("\n"),
      instruction: allReady
        ? ""
        : "访问 POST /api/admin/migrate?execute=true 来自动执行迁移",
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        error: error.message || "Migration failed",
        instruction: "请在 Supabase Dashboard → SQL Editor 中执行需要的 SQL 语句",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const execute = searchParams.get("execute") === "true";

    const supabase = getSupabase();

    const migrations: Array<{ name: string; sql: string }> = [];

    // Check and collect migrations
    try {
      const { error } = await supabase
        .from("comments")
        .select("id, parent_id")
        .limit(1);
      if (error) throw error;
    } catch {
      migrations.push({
        name: "comments.parent_id",
        sql: "ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE;",
      });
    }

    try {
      const { error } = await supabase
        .from("resources")
        .select("id, country")
        .limit(1);
      if (error) throw error;
    } catch {
      migrations.push({
        name: "resources.country",
        sql: "ALTER TABLE resources ADD COLUMN IF NOT EXISTS country TEXT;",
      });
    }

    try {
      const { error } = await supabase
        .from("users")
        .select("id, last_login_xp")
        .limit(1);
      if (error) throw error;
    } catch {
      migrations.push({
        name: "users.last_login_xp",
        sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_xp TEXT;",
      });
    }

    if (!execute) {
      return NextResponse.json({
        success: true,
        message: `发现 ${migrations.length} 个需要执行的迁移`,
        migrations,
        hint: "添加 ?execute=true 来执行迁移",
      });
    }

    // Execute migrations
    const results = [];
    for (const m of migrations) {
      const result = await executeSQL(m.sql);
      results.push({
        name: m.name,
        sql: m.sql,
        success: result.success,
        error: result.error,
      });
    }

    const allSuccess = results.every((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return NextResponse.json({
      success: allSuccess,
      total: migrations.length,
      succeeded: results.filter((r) => r.success).length,
      failed: failed.length,
      results,
      message: allSuccess
        ? "所有迁移已成功执行！"
        : `${failed.length} 个迁移失败`,
    });
  } catch (error: any) {
    console.error("Migration execution error:", error);
    return NextResponse.json(
      { error: error.message || "Migration execution failed" },
      { status: 500 }
    );
  }
}