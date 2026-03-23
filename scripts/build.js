// scripts/build.js
// Runs at Vercel build time via `npm run build`.
// Writes public/env.js with the PUBLISHABLE key only.
// The SECRET key stays in api/*.js serverless functions only.

const fs   = require('fs')
const path = require('path')

const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY || ''
const URL_KEY     = process.env.SUPABASE_URL             || ''

if (!PUBLISHABLE || !URL_KEY) {
  console.error('[build] ERROR: SUPABASE_PUBLISHABLE_KEY and SUPABASE_URL must be set as environment variables.')
  console.error('[build] Go to Vercel → Project → Settings → Environment Variables and add them.')
  process.exit(1)
}

const envContent = `(function(){window.__ENV__={SUPABASE_URL:${JSON.stringify(URL_KEY)},SUPABASE_KEY:${JSON.stringify(PUBLISHABLE)}};})();\n`

const outDir = path.join(__dirname, '..', 'public')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

const out = path.join(outDir, 'env.js')
fs.writeFileSync(out, envContent, 'utf8')
console.log('[build] env.js written successfully.')
