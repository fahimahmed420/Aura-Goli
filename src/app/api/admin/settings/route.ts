import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { getSettings, saveSettings } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;
  return Response.json(getSettings());
}

export async function PUT(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const body = await req.json();
  const allowed = ["storeName", "legalName", "email", "phone", "address", "currency", "timezone", "weightUnit", "maintenanceMode"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const updated = saveSettings(patch as Parameters<typeof saveSettings>[0]);
  return Response.json(updated);
}
