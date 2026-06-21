import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return new Response("Google OAuth not configured", { status: 503 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const { searchParams } = new URL(req.url);
  const next = searchParams.get("next") ?? "/account/orders";
  const state = Buffer.from(JSON.stringify({ next })).toString("base64url");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account");

  return Response.redirect(url.toString());
}
