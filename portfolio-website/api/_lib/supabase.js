// api/_lib/supabase.js
// Supabase client initializer for Vercel Serverless Functions
// Uses service_role key for server-side operations (never expose to browser)

import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      '[supabase.js] Missing env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Add them to .env.local or Vercel project settings.'
    );
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

function getSupabaseAnon() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error('[supabase.js] Missing env vars: SUPABASE_URL or SUPABASE_ANON_KEY.');
  }
  return createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
}

// Lazy singletons — created on first call, not at module load
let _admin = null;
let _anon  = null;

// Service-role client — full DB access, bypasses RLS. NEVER use on client side.
export const supabaseAdmin = new Proxy({}, {
  get(_, prop) {
    if (!_admin) _admin = getSupabaseAdmin();
    return _admin[prop];
  }
});

// Anon client — respects RLS, safe for user-scoped queries
export const supabaseAnon = new Proxy({}, {
  get(_, prop) {
    if (!_anon) _anon = getSupabaseAnon();
    return _anon[prop];
  }
});
