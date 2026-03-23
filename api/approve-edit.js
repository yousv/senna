// api/approve-edit.js — POST { editId, doctorId }
const { getSupabaseAdmin }        = require('../lib/supabase')
const { requireAdmin, sendError } = require('../lib/auth')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed')
  try {
    await requireAdmin(req)
    const { editId, doctorId } = req.body || {}
    if (!editId || !doctorId) return sendError(res, 400, 'editId and doctorId required')
    const sb = getSupabaseAdmin()
    const { data, error } = await sb.from('doctor_pending_edits').select('changes').eq('id', editId).maybeSingle()
    if (error || !data) return sendError(res, 404, 'Edit not found')
    await sb.from('doctors').update({ ...data.changes, updated_at: new Date().toISOString() }).eq('id', doctorId).throwOnError()
    await sb.from('doctor_pending_edits').delete().eq('id', editId).throwOnError()
    res.json({ ok: true })
  } catch (e) { sendError(res, e.status || 500, e.message) }
}
