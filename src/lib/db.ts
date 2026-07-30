import postgres from "postgres";

let _sql: postgres.Sql | null = null;
let _initError: string | null = null;

function parseConnectionString(cs: string) {
  const url = new URL(cs);
  return {
    host: url.hostname,
    port: parseInt(url.port || "5432", 10),
    database: url.pathname.replace(/^\//, ""),
    user: url.username,
    password: url.password,
    ssl: url.searchParams.get("sslmode") !== "disable",
  };
}

function getSql(): postgres.Sql {
  if (_sql) return _sql;
  if (_initError) {
    throw new Error(`Database initialization failed (cached): ${_initError}`);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const parsed = parseConnectionString(connectionString);

  console.log(`[DB] Initializing postgres client for ${parsed.host}:${parsed.port}/${parsed.database}`);

  try {
    const sql = postgres({
      host: parsed.host,
      port: parsed.port,
      database: parsed.database,
      user: parsed.user,
      password: parsed.password,
      ssl: parsed.ssl ? "require" : false,
      max: 1,
      connect_timeout: 10,
      no_prepare: true, // Use query protocol instead of prepared statements (compatible with Supabase connection pooling)
    });

    console.log("[DB] Postgres client initialized successfully");
    _sql = sql;
    return sql;
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error("[DB] Failed to initialize postgres client:", msg);
    _initError = msg;
    throw err;
  }
}

// Convert pg-style query results to the format our code expects
function normalizeResult(raw: any) {
  if (!raw) return { rows: [], rowCount: 0 };
  // postgres library returns arrays for queries and objects for single rows
  if (Array.isArray(raw)) {
    return { rows: raw, rowCount: raw.length };
  }
  if (raw && typeof raw === "object") {
    return { rows: [raw], rowCount: 1 };
  }
  return { rows: [], rowCount: 0 };
}

export async function query(sqlText: string, params?: any[]): Promise<any> {
  const sql = getSql();
  const result = await sql.unsafe(sqlText, params);
  return normalizeResult(result);
}

export async function queryOne(sqlText: string, params?: any[]): Promise<any | null> {
  const sql = getSql();
  const result = await sql.unsafe(sqlText, params);
  if (Array.isArray(result)) {
    return result.length > 0 ? result[0] : null;
  }
  if (result && typeof result === "object" && !Array.isArray(result)) {
    // Single result (like from INSERT RETURNING or UPDATE RETURNING)
    // The postgres library returns the raw object for single-row results
    return result;
  }
  return null;
}

export async function queryAll(sqlText: string, params?: any[]): Promise<any[]> {
  const sql = getSql();
  const result = await sql.unsafe(sqlText, params);
  if (Array.isArray(result)) {
    return result;
  }
  return result ? [result] : [];
}

export async function disconnect() {
  if (_sql) {
    try {
      await _sql.end();
    } catch (error) {
      console.error("Error disconnecting database:", error);
    }
    _sql = null;
    _initError = null;
  }
}
