import { NextRequest } from "next/server";
import { resolveTokenPayload } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const payload = resolveTokenPayload(req);
  if (!payload) return apiError("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      phone: true,
      dob: true,
      emailVerifiedAt: true,
      isBlocked: true,
      createdAt: true,
    },
  });

  if (!user || user.isBlocked) return apiError("Unauthorized", 401);

  return Response.json({ user });
}
