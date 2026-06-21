import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";
import { apiError } from "@/lib/validation";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await req.json();

  if (typeof body.isApproved !== "boolean") return apiError("isApproved required", 400);

  const review = await prisma.review.update({
    where: { id },
    data: { isApproved: body.isApproved },
  });

  return Response.json({ review });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  await prisma.review.delete({ where: { id } });
  return Response.json({ success: true });
}
