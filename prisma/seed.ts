import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await bcrypt.hash("admin123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@threadco.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@threadco.com",
      passwordHash: adminPassword,
      role: Role.admin,
      emailVerifiedAt: new Date(),
    },
  });

  const categories = [
    { name: "Oversized", slug: "oversized" },
    { name: "Graphic", slug: "graphic" },
    { name: "Plain / Basic", slug: "basic" },
    { name: "Premium", slug: "premium" },
  ];
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
