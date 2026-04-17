const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('admin123', salt);
  await prisma.user.update({
    where: { email: 'admin@example.com' },
    data: { password: hash }
  });
  console.log("Password for admin@example.com updated to 'admin123'");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
