// Database layer using Supabase PostgREST API (HTTPS)
// Compatible with Cloudflare Workers (no direct TCP needed)

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
let _initError: string | null = null;

function getSupabaseConfig() {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const url =
    process.env.SUPABASE_URL ||
    (projectRef ? `https://${projectRef}.supabase.co` : null);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "SUPABASE_URL or SUPABASE_PROJECT_REF environment variable is not set"
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
    );
  }

  return { url, serviceRoleKey };
}

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  if (_initError) {
    throw new Error(`Database initialization failed (cached): ${_initError}`);
  }

  try {
    const { url, serviceRoleKey } = getSupabaseConfig();
    console.log(`[DB] Initializing Supabase client for ${url}`);

    _client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    console.log("[DB] Supabase client initialized successfully");
    return _client;
  } catch (err: any) {
    _initError = err?.message || String(err);
    throw err;
  }
}

export async function disconnect(): Promise<void> {
  _client = null;
  _initError = null;
  console.log("[DB] Disconnected (Supabase REST API)");
}
