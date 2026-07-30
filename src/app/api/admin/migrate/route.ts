import { NextResponse } from "next/server";
import { Client } from "pg";

export async function GET(request: Request) {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    // Check if parent_id column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'comments' AND column_name = 'parent_id'
    `);

    if (checkResult.rows.length > 0) {
      await client.end();
      return NextResponse.json({ message: "parent_id column already exists" });
    }

    // Add parent_id column
    await client.query(`
      ALTER TABLE comments 
      ADD COLUMN parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE
    `);

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id)
    `);

    await client.end();

    return NextResponse.json({ 
      success: true, 
      message: "Added parent_id column to comments table" 
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: error.message || "Migration failed" },
      { status: 500 }
    );
  }
}