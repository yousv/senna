// scripts/build.js
// Runs at Vercel build time. Injects the PUBLISHABLE key only.
// The SECRET key never leaves this file — it's used only in api/*.js serverless functions.

const fs   = require('fs')
const path = require('path')

const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY || ''
const URL_KEY     = process.env.SUPABASE_URL             || ''

if (!PUBLISHABLE) {
  console.warn('[build] WARNING: SUPABASE_PUBLISHABLE_KEY is not set.')
}

// Write the env shim that the browser loads
const envContent = `(function(){
  window.__ENV__ = {
    SUPABASE_URL: ${JSON.stringify(URL_KEY)},
    SUPABASE_KEY: ${JSON.stringify(PUBLISHABLE)}
  };
})();
`

const out = path.join(__dirname, '..', 'public', 'env.js')
fs.writeFileSync(out, envContent, 'utf8')
console.log('[build] env.js written →', out)
