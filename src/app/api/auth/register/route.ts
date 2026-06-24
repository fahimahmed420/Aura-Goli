import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { generateSecureToken, emailVerificationExpiry } from "@/lib/auth";
import { sendEmailVerification } from "@/lib/email";
import { rateLimit, authRateLimits } from "@/lib/rate-limit";
import { isValidEmail, isStrongPassword, apiError } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`register:${ip}`, authRateLimits.register);
  if (!rl.allowed) {
    return apiError("Too many registration attempts. Please wait.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body");
  }

  const { name, email, password } = body as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) return apiError("Name is required");
  if (typeof email !== "string" || !isValidEmail(email)) return apiError("Valid email is required");
  if (typeof password !== "string" || !isStrongPassword(password)) {
    return apiError("Password must be at least 8 characters and include uppercase, lowercase, and a number");
  }

  // Always return the same message regardless of whether the email exists — prevent enumeration
  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) {
    // Send verification email silently so the response is indistinguishable
    return Response.json({ message: "If that email is new, a verification link has been sent." }, { status: 201 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
    },
  });

  // Link any guest orders placed with this email before registration
  await prisma.order.updateMany({
    where: { guestEmail: email.toLowerCase(), userId: null },
    data: { userId: user.id },
  });

  const token = generateSecureToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: emailVerificationExpiry(),
    },
  });

  await sendEmailVerification(user.email, token);

  return Response.json({ message: "If that email is new, a verification link has been sent." }, { status: 201 });
}
