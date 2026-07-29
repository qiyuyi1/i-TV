// Prisma Client initialization for Cloudflare Workers (edge runtime).
//
// Key constraint: the Prisma /edge runtime entry (WASM query engine) does NOT
// accept the `adapter` option (driver adapters).  Passing `adapter` while
// using the /edge entry throws:
//   "Prisma Client was configured to use the `adapter` option but it was
//    imported via its `/edge` endpoint."
//
// We therefore:
//   1) Always construct PrismaClient WITHOUT the adapter option so the
//      WASM-based edge runtime takes over and uses the Node TCP-compatible
//      socket APIs exposed by Cloudflare's `nodejs_compat` compatibility flag.
//   2) Remove the @prisma/adapter-pg dependency at runtime.  We do NOT need it
//      when running on edge runtime since DATABASE_URL (postgres://) is read
//      directly from env.

// @ts-ignore
import { PrismaClient } from "@prisma/client";

export type { Prisma } from "@prisma/client";

let _prisma: PrismaClient | null = null;
let _initError: string | null = null;

export function getPrismaClient(): PrismaClient {
  if (_prisma) return _prisma;
  if (_initError) {
    throw new Error(`Database initialization failed (cached): ${_initError}`);
  }

  try {
    // Edge runtime (WASM) handles the connection directly from DATABASE_URL.
    // Do NOT pass `adapter`; it is mutually exclusive with /edge entry.
    // @ts-ignore - validated at runtime
    const prisma = new PrismaClient({
      // Logging in development can be enabled here
      // log: ['query', 'info', 'warn', 'error']
    });
    console.log("Prisma client initialized successfully (edge runtime, no adapter)");
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
    _initError = null;
    return {
      connected: false,
      message: `Database connection failed: ${msg}`,
    };
  }
}

export async function disconnectDatabase() {
  if (_prisma) {
    try {
      // @ts-ignore
      await _prisma.$disconnect();
    } catch (error) {
      console.error("Error disconnecting database:", error);
    }
    _prisma = null;
    _initError = null;
  }
}
