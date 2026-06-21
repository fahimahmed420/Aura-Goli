import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";
import { apiError } from "@/lib/validation";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await req.json();

  if (typeof body.isBlocked !== "boolean") return apiError("isBlocked must be boolean", 400);

  const user = await prisma.user.update({
    where: { id },
    data: { isBlocked: body.isBlocked },
    select: { id: true, name: true, email: true, isBlocked: true },
  });

  return Response.json({ user });
}
