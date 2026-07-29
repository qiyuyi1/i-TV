import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

let _prisma: PrismaClient | null = null;
let _pool: pg.Pool | null = null;

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

  try {
    const pool = getPool();
    const adapter = new PrismaPg(pool);
    _prisma = new PrismaClient({ adapter } as unknown as ConstructorParameters<typeof PrismaClient>[0]);
    console.log("Prisma client initialized successfully with Pg adapter");
  } catch (error) {
    console.error("Failed to initialize Prisma client:", error);
    throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return _prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    try {
      const client = getPrismaClient();
      const value = (client as any)[prop];
      return typeof value === "function" ? value.bind(client) : value;
    } catch (error) {
      console.error(`Prisma access error for "${String(prop)}":`, error);
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
  } catch (error) {
    console.error("Database connection test failed:", error);
    _prisma = null;
    
    return {
      connected: false,
      message: `Database connection failed: ${error instanceof Error ? error.message : String(error)}`,
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
  }
}
