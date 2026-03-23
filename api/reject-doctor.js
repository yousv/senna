// api/reject-doctor.js — POST { doctorId, reason }
const { getSupabaseAdmin }        = require('../lib/supabase')
const { requireAdmin, sendError } = require('../lib/auth')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed')
  try {
    await requireAdmin(req)
    const { doctorId, reason } = req.body || {}
    if (!doctorId) return sendError(res, 400, 'doctorId required')
    const sb = getSupabaseAdmin()
    const { error } = await sb.from('doctors')
      .update({ status: 'rejected', rejection_reason: reason || null, updated_at: new Date().toISOString() })
      .eq('id', doctorId)
    if (error) throw error
    await sb.from('doctor_applications').insert({ doctor_id: doctorId, action: 'rejected', reason: reason || null, created_at: new Date().toISOString() }).throwOnError()
    res.json({ ok: true })
  } catch (e) { sendError(res, e.status || 500, e.message) }
}
