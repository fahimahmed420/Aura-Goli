/**
 * In-memory rate limiter for auth endpoints.
 * In production, swap the store for Redis (ioredis) to share state across instances.
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Window length in seconds */
  windowSecs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + opts.windowSecs * 1000 };
  }

  entry.count += 1;
  store.set(key, entry);

  const allowed = entry.count <= opts.limit;
  const remaining = Math.max(0, opts.limit - entry.count);

  return { allowed, remaining, resetAt: entry.resetAt };
}

// Per-endpoint presets
export const authRateLimits = {
  login: { limit: 10, windowSecs: 60 },
  register: { limit: 5, windowSecs: 60 },
  forgotPassword: { limit: 3, windowSecs: 300 },
  checkout: { limit: 5, windowSecs: 60 },
} as const;
