import { NextRequest } from "next/server";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitBucket>();

// Periodically prune expired entries
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of rateLimitStore.entries()) {
      if (bucket.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000);
}

export type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
};

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { maxRequests: 60, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const bucket = rateLimitStore.get(identifier);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetInMs: options.windowMs,
    };
  }

  if (bucket.count >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, bucket.resetAt - now),
    };
  }

  bucket.count++;
  return {
    allowed: true,
    remaining: options.maxRequests - bucket.count,
    resetInMs: Math.max(0, bucket.resetAt - now),
  };
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
