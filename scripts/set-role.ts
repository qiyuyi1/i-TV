import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2];
  const role = process.argv[3] || "ADMIN";

  if (!username) {
    console.error("用法: npx tsx scripts/set-role.ts <username> [ADMIN|USER]");
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { username },
    data: { role: role as "ADMIN" | "USER" },
    select: { id: true, username: true, role: true },
  });

  console.log(`✅ 已将用户 ${user.username} 的角色更新为 ${user.role}`);
}

main()
  .catch((e) => {
    console.error("❌ 失败:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
