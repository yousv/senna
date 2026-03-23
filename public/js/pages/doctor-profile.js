"use strict"

const PROFILE_EDIT_CD_KEY = "senna-prof-edit-cd"

function getProfileEditCooldownMs(doctorId, cooldownMinutes) {
  if (!cooldownMinutes || cooldownMinutes <= 0) return null
  try {
    const raw = localStorage.getItem(`${PROFILE_EDIT_CD_KEY}-${doctorId}`)
    if (!raw) return null
    const { ts } = JSON.parse(raw)
    const remaining = ts + cooldownMinutes * 60000 - Date.now()
    return remaining > 0 ? remaining : null
  } catch { return null }
}
function setProfileEditCooldown(doctorId) {
  localStorage.setItem(`${PROFILE_EDIT_CD_KEY}-${doctorId}`, JSON.stringify({ ts: Date.now() }))
}
function formatMinutes(ms) {
  const lang = getLang()
  const total = Math.ceil(ms / 60000), h = Math.floor(total / 60), m = total % 60
  if (h > 0) return lang==='ar' ? `${h} ساعة ${m>0?'و'+m+' دقيقة':''}` : `${h}h ${m>0?m+'m':''}`
  return lang==='ar' ? `${m} دقيقة` : `${m}m`
}

function imgBtn(url, label) {
  if (!url) return ''
  return `<button type="button" class="btn btn-s btn-xs" data-img="${esc(url)}" style="font-size:.75rem">${esc(label)}</button>`
}
function bindImgPreviews(container) {
  qs('[data-img]', container).forEach(btn => {
    btn.addEventListener('click', () => {
      showModal({ title: btn.textContent.trim(), size: 'md',
        content: `<img src="${esc(btn.dataset.img)}" style="width:100%;border-radius:var(--r);display:block" alt="">` })
    })
  })
}

registerRoute('/doctor/profile', async app => {
  if (!AppState.session || !AppState.doctor) { navigate('/doctor/login'); return }
  let editing = false
  let doc = { ...AppState.doctor }
  let files = { nid_front:null, nid_back:null, uid_front:null, uid_back:null }
  let hasPending = false
  let editCooldownHours = 24

  async function load() {
    const [edits, settings] = await Promise.all([
      dbGetPendingEdits().catch(() => []),
      dbGetPaymentSettings().catch(() => null),
    ])
    hasPending = edits.some(e => e.doctor_id === doc.id)
    editCooldownHours = settings?.metadata?.cooldowns?.doctorEdit ?? 0
  }

  async function render() {
    await load()
    const lang = getLang()
    const cooldownMs = getProfileEditCooldownMs(doc.id, editCooldownHours)

    app.innerHTML = `
      <div class="page-content" style="max-width:620px">
        <div class="sec-hd">
          <h1 class="sec-title">${esc(t('prof.title'))}</h1>
          ${statusBadge(doc.status, lang)}
        </div>
        ${hasPending ? `<div class="notice n-amb mb-3"><span class="notice-icon">${IC.warning}</span><span>${lang==='ar'?'لديك تعديلات معلّقة تنتظر موافقة الإدارة':'You have pending edits awaiting admin approval'}</span></div>` : ''}
        ${doc.status==='rejected'&&doc.rejection_reason ? `<div class="notice n-red mb-3"><div><p style="font-weight:600;font-size:.8125rem;margin-bottom:.25rem">${esc(t('auth.rej_r'))}</p><p style="font-size:.8125rem">${esc(doc.rejection_reason)}</p></div></div>` : ''}
        ${cooldownMs&&!editing ? `<div class="notice n-blu mb-3"><span class="notice-icon">${IC.info}</span><span>${esc(t('prof.cooldown'))} ${formatMinutes(cooldownMs)}</span></div>` : ''}
        <div class="card" id="pc"></div>
      </div>`

    editing ? renderEdit(cooldownMs) : renderView(cooldownMs)
  }

  function renderView(cooldownMs) {
    const lang = getLang()
    q('#pc').innerHTML = `
      <div class="dl mb-4">
        <div class="dl-item"><label>${esc(t('auth.name'))}</label><span>${esc(doc.full_name)}</span></div>
        <div class="dl-item"><label>${esc(t('auth.email'))}</label><span dir="ltr">${esc(doc.email)}</span></div>
        <div class="dl-item"><label>${esc(t('auth.phone'))}</label><span dir="ltr">${esc(doc.phone)}</span></div>
        <div class="dl-item"><label>${esc(t('auth.addr'))}</label><span>${esc(doc.address)}</span></div>
        <div class="dl-item"><label>${esc(t('auth.uni'))}</label><span>${esc(doc.university)}</span></div>
        <div class="dl-item"><label>${esc(t('auth.sem'))}</label><span>${esc(doc.semester)}</span></div>
        <div class="dl-item"><label>${esc(t('auth.nid'))}</label><span dir="ltr">${esc(doc.national_id_num)}</span></div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:.375rem;margin-bottom:1rem">
        ${imgBtn(doc.national_id_front_url,   t('adm.id_f'))}
        ${imgBtn(doc.national_id_back_url,    t('adm.id_b'))}
        ${imgBtn(doc.university_id_front_url, t('adm.uid_f'))}
        ${imgBtn(doc.university_id_back_url,  t('adm.uid_b'))}
      </div>
      <div class="dv dv-sm"></div>
      ${!hasPending&&!cooldownMs ? `<button class="btn btn-s btn-sm" id="b-edit" style="gap:.375rem">${IC.pencil}&nbsp;${esc(t('prof.edit'))}</button>` : ''}`
    bindImgPreviews(q('#pc'))
    q('#b-edit')?.addEventListener('click', () => { editing=true; renderEdit(cooldownMs) })
  }

  function renderEdit(cooldownMs) {
    const lang = getLang()
    q('#pc').innerHTML = `
      <div class="notice n-blu mb-3"><span class="notice-icon">${IC.info}</span><span>${esc(t('prof.edit_note'))}</span></div>
      <div style="display:flex;flex-direction:column;gap:.75rem">
        ${fld('e-name',  t('auth.name'),  'text', false)}
        ${fld('e-addr',  t('auth.addr'),  'text', false)}
        ${fld('e-phone', t('auth.phone'), 'tel',  false, '', 'ltr')}
        ${fld('e-uni',   t('auth.uni'),   'text', false)}
        ${fld('e-sem',   t('auth.sem'),   'text', false)}
      </div>
      <div class="dv dv-sm"></div>
      <p class="lbl mb-2">${lang==='ar'?'تحديث صور المستندات':'Update document photos'} <span style="color:var(--t4);font-size:.75rem">(${t('c.opt')})</span></p>
      <div class="g2 mb-3">${fuHTML('e-nid-f', t('auth.nidf'))}${fuHTML('e-nid-b', t('auth.nidb'))}</div>
      <div class="g2 mb-4">${fuHTML('e-uid-f', t('auth.uid_f'))}${fuHTML('e-uid-b', t('auth.uid_b'))}</div>
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-p btn-sm" id="b-sv">${esc(t('prof.save'))}</button>
        <button class="btn btn-s btn-sm" id="b-cn">${esc(t('prof.cancel'))}</button>
      </div>`

    q('#e-name').value  = doc.full_name  || ''
    q('#e-addr').value  = doc.address    || ''
    q('#e-phone').value = doc.phone      || ''
    q('#e-uni').value   = doc.university || ''
    q('#e-sem').value   = doc.semester   || ''

    fuBind('e-nid-f', f => files.nid_front = f)
    fuBind('e-nid-b', f => files.nid_back  = f)
    fuBind('e-uid-f', f => files.uid_front = f)
    fuBind('e-uid-b', f => files.uid_back  = f)

    q('#b-cn').onclick = () => { editing=false; renderView(cooldownMs) }
    q('#b-sv').onclick = async () => {
      clearErrs(q('#pc'))
      const lang = getLang()
      const newVals = sanObj({ full_name:q('#e-name').value.trim(), address:q('#e-addr').value.trim(), phone:q('#e-phone').value.trim(), university:q('#e-uni').value.trim(), semester:q('#e-sem').value.trim() })
      const changes = {}
      if (newVals.full_name && newVals.full_name !== doc.full_name) changes.full_name = newVals.full_name
      if (newVals.address   && newVals.address   !== doc.address)   changes.address   = newVals.address
      if (newVals.phone     && newVals.phone     !== doc.phone)     changes.phone     = newVals.phone
      if (newVals.university&& newVals.university!== doc.university)changes.university= newVals.university
      if (newVals.semester  && newVals.semester  !== doc.semester)  changes.semester  = newVals.semester
      const btn = q('#b-sv'); setLoad(btn, true)
      try {
        const [p1,p2,p3,p4] = await Promise.all([
          files.nid_front ? dbUploadFile(dbStoragePath('doc-nid',files.nid_front.name),files.nid_front) : Promise.resolve(null),
          files.nid_back  ? dbUploadFile(dbStoragePath('doc-nid',files.nid_back.name), files.nid_back)  : Promise.resolve(null),
          files.uid_front ? dbUploadFile(dbStoragePath('doc-uid',files.uid_front.name),files.uid_front) : Promise.resolve(null),
          files.uid_back  ? dbUploadFile(dbStoragePath('doc-uid',files.uid_back.name), files.uid_back)  : Promise.resolve(null),
        ])
        if(p1) changes.national_id_front_url   = p1
        if(p2) changes.national_id_back_url    = p2
        if(p3) changes.university_id_front_url = p3
        if(p4) changes.university_id_back_url  = p4
        if (!Object.keys(changes).length) { toast(lang==='ar'?'لم تقم بأي تغييرات':t('prof.no_changes'), 'info'); setLoad(btn,false); return }
        await dbSubmitDoctorEdit(doc.id, changes)
        if (editCooldownHours > 0) setProfileEditCooldown(doc.id)
        toast(lang==='ar'?'تم إرسال التعديلات للمراجعة':'Edit submitted for review', 'success')
        editing = false; await render()
      } catch(err) { toast(err.message||t('c.err'), 'error'); setLoad(btn,false) }
    }
  }

  render()
  const pendEditsChannel = dbSubscribeToPendingEdits(() => {
    dbGetPendingEdits().then(edits => {
      const newPending = edits.some(e => e.doctor_id === doc.id)
      if (newPending !== hasPending) { hasPending = newPending; render() }
    }).catch(()=>{})
  })
  window.addEventListener('hashchange', () => { if(pendEditsChannel) dbRemoveChannel(pendEditsChannel) }, { once:true })
})
