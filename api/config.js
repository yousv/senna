// api/config.js
// Serves the Supabase PUBLISHABLE key to the browser at runtime.
// Called by the browser before the app initialises.
// The SECRET key is never returned here — it stays server-side only.

module.exports = (req, res) => {
  const url = process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || ''

  if (!url || !key) {
    res.status(500).json({ error: 'Server misconfiguration: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY env vars must be set in Vercel.' })
    return
  }

  // Cache for 5 minutes — keys don't change often
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
  res.send(`window.__ENV__={SUPABASE_URL:${JSON.stringify(url)},SUPABASE_KEY:${JSON.stringify(key)}};`)
}
