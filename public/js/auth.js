'use strict'

let _sessionChannel  = null
let _presenceChannel = null
let _heartbeatTimer  = null

async function authInit() {
  let session = null
  try { session = await dbGetSession() } catch(e) { console.warn('[auth:init]', e.message) }

  if (session) {
    AppState.session = session
    await _loadProfile(session.user.id)
    if (!AppState.isAdmin && AppState.doctor && AppState.doctor.status !== 'approved') {
      await dbSignOut(); _clearState(); return
    }
    if (!AppState.isAdmin && AppState.doctor?.status === 'approved') _startPresence()
  }

  dbOnAuthChange(async (event, session) => {
    if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
      _cleanup(); _clearState()
      renderNavbar(); renderBottomNav(); navigate('/')
    } else if (event === 'TOKEN_REFRESHED' && session) {
      AppState.session = session
    }
  })
}

function _clearState() {
  AppState.session      = null
  AppState.doctor       = null
  AppState.isAdmin      = false
  AppState.isSuperAdmin = false
  AppState.adminRole    = null
  AppState.adminPerms   = null
  AppState.sessionId    = null
}

async function _loadProfile(userId) {
  const { doctor, isAdmin, adminRec } = await dbGetProfile(userId)
  AppState.doctor       = doctor
  AppState.isAdmin      = isAdmin
  AppState.adminRole    = adminRec?.role    || null
  AppState.isSuperAdmin = adminRec?.role === 'super'
  AppState.adminPerms   = adminRec?.permissions || null
}

async function authSetSession(session) {
  AppState.session   = session
  AppState.sessionId = crypto.randomUUID()
  await _loadProfile(session.user.id)
  if (AppState.doctor?.status === 'approved' && !AppState.isAdmin) {
    _startPresence()
    _sessionChannel = dbJoinSessionChannel(AppState.doctor.id, AppState.sessionId, _onSessionConflict)
  }
}

function _startPresence() {
  if (!AppState.doctor || AppState.isAdmin) return
  const tick = () => { if (AppState.doctor) dbUpdateDoctorLastSeen(AppState.doctor.id) }
  tick()
  _heartbeatTimer  = setInterval(tick, 30_000)
  _presenceChannel = dbJoinPresenceChannel(AppState.doctor.id, {
    doctor_id:  AppState.doctor.id,
    full_name:  AppState.doctor.full_name,
    session_id: AppState.sessionId,
    joined_at:  new Date().toISOString(),
  })
}

function _onSessionConflict() {
  _cleanup(); _clearState()
  const lang = getLang()
  document.getElementById('app').innerHTML = ''
  document.getElementById('modals').innerHTML = `
    <div class="mbk" style="z-index:200">
      <div class="modal modal-sm" style="text-align:center;padding:2rem">
        <div class="si si-amb" style="margin:0 auto 1rem">
          ${IC.warning.replace('width="16"','width="24"').replace('height="16"','height="24"')}
        </div>
        <h2 class="s-title" style="margin-bottom:.5rem">
          ${lang==='ar'?'تم تسجيل الدخول من جهاز آخر':'Signed in elsewhere'}
        </h2>
        <p class="s-desc" style="margin-bottom:1.25rem">
          ${lang==='ar'?'تم تسجيل دخولك من جهاز آخر. تم تسجيل خروجك تلقائياً.':'Your account was signed in on another device.'}
        </p>
        <button class="btn btn-p btn-md btn-full"
          onclick="document.getElementById('modals').innerHTML='';renderNavbar();renderBottomNav();navigate('/doctor/login')">
          ${lang==='ar'?'تسجيل الدخول مجدداً':'Sign In Again'}
        </button>
      </div>
    </div>`
  renderNavbar(); dbSignOut()
}

function _cleanup() {
  if (_sessionChannel)  { dbRemoveChannel(_sessionChannel);  _sessionChannel  = null }
  if (_presenceChannel) { dbRemoveChannel(_presenceChannel); _presenceChannel = null }
  if (_heartbeatTimer)  { clearInterval(_heartbeatTimer);    _heartbeatTimer  = null }
}

async function authSignOut() {
  _cleanup(); await dbSignOut(); _clearState()
}
