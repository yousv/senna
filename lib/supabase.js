// lib/supabase.js
// Server-only. Used exclusively in api/*.js Vercel serverless functions.
// This file is NEVER bundled or served to the browser.
// The SUPABASE_SECRET_KEY bypasses RLS — keep it here only.

const { createClient } = require('@supabase/supabase-js')

let _client = null

function getSupabaseAdmin() {
  if (_client) return _client
  const url    = process.env.SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) {
    throw new Error('[supabase] SUPABASE_URL or SUPABASE_SECRET_KEY env vars are missing')
  }
  _client = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  return _client
}

module.exports = { getSupabaseAdmin }
