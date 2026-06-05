// api/_lib/rateLimit.js
// Sliding-window rate limiter using Upstash Redis
// Falls back to a permissive in-memory map if UPSTASH vars are missing (dev mode)

const WINDOW_MS     = 60_000;  // 1 minute
const MAX_REQUESTS  = 10;       // requests per window per IP

// ── In-memory fallback (dev only, resets on cold start) ─────
const devStore = new Map();
function devRateLimit(ip) {
  const now = Date.now();
  const entry = devStore.get(ip) || { count: 0, reset: now + WINDOW_MS };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + WINDOW_MS; }
  entry.count++;
  devStore.set(ip, entry);
  return {
    allowed: entry.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - entry.count),
    resetAt: entry.reset,
  };
}

// ── Upstash Redis (production) ───────────────────────────────
async function upstashRateLimit(ip) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const key   = `rl:${ip}`;
  const now   = Date.now();
  const windowStart = now - WINDOW_MS;

  // ZREMRANGEBYSCORE — remove old entries outside the window
  await fetch(`${url}/zremrangebyscore/${key}/-inf/${windowStart}`, {
    headers: { Authorization: `Bearer ${token}` },
    method: 'POST',
  });

  // ZADD — add current timestamp as score
  await fetch(`${url}/zadd/${key}/${now}/${now}`, {
    headers: { Authorization: `Bearer ${token}` },
    method: 'POST',
  });

  // ZCARD — count requests in window
  const cardRes = await fetch(`${url}/zcard/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { result: count } = await cardRes.json();

  // Set TTL so key auto-expires
  await fetch(`${url}/expire/${key}/${Math.ceil(WINDOW_MS / 1000)}`, {
    headers: { Authorization: `Bearer ${token}` },
    method: 'POST',
  });

  return {
    allowed: count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - count),
    resetAt: now + WINDOW_MS,
  };
}

// ── Public interface ─────────────────────────────────────────
export async function checkRateLimit(req) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const hasUpstash =
    !!process.env.UPSTASH_REDIS_REST_URL &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN;

  return hasUpstash ? upstashRateLimit(ip) : devRateLimit(ip);
}
