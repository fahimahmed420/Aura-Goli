import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  signAccessToken,
  refreshTokenExpiry,
  generateSecureToken,
} from "@/lib/auth";
import { setRefreshCookie, setAccessCookie } from "@/lib/cookies";
import { resolveAppUrl } from "@/lib/url";

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  error?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

export async function GET(req: NextRequest) {
  const appUrl = resolveAppUrl(req);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return Response.redirect(new URL("/login?error=oauth_not_configured", appUrl));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError || !code) {
    return Response.redirect(new URL("/login?error=google_denied", appUrl));
  }

  let next = "/account/orders";
  let isAdmin = false;
  try {
    if (stateRaw) {
      const parsed = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
      if (typeof parsed.next === "string") next = parsed.next;
      if (parsed.admin === true) isAdmin = true;
    }
  } catch { /* ignore */ }

  const redirectUri = `${appUrl}/api/auth/google/callback`;

  // Exchange code for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
  if (tokenData.error || !tokenData.access_token) {
    return Response.redirect(new URL("/login?error=google_token_failed", appUrl));
  }

  // Fetch user profile
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) {
    return Response.redirect(new URL("/login?error=google_userinfo_failed", appUrl));
  }
  const googleUser = (await userRes.json()) as GoogleUserInfo;

  // Upsert user — match by googleId first, then email
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: googleUser.id }, { email: googleUser.email }] },
  });

  if (user) {
    // Link googleId and update avatar if missing
    if (!user.googleId || !user.avatarUrl) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId ?? googleUser.id,
          avatarUrl: user.avatarUrl ?? googleUser.picture ?? null,
        },
      });
    }
  } else {
    // New user — register via Google
    user = await prisma.user.create({
      data: {
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.id,
        avatarUrl: googleUser.picture ?? null,
        emailVerifiedAt: googleUser.verified_email ? new Date() : null,
        // passwordHash intentionally null — Google-only account
      },
    });
  }

  if (user.isBlocked) {
    return Response.redirect(new URL("/login?error=account_suspended", appUrl));
  }

  // Admin flow: reject non-admins
  if (isAdmin && user.role !== "admin") {
    return Response.redirect(new URL("/admin/login?error=not_admin", appUrl));
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });

  const expiresAt = refreshTokenExpiry(false);
  const rawRefreshToken = generateSecureToken();

  await prisma.refreshToken.create({ data: { userId: user.id, token: rawRefreshToken, expiresAt } });
  await setRefreshCookie(rawRefreshToken, expiresAt);

  if (isAdmin) {
    const callbackUrl = new URL("/admin/auth/callback", appUrl);
    callbackUrl.searchParams.set("token", accessToken);
    return Response.redirect(callbackUrl.toString());
  }

  // Storefront session: set the HttpOnly access cookie and redirect WITHOUT the
  // token in the URL (a JWT in the query string leaks to history/Referer/logs).
  await setAccessCookie(accessToken);
  const callbackUrl = new URL("/auth/callback", appUrl);
  callbackUrl.searchParams.set("next", next);

  return Response.redirect(callbackUrl.toString());
}
