import pg from "pg";

// Use default Prisma client entry - webpack alias handles runtime swap
// @ts-ignore - Prisma types
import { PrismaClient } from "@prisma/client";
// @ts-ignore
import { PrismaPg } from "@prisma/adapter-pg";

export type { Prisma } from "@prisma/client";

let _prisma: PrismaClient | null = null;
let _pool: pg.Pool | null = null;
let _initError: string | null = null;

function getPool(): pg.Pool {
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

export function getPrismaClient(): PrismaClient {
  if (_prisma) return _prisma;

  if (_initError) {
    throw new Error(`Database initialization failed (cached): ${_initError}`);
  }

  try {
    const pool = getPool();

    // Try with driver adapter first
    let prisma: PrismaClient;
    try {
      // @ts-ignore
      const adapter = new PrismaPg(pool);
      console.log("PrismaPg adapter created, provider:", (adapter as any).provider);
      // @ts-ignore
      prisma = new PrismaClient({ adapter });
      console.log("Prisma client created with Pg adapter");
    } catch (adapterErr: any) {
      console.warn("PrismaPg adapter failed, falling back to default PrismaClient:", adapterErr?.message || adapterErr);
      // Fallback: use default client without adapter
      // Works when nodejs_compat flag enables native Postgres TCP
      prisma = new PrismaClient({});
      console.log("Prisma client created without adapter (fallback mode)");
    }

    _prisma = prisma;
    return _prisma;
  } catch (error: any) {
    const msg = error?.message || String(error) || "Unknown error";
    console.error("Failed to initialize Prisma client:", msg, error?.stack || "");
    _initError = msg;
    throw new Error(`Database initialization failed: ${msg}`);
  }
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    try {
      const client = getPrismaClient();
      const value = (client as any)[prop];
      return typeof value === "function" ? value.bind(client) : value;
    } catch (error: any) {
      console.error(`Prisma access error for "${String(prop)}":`, error?.message || error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  },
});

export async function testConnection(): Promise<{
  connected: boolean;
  message: string;
  users?: number;
  resources?: number;
}> {
  try {
    const client = getPrismaClient();
    const users = await client.user.count();
    const resources = await client.resource.count();

    return {
      connected: true,
      message: "Database connected successfully",
      users,
      resources,
    };
  } catch (error: any) {
    const msg = error?.message || String(error) || "Unknown error";
    console.error("Database connection test failed:", msg);
    _prisma = null;
    _initError = null; // Allow retry on next request

    return {
      connected: false,
      message: `Database connection failed: ${msg}`,
    };
  }
}

export async function disconnectDatabase() {
  if (_pool) {
    try {
      await _pool.end();
    } catch (error) {
      console.error("Error disconnecting database:", error);
    }
    _pool = null;
    _prisma = null;
    _initError = null;
  }
}
