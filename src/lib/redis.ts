import Redis from "ioredis";

/**
 * Lazy, fail-safe Redis singleton.
 *
 * - Created on first use, only if REDIS_URL is set.
 * - `enableOfflineQueue: false` + `maxRetriesPerRequest: 1` make commands fail
 *   fast when Redis is unreachable, so callers can fall back instead of hanging.
 * - The 'error' listener prevents an unhandled 'error' event from crashing Node;
 *   the client keeps auto-reconnecting, so service resumes when Redis returns.
 */
let client: Redis | null = null;
let disabled = false;

export function getRedis(): Redis | null {
  if (disabled) return null;
  if (client) return client;

  const url = process.env.REDIS_URL;
  if (!url) {
    disabled = true; // no Redis configured — callers use their fallback
    return null;
  }

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 1500,
      lazyConnect: false,
    });
    let warned = false;
    client.on("error", (err) => {
      // Swallow connection errors — the limiter falls back to in-memory. Log only
      // the first occurrence to avoid flooding logs while Redis is unreachable.
      if (!warned) {
        warned = true;
        console.warn("[redis] unavailable, using in-memory rate-limit fallback:", err.message || err.name);
      }
    });
    client.on("ready", () => { warned = false; });
    return client;
  } catch {
    disabled = true;
    return null;
  }
}
