const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$connect().then(() => { console.log('CONNECTED!'); prisma.$disconnect(); }).catch(e => { console.log('FAIL:', e.message); process.exit(1); });