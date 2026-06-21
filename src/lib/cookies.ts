import { cookies } from "next/headers";

const REFRESH_COOKIE = "threadco_rt";
const isProd = process.env.NODE_ENV === "production";

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
