import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding ...");

  // Create default super admins
  const admins = [
    { name: "Wilter Econos", email: "wilter@econos.io" },
    { name: "Ramon Econos", email: "ramon@econos.io" }
  ];

  const defaultPassword = "Econos2026!";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  for (const admin of admins) {
    const existingUser = await prisma.user.findUnique({
      where: { email: admin.email },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          name: admin.name,
          email: admin.email,
          password: hashedPassword,
          role: "SUPER_ADMIN",
        },
      });
      console.log(`Created super admin: ${admin.email} / ${defaultPassword}`);
    } else {
      console.log(`User ${admin.email} already exists`);
    }
  }

  // Create base permissions
  const permissions = [
    { name: "create_ads", description: "Create and edit ads" },
    { name: "publish_facebook", description: "Publish ads on Facebook" },
    { name: "publish_instagram", description: "Publish ads on Instagram" },
    { name: "publish_youtube", description: "Publish ads on YouTube" },
    { name: "manage_users", description: "Manage users and roles" },
    { name: "view_analytics", description: "View dashboard metrics" }
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
  }
  
  console.log("Permissions seeded successfully.");
  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
