type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

declare global {
  var __cekharga_rate_limit_store__: Map<string, RateLimitEntry> | undefined;
}

const store = globalThis.__cekharga_rate_limit_store__ ?? new Map<string, RateLimitEntry>();
if (!globalThis.__cekharga_rate_limit_store__) {
  globalThis.__cekharga_rate_limit_store__ = store;
}

function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

export function applyRateLimit(
  request: Request,
  key: string,
  config: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const clientIp = getClientIp(request);
  const bucketKey = `${key}:${clientIp}`;
  const existing = store.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + config.windowMs;
    store.set(bucketKey, {
      count: 1,
      resetAt,
    });
    return {
      allowed: true,
      limit: config.limit,
      remaining: Math.max(0, config.limit - 1),
      resetAt,
    };
  }

  const nextCount = existing.count + 1;
  existing.count = nextCount;
  store.set(bucketKey, existing);

  const allowed = nextCount <= config.limit;
  return {
    allowed,
    limit: config.limit,
    remaining: Math.max(0, config.limit - nextCount),
    resetAt: existing.resetAt,
  };
}
