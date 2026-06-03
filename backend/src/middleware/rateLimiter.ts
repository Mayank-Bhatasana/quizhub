import type { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store – good for single-process; swap for Redis in multi-instance.
const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60_000);

/**
 * Factory that returns a general-purpose IP-based rate limiter middleware.
 *
 * @param windowMs   - Rolling window in milliseconds (default: 60 000 = 1 min)
 * @param max        - Max requests per IP per window (default: 120)
 * @param message    - Error message on 429 (optional)
 *
 * Sets standard RateLimit-* headers on every response.
 */
export const rateLimiter = (
  windowMs = 60_000,
  max = 120,
  message = "Too many requests. Please slow down.",
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = `rl:${req.ip ?? "unknown"}`;
    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowMs };
      store.set(key, entry);
    } else {
      entry.count += 1;
    }

    const remaining = Math.max(0, max - entry.count);
    const resetSec = Math.ceil(entry.resetAt / 1000);

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(resetSec));

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
};
