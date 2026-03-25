import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding ...");

  // Create default super admin
  const adminEmail = "admin@example.com";
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    await prisma.user.create({
      data: {
        name: "Super Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "SUPER_ADMIN",
      },
    });
    
    console.log(`Created default user: ${adminEmail} / admin123`);
  } else {
    console.log(`User ${adminEmail} already exists`);
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
