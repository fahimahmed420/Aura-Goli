/**
 * One-off maintenance script: reset (or create) the admin account's password.
 * Useful before sharing grader/demo credentials — never keep a well-known
 * default password (e.g. the one in seed.ts) on a live database.
 *
 * Usage:
 *   npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/reset-admin-password.ts admin@threadco.com "NewPassword123!"
 */
import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [, , email, newPassword] = process.argv;
  if (!email || !newPassword) {
    console.error('Usage: reset-admin-password.ts <email> "<new-password>"');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.admin, isBlocked: false },
    create: { name: "Admin", email, passwordHash, role: Role.admin, emailVerifiedAt: new Date() },
  });

  console.log(`✓ Admin ready: ${user.email} (role: ${user.role})`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
