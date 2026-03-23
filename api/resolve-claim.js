// api/resolve-claim.js — POST { claimId, status, reason? }
const { getSupabaseAdmin }        = require('../lib/supabase')
const { requireAdmin, sendError } = require('../lib/auth')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed')
  try {
    await requireAdmin(req)
    const { claimId, status, reason } = req.body || {}
    if (!claimId || !['approved','declined'].includes(status)) return sendError(res, 400, 'claimId and valid status required')
    const sb = getSupabaseAdmin()
    const { error } = await sb.from('doctor_claims')
      .update({ status, decline_reason: reason || null, updated_at: new Date().toISOString() })
      .eq('id', claimId)
    if (error) throw error
    res.json({ ok: true })
  } catch (e) { sendError(res, e.status || 500, e.message) }
}
