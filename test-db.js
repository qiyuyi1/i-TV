const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function test() {
  try {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:kpeskSvkziU43W2d@db.wxaemtxkrryparukzdrv.supabase.co:5432/postgres?schema=public&sslmode=require';
    console.log('Testing connection to Supabase...');
    console.log('URL:', connectionString.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'));
    
    const pool = new Pool({
      connectionString,
      max: 1,
    });
    
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    
    // Test 1: Check users
    console.log('\n--- Users ---');
    const users = await prisma.user.findMany();
    console.log('Total users:', users.length);
    users.forEach(u => {
      console.log('  -', u.username, '| role:', u.role, '| isOwner:', u.isOwner, '| title:', u.title);
    });
    
    // Test 2: Check resources
    console.log('\n--- Resources ---');
    const resources = await prisma.resource.findMany();
    console.log('Total resources:', resources.length);
    resources.slice(0, 5).forEach(r => {
      console.log('  -', r.title, '| type:', r.type, '| createdById:', r.createdById);
    });
    
    // Test 3: Check resource links
    console.log('\n--- Resource Links ---');
    const links = await prisma.resourceLink.findMany();
    console.log('Total links:', links.length);
    
    await prisma.$disconnect();
    console.log('\n✅ Database connection successful!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error('Stack:', e.stack?.substring(0, 500));
  }
}

test();
