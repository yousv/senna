'use strict'

registerRoute('/', app => {
  if (AppState.session) {
    if (AppState.isAdmin) { navigate('/admin');       return }
    if (AppState.doctor)  { navigate('/doctor/dash'); return }
  }

  const lang = getLang()

  app.innerHTML = `
    <div class="page-center">
      <div style="display:flex;flex-direction:column;align-items:center;width:100%;max-width:460px;gap:2rem">

        <div style="text-align:center">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:10px;background:var(--t1);color:var(--bg);margin-bottom:1rem">
            ${IC.tooth.replace('width="20"','width="18"').replace('height="20"','height="18"')}
          </div>
          <h1 style="font-size:1.75rem;font-weight:700;color:var(--t1);letter-spacing:-.04em;line-height:1.15">
            ${esc(t('app.name'))}
          </h1>
          <p style="font-size:.9375rem;color:var(--t3);margin-top:.375rem">
            ${lang === 'ar' ? 'منصة طب الأسنان' : 'Dental Care Platform'}
          </p>
        </div>

        <div class="rc-grid" style="max-width:100%">
          <div class="role-card">
            <div class="ri ri-tl">
              ${IC.doctor.replace('width="20"','width="18"').replace('height="20"','height="18"')}
            </div>
            <div>
              <p class="rct">${esc(t('land.doc_t'))}</p>
              <p class="rcd">${esc(t('land.doc_d'))}</p>
            </div>
            <div class="rca">
              <button class="btn btn-p btn-sm btn-full" id="b-dl">${esc(t('land.login'))}</button>
              <button class="btn btn-s btn-sm btn-full" id="b-ds">${esc(t('land.signup'))}</button>
            </div>
          </div>

          <div class="role-card">
            <div class="ri ri-bl">
              ${IC.user.replace('width="20"','width="18"').replace('height="20"','height="18"')}
            </div>
            <div>
              <p class="rct">${esc(t('land.pat_t'))}</p>
              <p class="rcd">${esc(t('land.pat_d'))}</p>
            </div>
            <div class="rca">
              <button class="btn btn-s btn-sm btn-full" id="b-pf">${esc(t('land.add'))}</button>
            </div>
          </div>
        </div>

      </div>
    </div>`

  q('#b-dl').onclick = () => navigate('/doctor/login')
  q('#b-ds').onclick = () => navigate('/doctor/signup')
  q('#b-pf').onclick = () => navigate('/patient/new')
})
