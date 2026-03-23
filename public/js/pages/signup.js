'use strict'

registerRoute('/doctor/signup', app => {
  let step = 1
  const files = { front: null, back: null, uid_front: null, uid_back: null }
  const form  = { full_name:'', address:'', phone:'', email:'', university:'', semester:'', national_id:'', password:'', confirm_password:'' }

  const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
  const NID_RE   = /^\d{14}$/
  const PHONE_RE = /^(\+20|0020|0)?1[0125]\d{8}$/

  function render() {
    const lang = getLang()
    const stepLabels = [t('auth.p1'), t('auth.p2'), t('auth.p3'), t('auth.p4')]
    app.innerHTML = `
      <div class="page-center" style="align-items:flex-start;padding-top:1.5rem">
        <div style="width:100%;max-width:520px">
          <div class="sp">
            <div class="sp-hd">
              <span class="tsm tm">${t('auth.step')} ${step} ${t('auth.of')} 4</span>
              <span class="sp-lbl">${esc(stepLabels[step-1])}</span>
            </div>
            <div class="sp-trk"><div class="sp-bar" style="width:${step * 25}%"></div></div>
          </div>
          <div class="card">
            <form id="sf" novalidate>
              <div id="sc"></div>
              <div class="dv dv-sm"></div>
              <div class="flex jsb aic">
                ${step > 1 ? `<button type="button" class="btn btn-s btn-sm" id="b-bk">${esc(t('auth.back'))}</button>` : '<div></div>'}
                <button type="submit" class="btn btn-p btn-sm" id="b-nx" style="min-width:110px">
                  ${step === 4 ? esc(t('auth.submit')) : esc(t('auth.next'))}
                </button>
              </div>
            </form>
            <div class="dv dv-sm"></div>
            <p style="text-align:center;font-size:.8125rem;color:var(--t3)">
              ${esc(t('auth.have'))}
              <a href="#/doctor/login" style="color:var(--t1);font-weight:600">${esc(t('land.login'))}</a>
            </p>
          </div>
        </div>
      </div>`
    drawStep()
    q('#sf').onsubmit = e => { e.preventDefault(); step < 4 ? goNext() : doSubmit() }
    q('#b-bk')?.addEventListener('click', () => { saveStep(); step--; render() })
  }

  function drawStep() {
    const sc = q('#sc'), lang = getLang()
    if (step === 1) {
      sc.innerHTML = `<div style="display:flex;flex-direction:column;gap:.75rem">
        ${fld('full_name', t('auth.name'),  'text',  true)}
        ${fld('phone',     t('auth.phone'), 'tel',   true, t('auth.phone_ph'), 'ltr')}
        ${fld('email',     t('auth.email'), 'email', true, 'example@domain.com', 'ltr')}
        ${fld('address',   t('auth.addr'),  'text',  true)}
      </div>`
      restore(['full_name','phone','email','address'])
    } else if (step === 2) {
      sc.innerHTML = `<div style="display:flex;flex-direction:column;gap:.75rem">
        ${fld('university',  t('auth.uni'), 'text', true)}
        ${fld('semester',    t('auth.sem'), 'text', true, lang==='ar'?'مثال: الفصل الأول / السنة الثانية':'e.g. Semester 1 / Year 2')}
        ${fld('national_id', t('auth.nid'), 'text', true, t('auth.nid_ph'), 'ltr')}
      </div>`
      restore(['university','semester','national_id'])
    } else if (step === 3) {
      sc.innerHTML = `
        <div class="notice n-blu" style="margin-bottom:.875rem">
          <span class="notice-icon">${IC.info}</span>
          <span>${lang==='ar'?'يرجى رفع صور واضحة — JPG أو PNG':'Upload clear photos — JPG or PNG'}</span>
        </div>
        <div class="g2 mb4">${fuHTML('front', t('auth.nidf'), true)}${fuHTML('back', t('auth.nidb'), true)}</div>
        <div class="g2">${fuHTML('uid_front', t('auth.uid_f'), true)}${fuHTML('uid_back', t('auth.uid_b'), true)}</div>`
      fuBind('front',     f => files.front     = f)
      fuBind('back',      f => files.back      = f)
      fuBind('uid_front', f => files.uid_front = f)
      fuBind('uid_back',  f => files.uid_back  = f)
    } else {
      sc.innerHTML = `<div style="display:flex;flex-direction:column;gap:.75rem">
        ${pwdFieldHTML('password', t('auth.pass'), true)}
        <p style="font-size:.75rem;color:var(--t3);margin-top:-.25rem">${lang==='ar'?'8 أحرف على الأقل، حرف كبير، ورقم':'Min 8 chars, one uppercase, one number'}</p>
        ${pwdFieldHTML('confirm_password', t('auth.cpass'), true)}
      </div>`
      restore(['password','confirm_password'])
      bindPwdToggle('password'); bindPwdToggle('confirm_password')
    }
    qs('.inp', q('#sc')).forEach(inp => inp.addEventListener('input', () => { form[inp.id] = inp.value }))
  }

  function restore(fields) { fields.forEach(f => { const el = document.getElementById(f); if(el) el.value = form[f]||'' }) }
  function saveStep() { qs('.inp', app).forEach(inp => { if(inp.id) form[inp.id] = inp.value }) }

  function validate() {
    const lang = getLang(), e = {}
    if (step === 1) {
      if (!form.full_name || form.full_name.length < 3) e.full_name = lang==='ar'?'الاسم قصير جداً':'Name too short'
      if (!form.phone)                 e.phone = t('c.req')
      else if (!PHONE_RE.test(form.phone)) e.phone = lang==='ar'?'رقم الهاتف غير صالح':'Invalid phone'
      if (!form.email)                 e.email = t('c.req')
      else if (!EMAIL_RE.test(form.email)) e.email = lang==='ar'?'البريد غير صالح':'Invalid email'
      if (!form.address || form.address.length < 5) e.address = lang==='ar'?'العنوان قصير جداً':'Address too short'
    } else if (step === 2) {
      if (!form.university) e.university = t('c.req')
      if (!form.semester)   e.semester   = t('c.req')
      if (!form.national_id) e.national_id = t('c.req')
      else if (!NID_RE.test(form.national_id.replace(/\s/g,''))) e.national_id = lang==='ar'?'الرقم القومي 14 رقم':'Must be 14 digits'
    } else if (step === 3) {
      const flag = (key, elId) => { if(!files[key]){const el=document.getElementById(`fu-${elId}-e`);if(el){el.textContent=t('c.req');el.style.display='block'};return true};return false}
      const miss = flag('front','front')|flag('back','back')|flag('uid_front','uid_front')|flag('uid_back','uid_back')
      if (miss) e._files = true
    } else {
      if (!form.password || form.password.length < 8) e.password = lang==='ar'?'8 أحرف على الأقل':'Min 8 characters'
      else if (!/[A-Z]/.test(form.password))          e.password = lang==='ar'?'يجب أن تحتوي على حرف كبير':'Needs uppercase letter'
      else if (!/[0-9]/.test(form.password))          e.password = lang==='ar'?'يجب أن تحتوي على رقم':'Needs a number'
      if (form.password !== form.confirm_password)    e.confirm_password = lang==='ar'?'كلمة المرور غير متطابقة':'Passwords do not match'
    }
    return e
  }

  function goNext() {
    saveStep(); clearErrs(app)
    const errs = validate()
    if (Object.keys(errs).length) { Object.entries(errs).forEach(([k,v]) => { if(k!=='_files') showErr(k,v) }); return }
    step++; render()
  }

  async function doSubmit() {
    saveStep(); clearErrs(app)
    const errs = validate()
    if (Object.keys(errs).length) { Object.entries(errs).forEach(([k,v]) => { if(k!=='_files') showErr(k,v) }); return }
    const lang = getLang()
    const btn = q('#b-nx'); setLoad(btn, true)
    try {
      const user = await dbSignUp(form.email.toLowerCase(), form.password, { full_name: form.full_name })
      if (!user?.id) { renderPending(lang==='ar'?'تم إرسال رابط التأكيد إلى بريدك الإلكتروني.':'Confirmation email sent.'); return }
      try { await dbSignIn(form.email.toLowerCase(), form.password) } catch(_) {}
      const [p1,p2,p3,p4] = await Promise.all([
        files.front     ? dbUploadFile(dbStoragePath('doc-nid', files.front.name),     files.front)     : Promise.resolve(null),
        files.back      ? dbUploadFile(dbStoragePath('doc-nid', files.back.name),      files.back)      : Promise.resolve(null),
        files.uid_front ? dbUploadFile(dbStoragePath('doc-uid', files.uid_front.name), files.uid_front) : Promise.resolve(null),
        files.uid_back  ? dbUploadFile(dbStoragePath('doc-uid', files.uid_back.name),  files.uid_back)  : Promise.resolve(null),
      ])
      await dbCreateDoctorProfile({ p_user_id:user.id, p_full_name:form.full_name.trim(), p_email:form.email.toLowerCase(), p_phone:form.phone.trim(), p_address:form.address.trim(), p_university:form.university.trim(), p_semester:form.semester.trim(), p_national_id:form.national_id.replace(/\s/g,''), p_nid_front:p1, p_nid_back:p2, p_uid_front:p3, p_uid_back:p4 })
      await dbLogDoctorApplication(user.id, 'applied').catch(()=>{})
      await dbSignOut()
      renderPending(lang==='ar'?'تم استلام طلبك بنجاح. سيتم مراجعته من قِبَل الإدارة.':'Application submitted. Admin will review it shortly.')
    } catch(err) {
      await dbSignOut().catch(()=>{})
      const msg = err.message || ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered'))
        toast(lang==='ar'?'البريد الإلكتروني مسجل مسبقاً':'Email already registered', 'error')
      else toast(msg || t('c.err'), 'error', 8000)
      setLoad(btn, false)
    }
  }

  function renderPending(message) {
    app.innerHTML = `
      <div class="page-center">
        <div class="card" style="width:100%;max-width:360px;display:flex;flex-direction:column;align-items:center;gap:1rem;text-align:center">
          <div class="si si-amb">${IC.clock}</div>
          <h2 class="s-title">${esc(t('auth.pend_t'))}</h2>
          <p class="s-desc">${esc(message)}</p>
          <a href="#/doctor/login" class="btn btn-p btn-sm btn-full">${esc(t('land.login'))}</a>
        </div>
      </div>`
  }

  render()
})
