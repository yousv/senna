"use strict"

if (typeof registerRoute === 'function') {
  registerRoute('*', () => navigate('/'))
}

async function main() {
  try {
    if (typeof supabase === 'undefined')  throw new Error('Supabase failed to load')
    if (typeof DOMPurify === 'undefined') throw new Error('DOMPurify failed to load')

    initDB()
    setLang(getLang())
    applyTheme()
    await authInit()
    renderNavbar()
    renderBottomNav()

    window.addEventListener('hashchange', () => { renderBottomNav() })
    initRouter()
  } catch(e) {
    console.error('[main] Fatal error:', e)
    const isAr = (() => { try { return localStorage.getItem('senna-lang') === 'ar' } catch { return false } })()
    const msg  = String(e?.message || e || 'Unknown error')
    document.getElementById('app').innerHTML = `
      <div style="min-height:calc(100svh - 52px);display:flex;align-items:center;justify-content:center;padding:2rem">
        <div style="max-width:400px;text-align:center">
          <p style="font-size:.9375rem;font-weight:600;color:var(--red);margin-bottom:.625rem">
            ${isAr ? 'تعذّر تشغيل التطبيق' : 'Failed to start'}
          </p>
          <p style="color:var(--t3);margin-bottom:1.25rem;font-size:.8125rem;word-break:break-all">${esc ? esc(msg) : msg}</p>
          <p style="color:var(--t4);margin-bottom:1.25rem;font-size:.75rem;font-family:monospace">Check console (F12)</p>
          <button id="fatal-reload" class="btn btn-s btn-md">
            ${isAr ? 'إعادة المحاولة' : 'Reload'}
          </button>
        </div>
      </div>`
    document.getElementById('fatal-reload')?.addEventListener('click', () => location.reload())
  }
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', main)
else main()
