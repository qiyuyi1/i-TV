const fs = require("fs");
const path = require("path");

const clientIndexPath = path.join(
  __dirname,
  "..",
  "node_modules",
  ".prisma",
  "client",
  "index.js"
);

if (!fs.existsSync(clientIndexPath)) {
  console.error("[prisma-shim] Generated Prisma client not found. Run 'prisma generate' first.");
  process.exit(1);
}

let content = fs.readFileSync(clientIndexPath, "utf-8");

// Replace the real PrismaClient with a mock that doesn't try to connect
const originalLine = "const PrismaClient = getPrismaClient(config)";
const mockPrismaClient = `
const PrismaClient = class PrismaClient {
  constructor() {
    // Intentionally empty - no database connection needed
  }
  async $disconnect() { return Promise.resolve(); }
  async $connect() { return Promise.resolve(); }
  async $transaction() { throw new Error('Prisma transactions are not supported in Cloudflare Workers. Use the Supabase-based client instead.'); }
  async $queryRaw() { throw new Error('Raw queries are not supported. Use the Supabase-based client instead.'); }
  async $executeRaw() { throw new Error('Raw execution is not supported. Use the Supabase-based client instead.'); }
  $extends() { return this; }
  $on() {}
  $metrics() { return Promise.resolve({ counters: [], gauges: [], histograms: [] }); }
}
`;

content = content.replace(originalLine, mockPrismaClient);

// Also replace the runtime library reference with edge.js for Workers compatibility
content = content.replace(
  "require('@prisma/client/runtime/library.js')",
  "require('@prisma/client/runtime/edge.js')"
);

fs.writeFileSync(clientIndexPath, content);

console.log("[prisma-shim] Prisma client patched successfully for Cloudflare Workers.");
console.log("[prisma-shim] The custom Supabase-based client in src/lib/prisma.ts handles all database operations.");