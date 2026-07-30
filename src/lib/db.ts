import pg from "pg";

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (_pool) return _pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  _pool = new pg.Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false },
  });

  _pool.on("error", (err) => {
    console.error("Database pool error:", err.message);
  });

  return _pool;
}

export async function query(sql: string, params?: any[]): Promise<pg.QueryResult> {
  const pool = getPool();
  const result = await pool.query(sql, params);
  return result;
}

export async function queryOne(sql: string, params?: any[]): Promise<any | null> {
  const result = await query(sql, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function queryAll(sql: string, params?: any[]): Promise<any[]> {
  const result = await query(sql, params);
  return result.rows;
}

export async function disconnect() {
  if (_pool) {
    try {
      await _pool.end();
    } catch (error) {
      console.error("Error disconnecting database:", error);
    }
    _pool = null;
  }
}
