import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, passwordResetExpiry } from "@/lib/auth";
import { sendPasswordReset } from "@/lib/email";
import { rateLimit, authRateLimits } from "@/lib/rate-limit";
import { isValidEmail, apiError } from "@/lib/validation";

// Always returns the same response — never reveals if an email exists
const SAFE_RESPONSE = Response.json({
  message: "If that email is registered, a reset link has been sent.",
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`forgot:${ip}`, authRateLimits.forgotPassword);
  if (!rl.allowed) return apiError("Too many requests. Please wait.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return SAFE_RESPONSE;
  }

  const { email } = body as Record<string, unknown>;
  if (typeof email !== "string" || !isValidEmail(email)) return SAFE_RESPONSE;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return SAFE_RESPONSE;

  // Invalidate any existing reset tokens
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = generateSecureToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: passwordResetExpiry(),
    },
  });

  await sendPasswordReset(user.email, token);

  return SAFE_RESPONSE;
}
