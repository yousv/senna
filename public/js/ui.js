'use strict'

// ── DOM helpers ───────────────────────────────────────────────────────────────
const esc = s => s == null ? '' : String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
const san    = v => typeof v === 'string' ? DOMPurify.sanitize(v.trim(), {ALLOWED_TAGS:[],ALLOWED_ATTR:[]}) : v
const sanObj = o => Object.fromEntries(Object.entries(o).map(([k,v]) => [k, san(v)]))
const q      = (s, c = document) => c.querySelector(s)
const qs     = (s, c = document) => [...c.querySelectorAll(s)]

// ── Button loading state ──────────────────────────────────────────────────────
function setLoad(btn, on) {
  if (!btn) return
  btn.disabled = on
  if (on) {
    const s = document.createElement('span')
    s.className = 'spin-btn'; s.id = '_sp'
    btn.prepend(s)
  } else {
    btn.querySelector('#_sp')?.remove()
  }
}

// ── Field error helpers ───────────────────────────────────────────────────────
function showErr(id, msg) {
  const el = document.getElementById(id)
  const er = document.getElementById(id + '-e')
  el?.classList.toggle('err', !!msg)
  if (er) { er.textContent = msg || ''; er.style.display = msg ? 'block' : 'none' }
}

function clearErrs(container) {
  qs('.ferr', container).forEach(e => { e.textContent = ''; e.style.display = 'none' })
  qs('.err',  container).forEach(e => e.classList.remove('err'))
}

// ── Form field factories ──────────────────────────────────────────────────────
function fld(id, label, type = 'text', req = false, ph = '', dir = '') {
  return `<div class="fg">
    <label class="lbl" for="${id}">${esc(label)}${req ? '<span class="req">*</span>' : ''}</label>
    <input class="inp" id="${id}" type="${type}"${ph ? ` placeholder="${esc(ph)}"` : ''} ${dir ? `dir="${dir}"` : ''} autocomplete="off">
    <p class="ferr" id="${id}-e" style="display:none"></p>
  </div>`
}

function pwdFieldHTML(id, label, req = false) {
  return `<div class="fg">
    <label class="lbl" for="${id}">${esc(label)}${req ? '<span class="req">*</span>' : ''}</label>
    <div class="pwd-wrap">
      <input class="inp" id="${id}" type="password" dir="ltr" autocomplete="off">
      <button type="button" class="btn-pwd-eye" id="${id}-eye" tabindex="-1">${IC.eye}</button>
    </div>
    <p class="ferr" id="${id}-e" style="display:none"></p>
  </div>`
}

function bindPwdToggle(id) {
  const inp = document.getElementById(id)
  const btn = document.getElementById(id + '-eye')
  if (!inp || !btn) return
  btn.addEventListener('click', () => {
    const showing = inp.type === 'text'
    inp.type = showing ? 'password' : 'text'
    btn.innerHTML = showing ? IC.eye : IC.eyeOff
  })
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info', ms = 4000) {
  const root = document.getElementById('toasts')
  if (!root) return
  const el = document.createElement('div')
  el.className = `toast t-${type === 'success' ? 'ok' : type === 'error' ? 'err' : 'inf'}`
  const iconMap = { success: IC.check, error: IC.xCircle, info: IC.info }
  el.innerHTML = `
    <span class="toast-icon">${iconMap[type] || IC.info}</span>
    <span class="toast-msg"></span>
    <button class="toast-x">×</button>`
  el.querySelector('.toast-msg').textContent = msg
  el.querySelector('.toast-x').onclick = () => el.remove()
  root.appendChild(el)
  setTimeout(() => el.remove(), ms)
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function showModal({ title, size = 'md', content, footer }) {
  const root = document.getElementById('modals')
  root.innerHTML = `<div class="mbk" id="mbk">
    <div class="modal modal-${size}" role="dialog" aria-modal="true">
      <div class="mhd">
        <h2 class="mtitle"></h2>
        <button class="btn btn-g btn-icon btn-sm" id="m-x" aria-label="Close">${IC.close}</button>
      </div>
      <div class="mbody" id="mbody"></div>
      ${footer ? '<div class="mfoot" id="mfoot"></div>' : ''}
    </div>
  </div>`
  q('.mtitle').textContent = title
  const body = q('#mbody')
  typeof content === 'string' ? (body.innerHTML = content) : body.appendChild(content)
  if (footer) {
    const ft = q('#mfoot')
    typeof footer === 'string' ? (ft.innerHTML = footer) : ft.appendChild(footer)
  }
  q('#m-x').onclick = closeModal
  q('#mbk').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal() })
  document.body.style.overflow = 'hidden'
  setTimeout(() => q('#m-x')?.focus(), 50)
}

function closeModal() {
  document.getElementById('modals').innerHTML = ''
  document.body.style.overflow = ''
}

function confirmDialog(message, onConfirm, onCancel) {
  const lang = getLang()
  const root = document.getElementById('modals')
  root.innerHTML = `<div class="mbk" id="conf-bk">
    <div class="modal modal-sm" role="alertdialog" aria-modal="true">
      <div class="mbody" style="padding:1.5rem">
        <p style="font-size:.9375rem;font-weight:600;color:var(--t1);margin-bottom:.5rem">
          ${lang === 'ar' ? 'تأكيد' : 'Confirm'}
        </p>
        <p style="font-size:.875rem;color:var(--t2);line-height:1.5"></p>
      </div>
      <div class="mfoot">
        <button class="btn btn-s btn-sm" id="conf-no">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
        <button class="btn btn-p btn-sm" id="conf-yes">${lang === 'ar' ? 'تأكيد' : 'Confirm'}</button>
      </div>
    </div>
  </div>`
  q('.mbody p:last-child').textContent = message
  q('#conf-no').onclick  = () => { root.innerHTML = ''; onCancel?.() }
  q('#conf-yes').onclick = () => { root.innerHTML = ''; onConfirm?.() }
  q('#conf-bk').addEventListener('click', e => { if (e.target === e.currentTarget) { root.innerHTML = ''; onCancel?.() } })
  document.body.style.overflow = 'hidden'
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function renderNavbar() {
  const nb   = document.getElementById('nb')
  const lang = getLang()
  const s    = AppState

  if (!s.session) {
    nb.innerHTML = `<div class="nb-inner">
      <div class="nb-brand" onclick="navigate('/')">
        <div class="nb-logo">${IC.tooth.replace('width="20"','width="14"').replace('height="20"','height="14"')}</div>
        <span>${esc(t('app.name'))}</span>
      </div>
      <div class="nb-actions">
        <button class="nb-icon" onclick="toggleTheme()" title="Toggle theme" aria-label="Toggle theme">
          ${getTheme() === 'dark' ? IC.sun : IC.moon}
        </button>
        <button class="nb-btn" onclick="toggleLang()">
          ${IC.globe}<span>${esc(t('nav.language'))}</span>
        </button>
      </div>
    </div>`
    return
  }

  const isDoc   = !!s.doctor && !s.isAdmin
  const isAdmin = s.isAdmin
  const hash    = window.location.hash

  nb.innerHTML = `<div class="nb-inner">
    <div class="nb-brand" onclick="navigate(isDoc ? '/doctor/dash' : isAdmin ? '/admin' : '/')">
      <div class="nb-logo">${IC.tooth.replace('width="20"','width="14"').replace('height="20"','height="14"')}</div>
      <span>${esc(t('app.name'))}</span>
    </div>
    <div class="nb-actions">
      ${isDoc ? `
        <button class="nb-btn${hash.includes('dash') ? ' active' : ''}" onclick="navigate('/doctor/dash')" title="${esc(t('nav.dash'))}">
          ${IC.dashboard}<span>${esc(t('nav.dash'))}</span>
        </button>
        <button class="nb-btn${hash.includes('profile') ? ' active' : ''}" onclick="navigate('/doctor/profile')" title="${esc(t('nav.profile'))}">
          ${IC.user}<span>${esc(t('nav.profile'))}</span>
        </button>
      ` : ''}
      ${isAdmin ? `
        <button class="nb-btn${hash === '#/admin' ? ' active' : ''}" onclick="navigate('/admin')">
          ${IC.chartBar}<span>${esc(t('adm.reqs'))}</span>
        </button>
        <button class="nb-btn${hash.includes('doctors') ? ' active' : ''}" onclick="navigate('/admin/doctors')">
          ${IC.users}<span>${esc(t('adm.docs'))}</span>
        </button>
      ` : ''}
      <button class="nb-icon" onclick="toggleTheme()" title="Toggle theme" aria-label="Toggle theme">
        ${getTheme() === 'dark' ? IC.sun : IC.moon}
      </button>
      <button class="nb-icon" onclick="toggleLang()" title="Language" aria-label="Language">
        ${IC.globe}
      </button>
      <button class="nb-btn btn-ghost-sm" onclick="handleSignOut()" title="${esc(t('nav.logout'))}">
        ${IC.logout}<span>${esc(t('nav.logout'))}</span>
      </button>
    </div>
  </div>`
}

function renderBottomNav(badges) {
  const bnav = document.getElementById('bnav')
  if (!AppState.session) {
    bnav.innerHTML = ''
    document.body.classList.remove('has-bnav')
    return
  }

  const hash  = window.location.hash
  const lang  = getLang()
  const b     = badges || {}

  if (AppState.isAdmin) {
    document.body.classList.add('has-bnav')
    bnav.innerHTML = `
      <button class="bn-item${hash === '#/admin' ? ' active' : ''}" onclick="navigate('/admin')">
        ${IC.clipboard}
        <span>${esc(t('adm.reqs'))}</span>
        ${(b.pendingClaims||0) > 0 ? `<span class="bn-badge">${b.pendingClaims}</span>` : ''}
      </button>
      <button class="bn-item${hash.includes('doctors') ? ' active' : ''}" onclick="navigate('/admin/doctors')">
        ${IC.users}
        <span>${esc(t('adm.docs'))}</span>
        ${((b.pendingDocs||0)+(b.pendingEdits||0)) > 0 ? `<span class="bn-badge">${(b.pendingDocs||0)+(b.pendingEdits||0)}</span>` : ''}
      </button>`
    return
  }

  if (AppState.doctor) {
    document.body.classList.add('has-bnav')
    bnav.innerHTML = `
      <button class="bn-item${hash.includes('dash') ? ' active' : ''}" onclick="navigate('/doctor/dash')">
        ${IC.dashboard}
        <span>${esc(t('nav.dash'))}</span>
      </button>
      <button class="bn-item${hash.includes('profile') ? ' active' : ''}" onclick="navigate('/doctor/profile')">
        ${IC.user}
        <span>${esc(t('nav.profile'))}</span>
      </button>`
    return
  }

  bnav.innerHTML = ''
  document.body.classList.remove('has-bnav')
}

function toggleLang() {
  setLang(getLang() === 'ar' ? 'en' : 'ar')
  renderNavbar()
  renderBottomNav()
  dispatch()
}

async function handleSignOut() {
  await authSignOut()
  renderNavbar()
  renderBottomNav()
  navigate('/')
}
