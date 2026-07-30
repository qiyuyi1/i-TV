// Database layer using Supabase REST API (HTTPS)
// This is compatible with Cloudflare Workers (no direct TCP needed)

let _initialized = false;
let _initError: string | null = null;

function getSupabaseConfig() {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const url = process.env.SUPABASE_URL || (projectRef ? `https://${projectRef}.supabase.co` : null);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("SUPABASE_URL or SUPABASE_PROJECT_REF environment variable is not set");
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
  }

  return { url, serviceRoleKey };
}

function initialize() {
  if (_initialized) return;
  if (_initError) {
    throw new Error(`Database initialization failed (cached): ${_initError}`);
  }

  try {
    const { url } = getSupabaseConfig();
    console.log(`[DB] Supabase REST API initialized for ${url}`);
    _initialized = true;
  } catch (err: any) {
    _initError = err?.message || String(err);
    throw err;
  }
}

/**
 * Execute a SQL query via Supabase REST API
 * Returns the raw response which could be:
 * - Array of rows (for SELECT, INSERT/UPDATE RETURNING)
 * - Number (for INSERT/UPDATE/DELETE without RETURNING)
 */
async function executeSql(
  sql: string,
  params?: any[]
): Promise<any> {
  initialize();

  const { url, serviceRoleKey } = getSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/sql`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: sql,
      params: params || [],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `SQL execution failed (HTTP ${response.status})`;

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message) errorMessage += `: ${errorJson.message}`;
      if (errorJson.hint) errorMessage += ` - ${errorJson.hint}`;
    } catch {
      errorMessage += `: ${errorText}`;
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Execute a query and return all matching rows
 */
export async function queryAll(
  sql: string,
  params?: any[]
): Promise<any[]> {
  const result = await executeSql(sql, params);
  if (Array.isArray(result)) {
    return result;
  }
  // If result is a number (affected rows) or other non-array, return empty array
  return [];
}

/**
 * Execute a query and return a single row or null
 */
export async function queryOne(
  sql: string,
  params?: any[]
): Promise<any | null> {
  const result = await executeSql(sql, params);
  if (Array.isArray(result)) {
    return result.length > 0 ? result[0] : null;
  }
  // Single object result (some SQL implementations return single object)
  if (result && typeof result === "object" && !Array.isArray(result)) {
    // Check if it's a scalar result like { cnt: 5 }
    return result;
  }
  return null;
}

/**
 * Execute a query (INSERT/UPDATE/DELETE) and return raw result
 */
export async function query(
  sql: string,
  params?: any[]
): Promise<any> {
  return executeSql(sql, params);
}

export async function disconnect(): Promise<void> {
  // No persistent connection to close for REST API
  _initialized = false;
  console.log("[DB] Disconnected (REST API)");
}
