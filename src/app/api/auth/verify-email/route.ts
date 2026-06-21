import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return apiError("Verification token is required");

  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    return apiError("Verification link is invalid or has expired", 400);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);

  // Redirect to login with success param
  return Response.redirect(new URL("/login?verified=1", req.url));
}
