import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const SETTINGS_PATH = join(process.cwd(), "store-settings.json");

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
}

const DEFAULTS: StoreSettings = {
  storeName: "Aura Goli",
  legalName: "Aura Goli Ltd.",
  email: "hello@auragoli.com",
  phone: "+880 1700 000000",
  address: "Dhaka, Bangladesh",
  currency: "BDT",
  timezone: "Asia/Dhaka",
  weightUnit: "kg",
  maintenanceMode: false,
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
};

export function getSettings(): StoreSettings {
  if (!existsSync(SETTINGS_PATH)) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(SETTINGS_PATH, "utf-8")) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Partial<StoreSettings>): StoreSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}
