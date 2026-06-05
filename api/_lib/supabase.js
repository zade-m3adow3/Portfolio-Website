// api/_lib/supabase.js
// Supabase client initializer for Vercel Serverless Functions
// Uses service_role key for server-side operations (never expose to browser)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    '[supabase.js] Missing env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
    'Copy .env.example → .env.local and fill in your Supabase project credentials.'
  );
}

// Service-role client — full DB access, bypasses RLS
// NEVER import this on the client side
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// Anon client — respects RLS, safe for user-scoped queries
export const supabaseAnon = createClient(
  supabaseUrl,
  process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);
