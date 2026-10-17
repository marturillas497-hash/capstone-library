import { getPool } from "@/lib/db";

/*
  Fixed window rate limiter backed by the rate_limits table.

  Why Postgres and not an in-memory Map: on Vercel every serverless instance
  has its own memory and resets on a cold start, so a Map lets an attacker
  walk straight past the limit. The pg pool already exists (lib/db.js), so
  this adds no new service, package or env var.

  One atomic upsert per call. Returns { ok, retryAfter } where retryAfter is
  in seconds. If the limiter itself errors it fails open (and logs), because
  the routes it protects need the same database anyway.
*/

// Vercel overwrites x-forwarded-for with the real client address, so the
// first entry is the caller. x-real-ip is checked first when present.
export function getClientIp(request) {
  const h = request.headers;
  return (
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function rateLimit(key, { limit, windowSec }) {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO rate_limits AS r (key, window_start, hits)
       VALUES ($1, to_timestamp(floor(extract(epoch from now()) / $2::int) * $2::int), 1)
       ON CONFLICT (key, window_start) DO UPDATE SET hits = r.hits + 1
       RETURNING hits,
         ceil(extract(epoch from (r.window_start + make_interval(secs => $2::int) - now())))::int AS retry_after`,
      [key, windowSec]
    );

    // Housekeeping on roughly 1 in 100 calls, so no cron job is needed.
    if (Math.random() < 0.01) {
      pool
        .query("DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'")
        .catch(() => {});
    }

    const { hits, retry_after } = rows[0];
    return { ok: hits <= limit, retryAfter: Math.max(retry_after, 1) };
  } catch (err) {
    console.error("rateLimit failed, allowing request:", err.message);
    return { ok: true, retryAfter: 0 };
  }
}
