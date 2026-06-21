import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { isStrongPassword, apiError } from "@/lib/validation";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body");
  }

  const { token, password } = body as Record<string, unknown>;
  if (typeof token !== "string" || !token) return apiError("Reset token is required");
  if (typeof password !== "string" || !isStrongPassword(password)) {
    return apiError("Password must be at least 8 characters and include uppercase, lowercase, and a number");
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return apiError("Reset link is invalid or has expired", 400);
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    // Mark token used — single-use
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    // Update password
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    // Invalidate ALL refresh tokens for this user (security best practice)
    prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } }),
  ]);

  return Response.json({ message: "Password updated successfully. Please log in with your new password." });
}
