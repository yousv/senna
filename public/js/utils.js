'use strict'

const VALIDATORS = {
  EMAIL:        /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
  PHONE_EGYPT:  /^(\+20|0020|0)?1[0125]\d{8}$/,
  NATIONAL_ID:  /^\d{14}$/,
  PASSWORD_MIN: 8,
  NAME_MIN:     3,
  ADDRESS_MIN:  5,
}

function saveTab(k, v) { localStorage.setItem('senna-tab-' + k, v) }
function loadTab(k, fb = '') { return localStorage.getItem('senna-tab-' + k) || fb }

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(getLang() === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString(getLang() === 'ar' ? 'ar-EG' : 'en-GB', {
    hour: '2-digit', minute: '2-digit'
  })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  return fmtDate(iso) + ' · ' + fmtTime(iso)
}

function debounce(fn, ms = 250) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {
    const el = document.createElement('textarea')
    el.value = text; el.style.position = 'fixed'; el.style.opacity = '0'
    document.body.appendChild(el); el.select()
    document.execCommand('copy'); document.body.removeChild(el)
  })
}
