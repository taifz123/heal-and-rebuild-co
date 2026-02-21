/**
 * In-memory rate limiter middleware for Express.
 *
 * Uses a sliding window approach with automatic cleanup.
 * For production with multiple instances, replace with Redis-backed limiter.
 *
 * Usage:
 *   app.post("/api/auth/login", rateLimit({ windowMs: 15*60*1000, max: 10 }), handler);
 */
import type { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window per IP */
  max: number;
  /** Custom message on rate limit exceeded */
  message?: string;
  /** Custom key generator (defaults to IP) */
  keyGenerator?: (req: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [, store] of stores) {
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }
}, 5 * 60 * 1000);

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = "Too many requests, please try again later.",
    keyGenerator = (req: Request) => {
      // Use X-Forwarded-For for Replit's reverse proxy
      const forwarded = req.headers["x-forwarded-for"];
      const ip = typeof forwarded === "string"
        ? forwarded.split(",")[0].trim()
        : req.ip || req.socket.remoteAddress || "unknown";
      return ip;
    },
  } = options;

  // Create a unique store for this limiter instance
  const storeId = `${windowMs}-${max}-${Math.random().toString(36).slice(2)}`;
  const store = new Map<string, RateLimitEntry>();
  stores.set(storeId, store);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      // New window
      store.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", max - 1);
      res.setHeader("X-RateLimit-Reset", Math.ceil((now + windowMs) / 1000));
      return next();
    }

    if (entry.count >= max) {
      // Rate limit exceeded
      const retryAfterMs = entry.resetAt - now;
      res.setHeader("Retry-After", Math.ceil(retryAfterMs / 1000));
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));
      return res.status(429).json({ error: message });
    }

    // Increment
    entry.count++;
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", max - entry.count);
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));
    return next();
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Too many login attempts. Please try again in 15 minutes.",
});

export const otpRequestRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: "Too many OTP requests. Please wait a minute before trying again.",
});

export const otpVerifyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Too many verification attempts. Please try again later.",
});

export const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: "Too many webhook requests.",
});

export const generalApiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: "Too many requests. Please slow down.",
});
