import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

async function runMigration() {
  // Read DATABASE_URL from .env or wrangler.toml
  let dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    // Try reading from .env.local
    const envPath = path.join(__dirname, ".env.local");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/^DATABASE_URL=(.+)$/m);
      if (match) {
        dbUrl = match[1].replace(/^"|"$/g, "");
      }
    }
  }
  
  if (!dbUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log("Connected to database");

    // Check if parent_id column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'comments' AND column_name = 'parent_id'
    `);

    if (checkResult.rows.length > 0) {
      console.log("parent_id column already exists");
    } else {
      // Add parent_id column
      await client.query(`
        ALTER TABLE comments 
        ADD COLUMN parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE
      `);
      console.log("Added parent_id column to comments table");

      // Create index for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id)
      `);
      console.log("Created index on parent_id");
    }

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();