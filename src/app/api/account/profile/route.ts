import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { apiError, sanitizeText } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { name: true, email: true, phone: true, avatarUrl: true, bio: true },
  });

  if (!user) return apiError("User not found", 404);
  return Response.json({ user });
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const body = await req.json();
  const { name, phone, bio, avatarUrl, currentPassword, newPassword } = body;

  if (!name?.trim()) return apiError("Name is required", 400);
  if (name.trim().length > 120) return apiError("Name too long", 400);

  const updateData: Record<string, string | null> = {
    name: sanitizeText(name, 120),
    phone: phone?.trim().slice(0, 30) || null,
  };
  if (typeof bio === "string") updateData.bio = sanitizeText(bio, 500) || null;

  // Accept data URL (base64) avatar — limit to ~500KB encoded
  if (typeof avatarUrl === "string") {
    if (avatarUrl === "") {
      updateData.avatarUrl = null;
    } else if (avatarUrl.startsWith("data:image/") && avatarUrl.length < 500_000) {
      updateData.avatarUrl = avatarUrl;
    }
  }

  if (newPassword) {
    if (!currentPassword) return apiError("Current password required", 400);
    if (newPassword.length < 8) return apiError("New password must be at least 8 characters", 400);

    const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { passwordHash: true } });
    if (!user) return apiError("User not found", 404);

    const valid = await verifyPassword(currentPassword, user.passwordHash ?? "");
    if (!valid) return apiError("Current password is incorrect", 400);

    updateData.passwordHash = await hashPassword(newPassword);
  }

  const updated = await prisma.user.update({
    where: { id: auth.userId },
    data: updateData,
    select: { name: true, email: true, phone: true, avatarUrl: true, bio: true },
  });

  return Response.json({ user: updated });
}
