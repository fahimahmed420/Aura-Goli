import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { getSizeChart, saveSizeChart } from "@/lib/size-chart";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;
  try {
    return Response.json({ rows: getSizeChart() });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;
  try {
    const { rows } = await req.json();
    if (!Array.isArray(rows)) return Response.json({ error: "rows must be an array" }, { status: 400 });
    const saved = saveSizeChart(rows);
    return Response.json({ rows: saved });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
