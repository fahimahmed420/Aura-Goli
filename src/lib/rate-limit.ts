/**
 * Distributed rate limiter for auth/abuse-sensitive endpoints.
 *
 * Uses Redis (shared across serverless instances) when REDIS_URL is configured,
 * and transparently falls back to a per-instance in-memory store if Redis is
 * absent or unreachable — so a Redis outage degrades protection but never blocks
 * legitimate traffic (fail-open).
 */

import { getRedis } from "@/lib/redis";

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

function rateLimitInMemory(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + opts.windowSecs * 1000 };
  }

  entry.count += 1;
  store.set(key, entry);

  return {
    allowed: entry.count <= opts.limit,
    remaining: Math.max(0, opts.limit - entry.count),
    resetAt: entry.resetAt,
  };
}

export async function rateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const redis = getRedis();
  if (redis) {
    try {
      const redisKey = `rl:${key}`;
      // INCR is atomic; set the TTL only on the first hit of a new window.
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, opts.windowSecs);
      }
      const ttl = await redis.ttl(redisKey);
      const resetAt = Date.now() + (ttl > 0 ? ttl : opts.windowSecs) * 1000;
      return {
        allowed: count <= opts.limit,
        remaining: Math.max(0, opts.limit - count),
        resetAt,
      };
    } catch {
      // Redis unreachable — degrade to in-memory rather than blocking the request.
    }
  }
  return rateLimitInMemory(key, opts);
}

// Per-endpoint presets
export const authRateLimits = {
  login: { limit: 10, windowSecs: 60 },
  register: { limit: 5, windowSecs: 60 },
  forgotPassword: { limit: 3, windowSecs: 300 },
  checkout: { limit: 5, windowSecs: 60 },
} as const;
