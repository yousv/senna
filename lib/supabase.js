// lib/supabase.js — server-only, never sent to browser
const { createClient } = require('@supabase/supabase-js')
let _client = null

function getSupabaseAdmin() {
  if (_client) return _client
  const url    = process.env.SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) throw new Error('SUPABASE_URL or SUPABASE_SECRET_KEY env vars missing')
  _client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  return _client
}

module.exports = { getSupabaseAdmin }
