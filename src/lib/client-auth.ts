// Client-side helper for checking the current session.
//
// The access-token cookie is short-lived (JWT_ACCESS_EXPIRES_IN, ~15m) while
// the refresh-token cookie lives much longer. /api/auth/refresh was wired up
// server-side but nothing ever called it from the client, so any session
// older than the access token's TTL looked "logged out" everywhere (Nav,
// account pages) even though the refresh cookie was still valid — the user
// just had to log in again to get a fresh access token. This retries once
// via /api/auth/refresh (which rotates the cookie) before giving up.
export async function fetchCurrentUser(bearerToken: string | null): Promise<Response> {
  const headers = bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined;
  let res = await fetch("/api/auth/me", { headers });

  if (res.status === 401) {
    const refreshed = await fetch("/api/auth/refresh", { method: "POST" }).catch(() => null);
    if (refreshed?.ok) {
      res = await fetch("/api/auth/me", { headers });
    }
  }

  return res;
}
