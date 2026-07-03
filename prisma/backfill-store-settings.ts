/**
 * One-off migration: copy the real values that used to live in
 * store-settings.json into the new `store_settings` DB table, so switching
 * from filesystem storage to the DB doesn't reset the store's real info back
 * to placeholder defaults. Safe to run more than once (upsert).
 */
import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const path = join(process.cwd(), "store-settings.json");
  if (!existsSync(path)) {
    console.log("No store-settings.json found — nothing to backfill.");
    return;
  }
  const data = JSON.parse(readFileSync(path, "utf-8"));

  const row = await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  console.log("✓ Backfilled store_settings:", row);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
