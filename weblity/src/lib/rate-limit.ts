/**
 * Eenvoudige rate limiting, in het geheugen van één proces.
 *
 * Genoeg om iemand die klantcodes probeert te raden flink af te remmen. Draai
 * je Weblity op meer dan één server, vervang dit dan door een variant op Redis
 * of Upstash; de rest van de code merkt daar niets van.
 */

import "server-only";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {
    // Verlopen tellers opruimen, anders groeit de Map eindeloos.
    const timer = setInterval(() => this.cleanup(), windowMs);
    timer.unref?.();
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || now > entry.resetAt) {
      const resetAt = now + this.windowMs;
      this.hits.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: this.max - 1, resetAt, retryAfterSeconds: 0 };
    }

    if (entry.count >= this.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: this.max - entry.count,
      resetAt: entry.resetAt,
      retryAfterSeconds: 0,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.hits) {
      if (now > entry.resetAt) this.hits.delete(key);
    }
  }
}

// Tijdens het ontwikkelen herlaadt Next.js modules; hergebruik voorkomt dat
// de teller bij elke wijziging op nul springt.
const globalForLimit = globalThis as unknown as {
  weblityLoginLimiter?: RateLimiter;
  weblitySaveLimiter?: RateLimiter;
};

/** 10 inlogpogingen per kwartier per IP-adres. */
export const loginLimiter = globalForLimit.weblityLoginLimiter ?? new RateLimiter(10, 15 * 60_000);

/** 60 opslagen per minuut per site. */
export const saveLimiter = globalForLimit.weblitySaveLimiter ?? new RateLimiter(60, 60_000);

globalForLimit.weblityLoginLimiter = loginLimiter;
globalForLimit.weblitySaveLimiter = saveLimiter;

/** Haalt het IP-adres uit de bekende proxy-koppen. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "onbekend"
  );
}
