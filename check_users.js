const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      password: true // just to check if it's set and its format
    }
  });
  console.log("Users in DB:", JSON.stringify(users, null, 2));
}

main()
  .catch((e) => {
    console.error("Error connecting to DB:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
