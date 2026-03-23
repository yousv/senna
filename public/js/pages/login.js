'use strict'

registerRoute('/doctor/login', app => { renderLoginForm(app) })

registerRoute('/auth/callback', async app => {
  app.innerHTML = `<div class="sp-page"><div class="spin spin-lg"></div></div>`
  try {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) await dbExchangeCode(code)
    const session = await dbGetSession()
    if (!session) { navigate('/'); return }
    await authSetSession(session)
    renderNavbar(); renderBottomNav()
    navigate(AppState.isAdmin ? '/admin' : '/doctor/dash')
  } catch(e) { console.error('[callback]', e); navigate('/') }
})

function renderLoginForm(app) {
  const lang = getLang()
  app.innerHTML = `
    <div class="page-center">
      <div class="card" style="width:100%;max-width:380px">
        <div style="display:flex;align-items:center;gap:.625rem;margin-bottom:1.5rem">
          <div style="width:32px;height:32px;background:var(--t1);border-radius:7px;display:flex;align-items:center;justify-content:center;color:var(--bg);flex-shrink:0">
            ${IC.tooth.replace('width="20"','width="14"').replace('height="20"','height="14"')}
          </div>
          <div>
            <p style="font-size:.9375rem;font-weight:700;color:var(--t1);letter-spacing:-.02em">${esc(t('app.name'))}</p>
            <p style="font-size:.75rem;color:var(--t3)">${lang==='ar'?'دخول الأطباء والمشرفين':'Doctor & Admin Login'}</p>
          </div>
        </div>
        <form id="lf" novalidate style="display:flex;flex-direction:column;gap:.75rem">
          ${fld('identifier', t('auth.id_or_ph'), 'text', true, lang==='ar'?'البريد أو رقم الهاتف':'Email or phone', 'ltr')}
          ${pwdFieldHTML('password', t('auth.pass'), true)}
          <button type="submit" class="btn btn-p btn-md btn-full" id="b-login" style="margin-top:.125rem">
            ${esc(t('land.login'))}
          </button>
        </form>
        <div class="dv dv-sm"></div>
        <p style="text-align:center;font-size:.8125rem;color:var(--t3)">
          ${esc(t('auth.no_acc'))}
          <a href="#/doctor/signup" style="color:var(--t1);font-weight:600">${esc(t('land.signup'))}</a>
        </p>
      </div>
    </div>`

  bindPwdToggle('password')

  q('#lf').onsubmit = async e => {
    e.preventDefault()
    clearErrs(app)
    const rawId = q('#identifier').value.trim()
    const pw    = q('#password').value
    if (!rawId) { showErr('identifier', t('c.req')); return }
    if (!pw)    { showErr('password',   t('c.req')); return }

    const btn = q('#b-login'); setLoad(btn, true)
    try {
      let email = rawId
      if (!rawId.includes('@')) {
        email = await dbGetDoctorPhoneEmail(rawId)
        if (!email) throw new Error(lang==='ar'?'رقم الهاتف غير مسجل':'Phone number not registered')
      }
      const session = await dbSignIn(email.toLowerCase(), pw)
      await authSetSession(session)

      if (AppState.isAdmin) { renderNavbar(); renderBottomNav(); navigate('/admin'); return }
      if (!AppState.doctor) {
        toast(lang==='ar'?'الملف الشخصي غير مكتمل. تواصل مع الإدارة.':'Profile incomplete. Contact admin.', 'error', 8000)
        await authSignOut(); setLoad(btn, false); return
      }
      if (AppState.doctor.status === 'pending')  { renderStatusScreen(app, 'pending'); return }
      if (AppState.doctor.status === 'rejected') { renderRejectedScreen(app, AppState.doctor); return }
      renderNavbar(); renderBottomNav(); navigate('/doctor/dash')

    } catch(err) {
      const msg = err.message || t('c.err')
      if (msg.toLowerCase().includes('not confirmed')) { renderStatusScreen(app, 'unverified') }
      else if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        toast(lang==='ar'?'كلمة المرور غير صحيحة':'Wrong password', 'error'); setLoad(btn, false)
      } else { toast(msg, 'error'); setLoad(btn, false) }
    }
  }
}

function renderStatusScreen(app, status) {
  const lang = getLang()
  const cfg = {
    unverified: { cls:'si-amb', icon:IC.clock, title:lang==='ar'?'تحقق من بريدك':'Verify your email', desc:lang==='ar'?'تحقق من بريدك الإلكتروني لتأكيد الحساب.':'Check your email to confirm your account.' },
    pending:    { cls:'si-amb', icon:IC.clock, title:t('auth.pend_t'), desc:t('auth.pend_d') },
  }
  const c = cfg[status] || cfg.pending
  app.innerHTML = `
    <div class="page-center">
      <div class="card" style="width:100%;max-width:360px;display:flex;flex-direction:column;align-items:center;gap:1rem;text-align:center">
        <div class="si ${c.cls}">${c.icon}</div>
        <h2 class="s-title">${esc(c.title)}</h2>
        <p class="s-desc">${esc(c.desc)}</p>
        <button class="btn btn-s btn-md btn-full" id="b-bk">${esc(t('c.back'))}</button>
      </div>
    </div>`
  q('#b-bk').onclick = async () => { await authSignOut(); renderLoginForm(app) }
}

function renderRejectedScreen(app, doctor) {
  const files = { front: null, back: null, uid_front: null, uid_back: null }

  function renderView() {
    const lang = getLang()
    app.innerHTML = `
      <div class="page-center">
        <div class="card" style="width:100%;max-width:420px;display:flex;flex-direction:column;align-items:center;gap:1rem;text-align:center">
          <div class="si si-red">${IC.xCircle}</div>
          <h2 class="s-title">${esc(t('auth.rej_t'))}</h2>
          ${doctor.rejection_reason ? `
            <div class="notice n-red" style="text-align:start;width:100%">
              <div>
                <p style="font-weight:600;font-size:.8125rem;margin-bottom:.25rem">${esc(t('auth.rej_r'))}</p>
                <p style="font-size:.8125rem">${esc(doctor.rejection_reason)}</p>
              </div>
            </div>` : ''}
          <p style="font-size:.875rem;color:var(--t3)">${lang==='ar'?'يمكنك تعديل بياناتك وإعادة التقديم':'You can update your info and reapply'}</p>
          <div style="display:flex;flex-direction:column;gap:.5rem;width:100%">
            <button class="btn btn-p btn-md btn-full" id="b-reapply">${esc(t('auth.reapply'))}</button>
            <button class="btn btn-s btn-md btn-full" id="b-bk">${lang==='ar'?'رجوع':'Back'}</button>
          </div>
        </div>
      </div>`
    q('#b-reapply').onclick = () => renderEditForm()
    q('#b-bk').onclick = async () => { await authSignOut(); renderLoginForm(app) }
  }

  function renderEditForm() {
    const lang = getLang()
    app.innerHTML = `
      <div class="page-center" style="align-items:flex-start;padding-top:1.5rem">
        <div class="card mw-form" style="margin:0 auto">
          <h2 style="font-size:.9375rem;font-weight:600;color:var(--t1);margin-bottom:1.25rem">${esc(t('auth.reapply'))}</h2>
          <form id="rf" novalidate style="display:flex;flex-direction:column;gap:.75rem">
            ${fld('r-name',  t('auth.name'),  'text', true)}
            ${fld('r-addr',  t('auth.addr'),  'text', true)}
            ${fld('r-phone', t('auth.phone'), 'tel',  true, '', 'ltr')}
            ${fld('r-uni',   t('auth.uni'),   'text', true)}
            ${fld('r-sem',   t('auth.sem'),   'text', true)}
            <p class="lbl" style="margin-top:.25rem">${lang==='ar'?'تحديث المستندات (اختياري)':'Update documents (optional)'}</p>
            <div class="g2">${fuHTML('r-front', t('auth.nidf'))}${fuHTML('r-back', t('auth.nidb'))}</div>
            <div class="g2" style="margin-top:.75rem">${fuHTML('r-uid_front', t('auth.uid_f'))}${fuHTML('r-uid_back', t('auth.uid_b'))}</div>
            <div style="display:flex;gap:.5rem;margin-top:.75rem">
              <button type="submit" class="btn btn-p btn-md" style="flex:1" id="b-sub">${esc(t('auth.reapply'))}</button>
              <button type="button" class="btn btn-s btn-md" id="b-back">${lang==='ar'?'إلغاء':'Cancel'}</button>
            </div>
          </form>
        </div>
      </div>`
    q('#r-name').value=doctor.full_name||''; q('#r-addr').value=doctor.address||''
    q('#r-phone').value=doctor.phone||''; q('#r-uni').value=doctor.university||''; q('#r-sem').value=doctor.semester||''
    fuBind('r-front', f=>files.front=f); fuBind('r-back', f=>files.back=f)
    fuBind('r-uid_front', f=>files.uid_front=f); fuBind('r-uid_back', f=>files.uid_back=f)
    q('#b-back').onclick = () => renderView()
    q('#rf').onsubmit = async e => {
      e.preventDefault(); clearErrs(app)
      const changes = sanObj({ full_name:q('#r-name').value.trim(), address:q('#r-addr').value.trim(), phone:q('#r-phone').value.trim(), university:q('#r-uni').value.trim(), semester:q('#r-sem').value.trim() })
      if (!changes.full_name){ showErr('r-name',t('c.req')); return }
      if (!changes.address)  { showErr('r-addr',t('c.req')); return }
      if (!changes.phone)    { showErr('r-phone',t('c.req')); return }
      if (!changes.university){ showErr('r-uni',t('c.req')); return }
      if (!changes.semester)  { showErr('r-sem',t('c.req')); return }
      const btn=q('#b-sub'); setLoad(btn,true)
      try {
        const [p1,p2,p3,p4] = await Promise.all([
          files.front     ? dbUploadFile(dbStoragePath('doc-nid',files.front.name),files.front) : null,
          files.back      ? dbUploadFile(dbStoragePath('doc-nid',files.back.name),files.back) : null,
          files.uid_front ? dbUploadFile(dbStoragePath('doc-uid',files.uid_front.name),files.uid_front) : null,
          files.uid_back  ? dbUploadFile(dbStoragePath('doc-uid',files.uid_back.name),files.uid_back) : null,
        ])
        const update = { ...changes, status:'pending', rejection_reason:null }
        if(p1) update.national_id_front_url=p1; if(p2) update.national_id_back_url=p2
        if(p3) update.university_id_front_url=p3; if(p4) update.university_id_back_url=p4
        await dbUpdateDoctorSelf(doctor.id,update)
        await dbLogDoctorApplication(doctor.id,'reapplied')
        await authSignOut()
        app.innerHTML=`<div class="page-center"><div class="card" style="width:100%;max-width:360px;display:flex;flex-direction:column;align-items:center;gap:1rem;text-align:center"><div class="si si-amb">${IC.clock}</div><h2 class="s-title">${esc(t('auth.pend_t'))}</h2><p class="s-desc">${esc(t('auth.pend_d'))}</p><a href="#/" class="btn btn-s btn-md btn-full">${lang==='ar'?'الرئيسية':'Home'}</a></div></div>`
      } catch(err) { toast(err.message||t('c.err'),'error'); setLoad(btn,false) }
    }
  }
  renderView()
}
