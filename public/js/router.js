'use strict'

const _routes = {}

function registerRoute(path, fn) { _routes[path] = fn }

function navigate(path) {
  const target = `#${path}`
  if (window.location.hash === target) { dispatch(); return }
  window.location.hash = path
}

function dispatch() {
  const hash    = decodeURIComponent(window.location.hash.slice(1)) || '/'
  const handler = _routes[hash] || _routes['*']
  const app     = document.getElementById('app')
  app.innerHTML = ''
  if (handler) handler(app)
  else navigate('/')
}

function initRouter() {
  window.addEventListener('hashchange', dispatch)
  dispatch()
}
