import { getSettings } from "@/lib/settings";

export async function GET() {
  const s = getSettings();
  // Only expose the public-safe fields + maintenance flag
  return Response.json({
    storeName: s.storeName,
    maintenanceMode: s.maintenanceMode,
    currency: s.currency,
  });
}
