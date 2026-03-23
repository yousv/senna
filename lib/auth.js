// lib/auth.js
// Verifies the user's JWT from Authorization header.
// Used in api/* routes that need authenticated server-side operations.

const { getSupabaseAdmin } = require('./supabase')

/**
 * Extracts and verifies the bearer token from an incoming API request.
 * Returns { user } on success, throws on failure.
 */
async function requireAuth(req) {
  const header = req.headers['authorization'] || ''
  const token  = header.replace(/^Bearer\s+/i, '').trim()
  if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 })

  const sb = getSupabaseAdmin()
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data?.user) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 })
  }
  return { user: data.user }
}

/**
 * Verifies the bearer token AND checks the user has an admin_users row.
 */
async function requireAdmin(req) {
  const { user } = await requireAuth(req)
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from('admin_users')
    .select('id,role,permissions')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !data) {
    throw Object.assign(new Error('Forbidden'), { status: 403 })
  }
  return { user, admin: data }
}

/**
 * Standard JSON error response helper.
 */
function sendError(res, status, message) {
  res.status(status).json({ error: message })
}

module.exports = { requireAuth, requireAdmin, sendError }
