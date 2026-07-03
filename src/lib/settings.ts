import { prisma } from "@/lib/prisma";

export interface StoreSettings {
  storeName: string;
  legalName: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
  weightUnit: string;
  maintenanceMode: boolean;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
}

const SINGLETON_ID = "singleton";

// Deliberately no in-memory caching here: on Vercel, route handlers and page
// renders can land on different serverless instances, so a process-local
// cache can't be relied on to invalidate consistently across them — it would
// mean an admin's maintenance-mode toggle sometimes appears to "not save"
// for other visitors. This is a single indexed-row read, cheap enough to
// always hit the DB directly.
function toPlain(row: Awaited<ReturnType<typeof prisma.storeSettings.upsert>>): StoreSettings {
  const { storeName, legalName, email, phone, address, currency, timezone, weightUnit, maintenanceMode, instagramUrl, facebookUrl, tiktokUrl, youtubeUrl } = row;
  return { storeName, legalName, email, phone, address, currency, timezone, weightUnit, maintenanceMode, instagramUrl, facebookUrl, tiktokUrl, youtubeUrl };
}

export async function getSettings(): Promise<StoreSettings> {
  const row = await prisma.storeSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
  return toPlain(row);
}

export async function saveSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  const row = await prisma.storeSettings.upsert({
    where: { id: SINGLETON_ID },
    update: settings,
    create: { id: SINGLETON_ID, ...settings },
  });
  return toPlain(row);
}
