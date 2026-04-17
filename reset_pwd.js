const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('123456', salt);
  await prisma.user.update({
    where: { email: 'wilterw@gmail.com' },
    data: { password: hash }
  });
  console.log("Password for wilterw@gmail.com updated to '123456'");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
