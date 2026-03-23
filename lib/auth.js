// lib/auth.js — server-only JWT verification
const { getSupabaseAdmin } = require('./supabase')

async function requireAuth(req) {
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 })
  const { data, error } = await getSupabaseAdmin().auth.getUser(token)
  if (error || !data?.user) throw Object.assign(new Error('Unauthorized'), { status: 401 })
  return { user: data.user }
}

async function requireAdmin(req) {
  const { user } = await requireAuth(req)
  const { data, error } = await getSupabaseAdmin()
    .from('admin_users').select('id,role,permissions').eq('user_id', user.id).maybeSingle()
  if (error || !data) throw Object.assign(new Error('Forbidden'), { status: 403 })
  return { user, admin: data }
}

function sendError(res, status, message) { res.status(status).json({ error: message }) }

module.exports = { requireAuth, requireAdmin, sendError }
