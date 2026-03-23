'use strict'

const PATIENT_RL_KEY = 'senna-patient-rl'

function getPatientCooldownMs() {
  try {
    const raw = localStorage.getItem(PATIENT_RL_KEY)
    if (!raw) return null
    const { ts, duration } = JSON.parse(raw)
    if (!duration || duration <= 0) return null
    const rem = ts + duration - Date.now()
    return rem > 0 ? rem : null
  } catch { return null }
}
function setPatientCooldown(durationMs) {
  if (!durationMs || durationMs <= 0) return
  localStorage.setItem(PATIENT_RL_KEY, JSON.stringify({ ts: Date.now(), duration: durationMs }))
}
function fmtCooldown(ms) {
  const lang = getLang()
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return lang === 'ar' ? `${h} ساعة و${m} دقيقة` : `${h}h ${m}m`
  return lang === 'ar' ? `${m} دقيقة` : `${m}m`
}
function calcAge(dob) {
  if (!dob) return null
  const a = Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000))
  return a >= 0 && a <= 120 ? a : null
}
function buildChipSelector(cid, items, sel, onChange) {
  function render() {
    const el = document.getElementById(cid); if (!el) return
    const lang = getLang()
    el.innerHTML = items.map(i =>
      `<button type="button" class="chip${sel.includes(i.v)?' chip-on':''}" data-v="${esc(i.v)}">${esc(lang==='ar'?i.ar:i.en)}</button>`
    ).join('')
    qs('[data-v]', el).forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.v, idx = sel.indexOf(v)
      idx !== -1 ? sel.splice(idx,1) : sel.push(v)
      b.classList.toggle('chip-on'); onChange([...sel])
    }))
  }
  return { render, get: () => [...sel] }
}
function buildChronicSelector(cid, sel, onChange) {
  function render() {
    const el = document.getElementById(cid); if (!el) return
    const lang = getLang()
    el.innerHTML = CHRONIC_CATEGORIES.map(cat =>
      `<div class="chronic-cat">
        <p class="chronic-cat-title">${esc(lang==='ar'?cat.category.ar:cat.category.en)}</p>
        <div class="chronic-items">
          ${cat.items.map(i=>`<button type="button" class="chip${sel.includes(i.v)?' chip-on':''}" data-v="${esc(i.v)}">${esc(lang==='ar'?i.ar:i.en)}</button>`).join('')}
        </div>
      </div>`
    ).join('')
    qs('[data-v]', el).forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.v, idx = sel.indexOf(v)
      idx !== -1 ? sel.splice(idx,1) : sel.push(v)
      b.classList.toggle('chip-on'); onChange([...sel])
    }))
  }
  return { render, get: () => [...sel] }
}

registerRoute('/patient/new', async app => {
  let cooldownMs = 0
  try {
    const settings = await dbGetPaymentSettings()
    const cdMinutes = settings?.metadata?.cooldowns?.patientRequest ?? 0
    cooldownMs = cdMinutes * 60000
  } catch(_) {}

  const rem = getPatientCooldownMs()
  if (rem !== null) {
    const lang = getLang()
    app.innerHTML = `
      <div class="page-center">
        <div class="card" style="width:100%;max-width:360px;display:flex;flex-direction:column;align-items:center;gap:1rem;text-align:center">
          <div class="si si-amb">${IC.clock}</div>
          <h2 class="s-title">${lang==='ar'?'يرجى الانتظار':'Please Wait'}</h2>
          <p class="s-desc">${lang==='ar'?`يمكنك تقديم طلب جديد بعد ${fmtCooldown(rem)}`:`You can submit again in ${fmtCooldown(rem)}`}</p>
          <button class="btn btn-s btn-sm btn-full" id="b-bk">${esc(t('c.back'))}</button>
        </div>
      </div>`
    q('#b-bk').addEventListener('click', () => navigate('/'))
    return
  }

  let idFront = null, idBack = null
  const selCond = [], selChronic = []
  let condCtrl = null, chronicCtrl = null, chronicOpen = false
  const today  = new Date().toISOString().split('T')[0]
  const minDob = new Date(Date.now() - 120*365.25*24*3600000).toISOString().split('T')[0]

  function renderForm() {
    const lang = getLang()
    app.innerHTML = `
      <div class="page-center" style="align-items:flex-start;padding-top:1.5rem">
        <div class="card" style="width:100%;max-width:560px">
          <div style="margin-bottom:1.25rem">
            <h1 style="font-size:1rem;font-weight:700;color:var(--t1);letter-spacing:-.02em">${esc(t('pat.title'))}</h1>
            <p style="font-size:.8125rem;color:var(--t3);margin-top:.25rem">${esc(t('pat.desc'))}</p>
          </div>
          <form id="pf" novalidate style="display:flex;flex-direction:column;gap:.875rem">
            ${fld('p-name',  t('pat.name'),  'text', true)}
            <div class="fg">
              <label class="lbl">${esc(t('pat.gender'))}<span class="req">*</span></label>
              <select class="select" id="p-gender">
                <option value="">—</option>
                <option value="male">${esc(t('pat.male'))}</option>
                <option value="female">${esc(t('pat.female'))}</option>
              </select>
              <p class="ferr" id="p-gender-e" style="display:none"></p>
            </div>
            ${fld('p-addr',  t('pat.addr'),  'text', true)}
            ${fld('p-phone', t('pat.phone'), 'tel',  true, t('auth.phone_ph'), 'ltr')}
            ${fld('p-nid',   t('pat.nid'),   'text', true, t('auth.nid_ph'), 'ltr')}
            <div class="fg">
              <label class="lbl">${esc(t('pat.dob'))}<span class="req">*</span></label>
              <div style="display:flex;align-items:center;gap:.75rem">
                <input class="inp" id="p-dob" type="date" dir="ltr" min="${minDob}" max="${today}" style="flex:1">
                <span id="p-age" style="font-size:.8125rem;font-weight:600;color:var(--t1);min-width:48px;display:none"></span>
              </div>
              <p class="ferr" id="p-dob-e" style="display:none"></p>
            </div>
            <div class="g2">${fuHTML('p-front', t('pat.nidf'), true)}${fuHTML('p-back', t('pat.nidb'), true)}</div>
            <div class="fg">
              <label class="lbl">${esc(t('pat.suf'))}<span class="req">*</span></label>
              <div id="cond-sel" class="chips" style="margin-top:.25rem"></div>
              <p class="ferr" id="cond-e" style="display:none"></p>
            </div>
            <div class="fg">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap">
                <label class="lbl" style="margin:0">${esc(t('pat.chronic'))}</label>
                <div style="display:flex;gap:2px;background:var(--surf2);border:1px solid var(--bdr);border-radius:6px;padding:2px">
                  <button type="button" class="tab${!chronicOpen?' active':''}" id="btn-no" style="height:24px;font-size:.75rem">${esc(t('pat.chronic_no'))}</button>
                  <button type="button" class="tab${chronicOpen?' active':''}" id="btn-yes" style="height:24px;font-size:.75rem">${esc(t('pat.chronic_yes'))}</button>
                </div>
              </div>
              <div id="chronic-col" style="${chronicOpen?'':'display:none'}margin-top:.5rem">
                <p style="font-size:.75rem;color:var(--t3);margin-bottom:.5rem">${esc(t('pat.chronic_hint'))}</p>
                <div id="chronic-sel"></div>
              </div>
            </div>
            <div class="fg">
              <label class="lbl">${esc(t('pat.notes'))} <span style="color:var(--t4);font-size:.75rem">(${t('c.opt')})</span></label>
              <textarea class="inp" id="p-notes" rows="3" placeholder="${esc(t('pat.notesph'))}" maxlength="1000" style="height:auto;padding:.625rem .75rem;resize:vertical"></textarea>
            </div>
            <button type="submit" class="btn btn-p btn-md btn-full" id="b-sub" style="margin-top:.25rem">${esc(t('pat.submit'))}</button>
          </form>
        </div>
      </div>`

    fuBind('p-front', f => idFront = f)
    fuBind('p-back',  f => idBack  = f)

    q('#p-dob').addEventListener('input', () => {
      const a = calcAge(q('#p-dob').value), sp = q('#p-age')
      sp.textContent = a !== null ? (getLang()==='ar'?`${a} سنة`:`${a} yrs`) : ''
      sp.style.display = a !== null ? 'block' : 'none'
    })

    const col = q('#chronic-col')
    q('#btn-no').addEventListener('click', () => {
      chronicOpen = false; col.style.display = 'none'
      q('#btn-no').classList.add('active'); q('#btn-yes').classList.remove('active')
      selChronic.length = 0
    })
    q('#btn-yes').addEventListener('click', () => {
      chronicOpen = true; col.style.display = 'block'
      q('#btn-yes').classList.add('active'); q('#btn-no').classList.remove('active')
      chronicCtrl?.render()
    })

    condCtrl    = buildChipSelector('cond-sel', SUFFERING, selCond, () => {})
    chronicCtrl = buildChronicSelector('chronic-sel', selChronic, () => {})
    condCtrl.render()
    if (chronicOpen) chronicCtrl.render()

    q('#pf').onsubmit = async e => {
      e.preventDefault(); clearErrs(app)
      const lang = getLang()
      const EGP = /^(\+20|0020|0)?1[0125]\d{8}$/, NID = /^\d{14}$/
      let hasErr = false
      const fe = (id, msg) => { showErr(id, msg); hasErr = true }
      const name   = san(q('#p-name').value.trim())
      const gender = q('#p-gender').value
      const addr   = san(q('#p-addr').value.trim())
      const phone  = san(q('#p-phone').value.trim())
      const nid    = san(q('#p-nid').value.trim())
      const dob    = q('#p-dob').value.trim()
      const notes  = san(q('#p-notes').value.trim())
      if (!name  || name.length  < 3) fe('p-name',  lang==='ar'?'الاسم قصير جداً':'Name too short')
      if (!['male','female'].includes(gender)) fe('p-gender', t('c.req'))
      if (!addr  || addr.length  < 5) fe('p-addr',  lang==='ar'?'العنوان قصير جداً':'Address too short')
      if (!EGP.test(phone))           fe('p-phone', lang==='ar'?'رقم الهاتف غير صالح':'Invalid phone')
      if (!NID.test(nid))             fe('p-nid',   lang==='ar'?'الرقم القومي 14 رقم':'Must be 14 digits')
      if (!dob)                       fe('p-dob',   t('c.req'))
      else if (calcAge(dob) === null) fe('p-dob',   lang==='ar'?'تاريخ الميلاد غير صالح':'Invalid date')
      if (!idFront) { const el=q('#fu-p-front-e');if(el){el.textContent=t('c.req');el.style.display='block'};hasErr=true }
      if (!idBack)  { const el=q('#fu-p-back-e'); if(el){el.textContent=t('c.req');el.style.display='block'};hasErr=true }
      const conds = condCtrl.get()
      if (!conds.length) { const el=q('#cond-e');if(el){el.textContent=lang==='ar'?'اختر نوعاً واحداً على الأقل':'Select at least one';el.style.display='block'};hasErr=true }
      if (hasErr) return

      const btn = q('#b-sub'); setLoad(btn, true)
      try {
        const existingPid = await dbFindPatientByIdentity(phone, nid)
        const pid = existingPid || await dbGeneratePatientCode()
        const isReturning = !!existingPid
        const [fp, bp] = await Promise.all([
          dbUploadFile(dbStoragePath('pat-nid', idFront.name), idFront),
          dbUploadFile(dbStoragePath('pat-nid', idBack.name),  idBack),
        ])
        await dbSubmitPatientRequest({ patientId:pid, fullName:name, gender, address:addr, phone, nationalId:nid, nidFront:fp, nidBack:bp, suffering:[...conds,...(chronicOpen?chronicCtrl.get():[])], notes:notes||'', dob:dob||null })
        setPatientCooldown(cooldownMs)

        app.innerHTML = `
          <div class="page-center">
            <div class="card" style="width:100%;max-width:380px;display:flex;flex-direction:column;align-items:center;gap:1rem;text-align:center">
              <div class="si si-ok">${IC.checkCircle}</div>
              <h2 class="s-title">${esc(t('pat.ok_t'))}</h2>
              ${isReturning?`<div class="notice n-blu" style="text-align:start;width:100%"><span class="notice-icon">${IC.info}</span><span style="font-size:.8125rem">${lang==='ar'?'عرفناك! الطلب مربوط برقمك القديم.':'Returning patient — linked to your existing code.'}</span></div>`:''}
              <div>
                <p style="font-size:.75rem;color:var(--t3);margin-bottom:.375rem">${esc(t('pat.ok_id'))}</p>
                <div style="display:flex;align-items:center;gap:.5rem;background:var(--surf2);border:1px solid var(--bdr);border-radius:var(--r);padding:.5rem .875rem">
                  <span style="font-size:1.25rem;font-weight:700;color:var(--t1);letter-spacing:.05em;font-variant-numeric:tabular-nums">${esc(pid)}</span>
                  <button id="b-cp" class="btn btn-g btn-icon btn-sm" type="button" style="margin-inline-start:auto">${IC.copy}</button>
                </div>
                <p id="cp-ok" style="font-size:.75rem;color:var(--green);display:none;margin-top:.25rem">${t('c.copied')}</p>
              </div>
              <div class="notice n-amb" style="text-align:start;width:100%">
                <span class="notice-icon">${IC.warning}</span>
                <span style="font-size:.8125rem">${esc(t('pat.ok_save'))}</span>
              </div>
              <button class="btn btn-p btn-sm btn-full" id="b-home">${lang==='ar'?'العودة للرئيسية':'Back to Home'}</button>
            </div>
          </div>`
        q('#b-cp').onclick = () => {
          navigator.clipboard.writeText(pid)
          q('#cp-ok').style.display='block'
          setTimeout(() => { q('#cp-ok').style.display='none' }, 2000)
        }
        q('#b-home').addEventListener('click', () => navigate('/'))
      } catch(err) {
        toast((getLang()==='ar'?'خطأ: ':'Error: ')+(err.message||t('c.err')), 'error', 8000)
        setLoad(btn, false)
      }
    }
  }
  renderForm()
})
