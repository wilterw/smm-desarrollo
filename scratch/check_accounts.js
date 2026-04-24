const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.socialAccount.findMany({ where: { provider: 'youtube' } });
  console.log(accounts);
}

main().finally(() => prisma.$disconnect());
