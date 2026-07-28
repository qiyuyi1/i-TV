const { PrismaClient } = require("@prisma/client");
const url = "postgresql://postgres.wxaemtxkrryparukzdrv:kpeskSvkziU43W2d@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require";
console.log("Trying pooler...");
const p = new PrismaClient({ datasources: { db: { url } } });
p.$connect().then(() => { console.log("DB CONNECTED!"); p.$disconnect(); }).catch(e => console.log("FAIL:", e.message));