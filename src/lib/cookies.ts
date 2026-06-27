import { cookies } from "next/headers";

const REFRESH_COOKIE = "threadco_rt";
export const ACCESS_COOKIE = "threadco_at";
const isProd = process.env.NODE_ENV === "production";

// Access-token cookie lifetime. The JWT enforces its own (shorter) expiry;
// this just bounds how long the cookie is retained client-side.
const ACCESS_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days, in seconds

export async function setAccessCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax", // sent on same-site requests + top-level nav; blocks cross-site CSRF
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
}

export async function clearAccessCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
}

export async function setRefreshCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getRefreshCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE)?.value;
}

export async function clearRefreshCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(REFRESH_COOKIE);
}
