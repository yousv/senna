// api/approve-doctor.js
// POST { doctorId }  — approve a pending doctor (admin only)
// The secret key is used here so RLS is bypassed safely on the server.

const { getSupabaseAdmin }   = require('../lib/supabase')
const { requireAdmin, sendError } = require('../lib/auth')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed')
  try {
    await requireAdmin(req)
    const { doctorId } = req.body || {}
    if (!doctorId) return sendError(res, 400, 'doctorId required')

    const sb = getSupabaseAdmin()
    const { error } = await sb
      .from('doctors')
      .update({ status: 'approved', rejection_reason: null, updated_at: new Date().toISOString() })
      .eq('id', doctorId)
    if (error) throw error

    await sb.from('doctor_applications').insert({
      doctor_id: doctorId,
      action:    'approved',
      created_at: new Date().toISOString(),
    })

    res.json({ ok: true })
  } catch (e) {
    const status = e.status || 500
    console.error('[api/approve-doctor]', e.message)
    sendError(res, status, e.message)
  }
}
