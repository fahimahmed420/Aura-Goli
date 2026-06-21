import { getSizeChart } from "@/lib/size-chart";

export async function GET() {
  try { return Response.json({ rows: getSizeChart() }); }
  catch { return Response.json({ rows: [] }); }
}
