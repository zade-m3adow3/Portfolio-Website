// api/log-research.js
// Vercel Serverless Function — Research Log CRUD
//
// GET  /api/log-research          → returns paginated log for authenticated user
// POST /api/log-research          → inserts a new log entry (requires JWT)
//
// Auth: Supabase Auth JWT in Authorization: Bearer <token>

import { supabaseAdmin, supabaseAnon } from './_lib/supabase.js';
import { checkRateLimit } from './_lib/rateLimit.js';

let Sentry;
try {
  Sentry = await import('@sentry/node');
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.VERCEL_ENV || 'development' });
} catch { /* optional */ }

// ── Verify JWT → returns user or null ────────────────────────
async function getUser(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export default async function handler(req, res) {
  try {
    // Rate limit all methods
    const rl = await checkRateLimit(req);
    if (!rl.allowed) {
      return res.status(429).json({ error: 'Too many requests.', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) });
    }

    // ── GET — paginated log entries ──────────────────────────
    if (req.method === 'GET') {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized. Provide a valid Bearer token.' });

      const page  = Math.max(1, parseInt(req.query.page  || '1'));
      const limit = Math.min(50, parseInt(req.query.limit || '20'));
      const from  = (page - 1) * limit;

      const { data, error, count } = await supabaseAdmin
        .from('research_logs')
        .select('id, action, payload, created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1);

      if (error) throw error;

      return res.status(200).json({
        data,
        meta: { page, limit, total: count, pages: Math.ceil(count / limit) },
      });
    }

    // ── POST — insert new log entry ──────────────────────────
    if (req.method === 'POST') {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized. Provide a valid Bearer token.' });

      const { action, payload } = req.body || {};
      if (!action || typeof action !== 'string') {
        return res.status(400).json({ error: 'Field "action" (string) is required.' });
      }

      // Hash IP for privacy-safe audit (never store raw IP)
      const rawIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown';
      const ipHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(rawIp + process.env.IP_HASH_SALT || 'antigravity')
      ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

      const { data, error } = await supabaseAdmin
        .from('research_logs')
        .insert({ user_id: user.id, action, payload: payload || {}, ip_hash: ipHash })
        .select('id, created_at')
        .single();

      if (error) throw error;
      return res.status(201).json({ success: true, id: data.id, created_at: data.created_at });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    Sentry?.captureException(err);
    console.error('[log-research]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
