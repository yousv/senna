'use strict'

// ── File Upload ───────────────────────────────────────────────────────────────
function fuHTML(id, label, req = false) {
  const lang = getLang()
  return `<div class="fg">
    <label class="lbl">${esc(label)}${req ? '<span class="req">*</span>' : ''}</label>
    <div class="fu" id="fu-${id}" tabindex="0" role="button">
      <div class="fu-icon">${IC.upload}</div>
      <p class="fu-txt">${lang === 'ar' ? 'اضغط أو اسحب ملف' : 'Click or drag a file'}</p>
      <p class="fu-sub">JPG · PNG · WEBP · max 5MB</p>
    </div>
    <p class="ferr" id="fu-${id}-e" style="display:none"></p>
    <input type="file" id="fu-inp-${id}" accept="image/*" style="display:none">
  </div>`
}

function fuBind(id, onChange) {
  const zone = document.getElementById(`fu-${id}`)
  const inp  = document.getElementById(`fu-inp-${id}`)
  const err  = document.getElementById(`fu-${id}-e`)
  if (!zone || !inp) return

  const lang  = getLang()
  const TYPES = ['image/jpeg','image/jpg','image/png','image/webp']

  function resetZone() {
    zone.classList.remove('has-file')
    zone.innerHTML = `<div class="fu-icon">${IC.upload}</div>
      <p class="fu-txt">${lang === 'ar' ? 'اضغط أو اسحب ملف' : 'Click or drag a file'}</p>
      <p class="fu-sub">JPG · PNG · WEBP · max 5MB</p>`
  }

  function handle(file) {
    if (!file) return
    err.style.display = 'none'
    if (!TYPES.includes(file.type)) {
      err.textContent = lang === 'ar' ? 'JPG/PNG/WEBP فقط' : 'JPG/PNG/WEBP only'
      err.style.display = 'block'; onChange(null); return
    }
    if (file.size > 5 * 1024 * 1024) {
      err.textContent = lang === 'ar' ? 'الحجم الأقصى 5MB' : 'Max size is 5MB'
      err.style.display = 'block'; onChange(null); return
    }
    const r = new FileReader()
    r.onload = e => {
      zone.classList.add('has-file')
      zone.innerHTML = `<img class="fu-img" src="${e.target.result}" alt="">
        <button class="fu-clr" id="fu-clr-${id}">× ${lang === 'ar' ? 'إزالة' : 'Remove'}</button>`
      document.getElementById(`fu-clr-${id}`)?.addEventListener('click', ev => {
        ev.stopPropagation(); resetZone(); inp.value = ''; onChange(null); fuBind(id, onChange)
      })
    }
    r.readAsDataURL(file)
    onChange(file)
  }

  zone.addEventListener('click',    () => inp.click())
  zone.addEventListener('keydown',  e => { if (e.key === 'Enter' || e.key === ' ') inp.click() })
  zone.addEventListener('dragover', e => e.preventDefault())
  zone.addEventListener('drop',     e => { e.preventDefault(); handle(e.dataTransfer.files[0]) })
  inp.addEventListener('change',    () => handle(inp.files[0]))
}

// ── Multi Select ──────────────────────────────────────────────────────────────
function msHTML(id, label, placeholder, req = false) {
  return `<div class="fg">
    <label class="lbl">${esc(label)}${req ? '<span class="req">*</span>' : ''}</label>
    <div class="ms" id="ms-${id}">
      <button type="button" class="ms-trig" id="ms-t-${id}">
        <span class="ph" id="ms-l-${id}">${esc(placeholder)}</span>
        <span class="ms-chev">${IC.chevDown}</span>
      </button>
      <div class="ms-drop" id="ms-d-${id}"></div>
    </div>
    <div class="ms-tags" id="ms-tags-${id}"></div>
    <p class="ferr" id="ms-${id}-e" style="display:none"></p>
  </div>`
}

function msBind(id, options, onChange) {
  let selected = []
  const wrap = document.getElementById(`ms-${id}`)
  const trig = document.getElementById(`ms-t-${id}`)
  const drop = document.getElementById(`ms-d-${id}`)
  const lbl  = document.getElementById(`ms-l-${id}`)
  const tags = document.getElementById(`ms-tags-${id}`)
  if (!wrap) return

  const placeholder = lbl.textContent
  const lang = getLang()
  function label(o) { return lang === 'ar' ? o.ar : o.en }

  function draw() {
    drop.innerHTML = options.map(o => `
      <label class="ms-opt">
        <input type="checkbox" value="${esc(o.v)}"${selected.includes(o.v) ? ' checked' : ''}>
        <span>${esc(label(o))}</span>
      </label>`).join('')
    qs('input[type=checkbox]', drop).forEach(cb =>
      cb.addEventListener('change', () => {
        selected = cb.checked ? [...selected, cb.value] : selected.filter(v => v !== cb.value)
        updateLabel(); drawTags(); onChange(selected)
      })
    )
    drawTags()
  }

  function updateLabel() {
    lbl.className = selected.length ? '' : 'ph'
    lbl.textContent = selected.length
      ? `${selected.length} ${lang === 'ar' ? 'مختار' : 'selected'}`
      : placeholder
  }

  function drawTags() {
    tags.innerHTML = selected.map(v => {
      const o = options.find(x => x.v === v)
      return `<span class="badge b-neu" data-v="${esc(v)}" style="cursor:pointer">${esc(o ? label(o) : v)} ×</span>`
    }).join('')
    qs('[data-v]', tags).forEach(el =>
      el.addEventListener('click', () => {
        selected = selected.filter(v => v !== el.dataset.v)
        draw(); onChange(selected)
      })
    )
  }

  trig.addEventListener('click', () => {
    wrap.classList.toggle('open')
    if (wrap.classList.contains('open')) draw()
  })
  document.addEventListener('click', e => { if (!wrap.contains(e.target)) wrap.classList.remove('open') })
  draw()

  return {
    get: () => selected,
    setErr: msg => {
      const e = document.getElementById(`ms-${id}-e`)
      if (e) { e.textContent = msg || ''; e.style.display = msg ? 'block' : 'none' }
      trig.classList.toggle('err', !!msg)
    },
  }
}

// ── Status badge helper ───────────────────────────────────────────────────────
function statusBadge(status, lang) {
  const map = {
    pending:    { cls:'b-amb', ar:'قيد المراجعة', en:'Pending' },
    approved:   { cls:'b-grn', ar:'موافق عليه',    en:'Approved' },
    rejected:   { cls:'b-red', ar:'مرفوض',         en:'Rejected' },
    incomplete: { cls:'b-neu', ar:'جديد',           en:'New' },
    ongoing:    { cls:'b-blu', ar:'جارية',          en:'Ongoing' },
    done:       { cls:'b-grn', ar:'مكتملة',         en:'Done' },
  }
  const m = map[status] || { cls:'b-neu', ar: status, en: status }
  return `<span class="badge ${m.cls}">${lang === 'ar' ? m.ar : m.en}</span>`
}

// ── reqBadge (used by doctor-dash) ────────────────────────────────────────────
function reqBadge(status) {
  const lang = getLang()
  const map = {
    incomplete: { cls:'badge b-neu s-new', ar:'جديد',     en:'New' },
    ongoing:    { cls:'badge b-pen s-ong', ar:'جارية',    en:'Ongoing' },
    done:       { cls:'badge b-app s-don', ar:'مكتملة',   en:'Done' },
  }
  const m = map[status] || { cls:'badge b-neu', ar:status, en:status }
  return `<span class="${m.cls}">${lang==='ar'?m.ar:m.en}</span>`
}
