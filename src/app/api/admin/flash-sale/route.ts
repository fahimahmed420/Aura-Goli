import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;
  try {
    const sales = await prisma.flashSale.findMany({ orderBy: { createdAt: "desc" } });
    return Response.json({ sales });
  } catch {
    return Response.json({ sales: [] });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;
  try {
    const { name, bannerText, discountPercent, endsAt } = await req.json();
    if (!name || !bannerText || !discountPercent || !endsAt)
      return Response.json({ error: "All fields required" }, { status: 400 });
    await prisma.flashSale.updateMany({ where: { isActive: true }, data: { isActive: false } });
    const sale = await prisma.flashSale.create({
      data: { name, bannerText, discountPercent: Number(discountPercent), endsAt: new Date(endsAt), isActive: true },
    });
    return Response.json({ sale }, { status: 201 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;
  try {
    const { id, isActive } = await req.json();
    if (isActive) await prisma.flashSale.updateMany({ where: { isActive: true }, data: { isActive: false } });
    const sale = await prisma.flashSale.update({ where: { id }, data: { isActive } });
    return Response.json({ sale });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await req.json();
    await prisma.flashSale.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
