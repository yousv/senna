// api/reject-edit.js — POST { editId }
const { getSupabaseAdmin }        = require('../lib/supabase')
const { requireAdmin, sendError } = require('../lib/auth')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed')
  try {
    await requireAdmin(req)
    const { editId } = req.body || {}
    if (!editId) return sendError(res, 400, 'editId required')
    const { error } = await getSupabaseAdmin().from('doctor_pending_edits').delete().eq('id', editId)
    if (error) throw error
    res.json({ ok: true })
  } catch (e) { sendError(res, e.status || 500, e.message) }
}
