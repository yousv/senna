# SENNA PROJECT — COMPREHENSIVE ARCHITECTURE GUIDE
**Version 2.0** | Full-stack Healthcare Application with Doctor & Patient Management

---

## TABLE OF CONTENTS
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Directory Structure](#directory-structure)
4. [Feature Documentation](#feature-documentation)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Authentication System](#authentication-system)
8. [Styling System (Vercel-like)](#styling-system)
9. [Component Library](#component-library)
10. [State Management](#state-management)

---

## PROJECT OVERVIEW

**SENNA** is a healthcare platform built on vanilla JavaScript with Supabase backend. It supports:
- **Doctor Profiles**: Registration, verification, approval workflow
- **Patient Functionality**: Claims management, doctor search, appointment booking
- **Admin Dashboard**: Doctor approval, claim resolution, user management
- **Real-time Updates**: WebSocket presence channels, session management
- **Multi-language Support**: Arabic & English (RTL support included)
- **Responsive Design**: Mobile-first, bottom navigation UI

### Key Features by Role:
| Feature | Admin | Doctor | Patient |
|---------|-------|--------|---------|
| Doctor Approval/Rejection | ✓ | ✗ | ✗ |
| Claim Resolution | ✓ | ✗ | ✓ |
| Profile Management | ✓ | ✓ | ✓ |
| Doctor Search | ✗ | ✗ | ✓ |
| Presence Tracking | ✗ | ✓ | ✗ |
| Dashboard Analytics | ✓ | ✓ | ✓ |

---

## TECHNOLOGY STACK

```
Frontend:
  - HTML5 / Vanilla JavaScript (ES6+)
  - CSS3 with CSS Variables (custom design system)
  - Supabase JS Client v2.45.0
  - DOMPurify (XSS protection)
  - Hash-based routing (#/)

Backend:
  - Node.js / Vercel Serverless Functions
  - Supabase (PostgreSQL + Auth + Realtime)
  - JWT-based authentication

DevOps:
  - Vercel deployment
  - Environment variables for secrets
  - git-based version control
```

---

## DIRECTORY STRUCTURE

```
/vercel/share/v0-project/
├── api/                          # Serverless API endpoints
│   ├── config.js                # Runtime config delivery (Supabase keys)
│   ├── approve-doctor.js         # Admin: Approve doctor application
│   ├── reject-doctor.js          # Admin: Reject doctor with reason
│   ├── approve-edit.js           # Admin: Approve profile edit
│   ├── reject-edit.js            # Admin: Reject profile edit
│   └── resolve-claim.js          # Admin: Approve/decline claims
│
├── lib/                          # Server-side utilities
│   ├── auth.js                   # JWT verification, requireAuth, requireAdmin
│   ├── supabase.js               # Supabase admin client initialization
│   └── utils.ts                  # Common utilities
│
├── public/                       # Static assets + client-side code
│   ├── style.css                 # Global stylesheet (currently unused, see main CSS)
│   ├── js/
│   │   ├── config.js             # Load Supabase config from /api/config
│   │   ├── db.js                 # Database queries & Supabase client wrapper
│   │   ├── auth.js               # Auth state management, session handling
│   │   ├── router.js             # Hash-based router (#/)
│   │   ├── main.js               # App initialization, error handling
│   │   ├── ui.js                 # UI helper functions (modals, toasts, etc.)
│   │   ├── i18n.js               # Internationalization (AR/EN)
│   │   ├── utils.js              # Client-side utilities
│   │   ├── icons.js              # Icon definitions (SVG inline)
│   │   ├── components.js         # Reusable UI components
│   │   ├── pages/
│   │   │   ├── landing.js        # Landing page (public)
│   │   │   ├── login.js          # Login page
│   │   │   ├── signup.js         # Signup page
│   │   │   ├── doctor-dash.js    # Doctor dashboard
│   │   │   ├── doctor-profile.js # Doctor profile editor
│   │   │   ├── patient.js        # Patient dashboard (claims)
│   │   │   ├── admin-dash.js     # Admin dashboard (overview)
│   │   │   ├── admin-doctors.js  # Admin: Doctor management
│   │   │   └── admin-requests.js # Admin: Claims/Edits management
│   │   └── main.js               # App bootstrap
│   └── style.css                 # Compiled/generated styles
│
├── components/                   # React/Next.js UI components (if using)
│   └── ui/                       # shadcn/ui library (installed but not primary)
│
├── app/                          # Next.js app directory (if used)
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global Next.js styles
│
├── styles/                       # Styling (if Next.js)
│   └── globals.css
│
├── package.json                  # Dependencies
├── tailwind.config.ts            # Tailwind config (if used)
├── tsconfig.json                 # TypeScript config
├── components.json               # shadcn/ui config
├── vercel.json                   # Vercel deployment config
└── PROJECT_ARCHITECTURE.md       # This file
```

---

## FEATURE DOCUMENTATION

### 1. AUTHENTICATION SYSTEM
**Files**: `public/js/auth.js`, `public/js/db.js`, `lib/auth.js`

**Flow**:
1. User signs up/in via Supabase Auth (`dbSignUp`, `dbSignIn`)
2. Session stored in `AppState.session`
3. On auth state change, profile loaded (`_loadProfile`)
4. Doctor/Admin role determined from database
5. Approved doctors join real-time presence channel
6. Unauthorized access redirects to login

**Key Functions**:
```javascript
// Client-side (db.js)
dbGetSession()           // Get current session
dbSignIn(email, pwd)     // Email/password login
dbSignUp(email, pwd, meta) // Create account
dbSignOut()              // Logout
dbOnAuthChange(cb)       // Listen for auth events

// Server-side (lib/auth.js)
requireAuth(req)         // Verify JWT token from header
requireAdmin(req)        // Verify admin role
```

---

### 2. DOCTOR MANAGEMENT
**Files**: `api/approve-doctor.js`, `api/reject-doctor.js`, `public/js/pages/doctor-profile.js`

**Database Tables**:
- `doctors` — Profile data (full_name, email, phone, university, etc.)
- `doctor_applications` — Application history log

**States**:
- `pending` → Awaiting admin approval
- `approved` → Active doctor
- `rejected` → Application denied (can re-apply)

**API Endpoints**:
```javascript
POST /api/approve-doctor
  body: { doctorId }
  auth: Admin required

POST /api/reject-doctor
  body: { doctorId, reason }
  auth: Admin required
```

---

### 3. PATIENT CLAIMS SYSTEM
**Files**: `api/resolve-claim.js`, `public/js/pages/patient.js`

**Database Table**: `doctor_claims`

**Claim Lifecycle**:
1. Patient submits claim → status = `pending`
2. Admin reviews → Approve or Decline
3. Claim status updated → Patient notified

**API Endpoint**:
```javascript
POST /api/resolve-claim
  body: { claimId, status: 'approved'|'declined', reason? }
  auth: Admin required
```

---

### 4. REAL-TIME PRESENCE & SESSIONS
**Files**: `public/js/auth.js`, `public/js/db.js`

**Functionality**:
- Doctors update `last_seen` every 30 seconds
- Real-time presence channel tracks online doctors
- Session conflict detection (multi-login prevention)
- Presence data includes: `doctor_id`, `full_name`, `session_id`, `joined_at`

---

### 5. ROUTING SYSTEM
**Files**: `public/js/router.js`, `public/js/main.js`

**Hash-based Routes**:
```
/                  → Landing page
/login             → Login form
/signup            → Signup form
/doctor/dashboard  → Doctor main view
/doctor/profile    → Doctor profile editor
/patient           → Patient claims view
/admin/dashboard   → Admin overview
/admin/doctors     → Doctor management
/admin/requests    → Claims/Edits review
/settings          → User settings
```

**Navigation**: `navigate('/path')` or `<a href="#/path">`

---

### 6. MULTI-LANGUAGE SUPPORT
**Files**: `public/js/i18n.js`

**Supported Languages**: English (en), Arabic (ar)

**Functions**:
```javascript
setLang(lang)    // Set active language (stored in localStorage)
getLang()        // Get current language
t(key)           // Get translation for key
applyTheme()     // Apply RTL/LTR based on language
```

**RTL**: Automatically applied when Arabic selected (`html[dir="rtl"]`)

---

### 7. USER INTERFACE SYSTEM
**Files**: `public/js/ui.js`, `public/style.css`, `public/js/components.js`

**Key UI Functions**:
```javascript
// Modals
showModal(content, options)
closeModal()

// Toasts
showToast(msg, type)  // type: 'success'|'error'|'info'|'warn'

// Dialogs
showConfirm(title, msg, onOk, onCancel)

// Loading states
setLoading(id, bool)
```

---

## API ENDPOINTS

### Authentication
```javascript
POST /api/auth/signup
  body: { email, password, metadata }
  response: { user }

POST /api/auth/login
  body: { email, password }
  response: { session }

POST /api/auth/logout
  auth: Required
  response: { ok }
```

### Doctor Management (Admin Only)
```javascript
POST /api/approve-doctor
  body: { doctorId }
  auth: Admin required
  response: { ok: true }

POST /api/reject-doctor
  body: { doctorId, reason }
  auth: Admin required
  response: { ok: true }

POST /api/approve-edit
  body: { doctorId, editId }
  auth: Admin required
  response: { ok: true }

POST /api/reject-edit
  body: { doctorId, editId, reason }
  auth: Admin required
  response: { ok: true }
```

### Claims Management (Admin Only)
```javascript
POST /api/resolve-claim
  body: { claimId, status: 'approved'|'declined', reason? }
  auth: Admin required
  response: { ok: true }
```

### Configuration
```javascript
GET /api/config
  response: javascript that sets window.__ENV__
  cache: 5 minutes
```

---

## DATABASE SCHEMA

### Core Tables

**users** (Supabase Auth)
- `id` (UUID) — Primary key
- `email` (string) — Unique email
- `created_at` (timestamp)
- `last_sign_in_at` (timestamp)

**doctors**
- `id` (UUID)
- `user_id` (UUID) — Foreign key to auth.users
- `full_name` (string)
- `email` (string)
- `phone` (string)
- `address` (string)
- `university` (string)
- `semester` (integer)
- `national_id_num` (string)
- `national_id_front_url` (string) — Document URL
- `national_id_back_url` (string) — Document URL
- `university_id_front_url` (string)
- `university_id_back_url` (string)
- `status` (enum) — pending | approved | rejected
- `rejection_reason` (string)
- `last_seen` (timestamp) — Presence tracking
- `created_at` (timestamp)
- `updated_at` (timestamp)

**doctor_applications**
- `id` (UUID)
- `doctor_id` (UUID)
- `action` (string) — approved | rejected | resubmitted
- `created_at` (timestamp)

**admin_users**
- `id` (UUID)
- `user_id` (UUID) — Foreign key to auth.users
- `role` (enum) — super | moderator | viewer
- `permissions` (jsonb) — Feature flags
- `display_name` (string)
- `email` (string)
- `created_at` (timestamp)

**doctor_claims**
- `id` (UUID)
- `doctor_id` (UUID)
- `patient_id` (UUID)
- `claim_type` (string) — e.g., "medical", "insurance"
- `description` (text)
- `status` (enum) — pending | approved | declined
- `decline_reason` (string)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**doctor_edits** (Profile change requests)
- `id` (UUID)
- `doctor_id` (UUID)
- `changes` (jsonb) — Fields being edited
- `status` (enum) — pending | approved | rejected
- `created_at` (timestamp)

---

## AUTHENTICATION SYSTEM

### JWT Flow
1. User logs in → Supabase returns access token
2. Token stored in `localStorage` under key `senna-auth`
3. API calls include: `Authorization: Bearer ${token}`
4. Server verifies with `requireAuth()` middleware
5. Admin status checked with `requireAdmin()` middleware

### Session Management
```javascript
// Each doctor gets a unique sessionId on login
AppState.sessionId = crypto.randomUUID()

// Multi-login detection via Realtime channels
dbJoinSessionChannel(doctorId, sessionId, onConflict)

// If conflict detected, auto-logout and show modal
```

### Protected Routes
- `/admin/*` — Requires `AppState.isAdmin === true`
- `/doctor/*` — Requires `AppState.doctor?.status === 'approved'`
- `/patient/*` — Requires `AppState.session !== null`

---

## STYLING SYSTEM (Vercel-like)

### Design Philosophy
- **Modern minimalism** — Clean, uncluttered interfaces
- **Apple-inspired** — Rounded corners, subtle shadows, spacious layouts
- **Accessibility-first** — WCAG AA contrast, semantic HTML
- **Performance-optimized** — CSS variables, minimal repaints

### CSS Variables (Design Tokens)

**Light Theme** (`--bg`, etc.):
```css
--bg:    #f2f2f7       /* Background (app backdrop) */
--surf:  #ffffff       /* Surface (cards, modals) */
--surf2: #f2f2f7       /* Secondary surface */
--bdr:   #c8c8cd       /* Border (active state) */
--bdr2:  #e0e0e5       /* Border (default state) */
--t1:    #1c1c1e       /* Text primary (headlines, buttons) */
--t2:    #636366       /* Text secondary (body copy) */
--tm:    #8e8e93       /* Text muted (placeholders, hints) */
--p:     #0d9488       /* Primary brand color (teal) */
--p-h:   #0f766e       /* Primary hover (darker teal) */
--p-l:   #ccfbf1       /* Primary light (teal bg tint) */
--red:   #ff3b30       /* Destructive actions */
--green: #34c759       /* Success states */
--amber: #ff9500       /* Warnings */
--blue:  #007aff       /* Info states */
--sh1:   0 1px 3px rgba(0,0,0,.08), ... /* Subtle shadow */
--sh2:   0 4px 16px rgba(0,0,0,.09)     /* Medium shadow */
--sh3:   0 8px 32px rgba(0,0,0,.13)     /* Strong shadow */
--r:     12px          /* Border radius (small) */
--r2:    16px          /* Border radius (medium) */
--rf:    9999px        /* Border radius (full pill) */
--nb-h:  52px          /* Top navbar height */
--bn-h:  80px          /* Bottom nav height */
```

**Dark Theme**: `html.dark` selector with inverted colors

### Spacing Scale
Based on `0.25rem` units:
```
4px   (0.25rem) — .25, gap-1
8px   (0.5rem)  — .5, gap-2
12px  (0.75rem) — .75, gap-3
16px  (1rem)    — 1, gap-4
20px  (1.25rem) — 1.25, gap-5
24px  (1.5rem)  — 1.5, gap-6
32px  (2rem)    — 2, gap-8
40px  (2.5rem)  — 2.5, gap-10
```

### Typography

**Font Stack** (System fonts for speed):
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, "Helvetica Neue",
             Arial, "Noto Sans Arabic", sans-serif;
```

**Font Size Scale**:
```
.625rem   (10px)  — .text-xs (badges, small labels)
.75rem    (12px)  — .text-sm (captions, hints)
.8125rem  (13px)  — .text-sm+ (form hints, error text)
.875rem   (14px)  — .text-base (labels, secondary text)
.9375rem  (15px)  — base font size (body copy)
1rem      (15px)  — headings, buttons
1.125rem  (18px)  — .text-lg (section headings)
1.375rem  (22px)  — .text-2xl (page headings)
```

**Font Weights**:
```
400 (regular) — Body copy, descriptions
500 (medium)  — UI labels, secondary headings
600 (semibold) — Buttons, form labels, emphasis
700 (bold)    — Page titles, important text
```

**Line Heights**:
```
1     — Buttons, inline text
1.4   — Form labels, captions
1.5   — Body copy (default)
1.6   — Longer text passages, accessibility
```

### Button System

**Variants**:
```css
.btn-p   /* Primary (teal) — main actions */
.btn-s   /* Secondary (white/gray) — less important */
.btn-g   /* Ghost (transparent) — minimal emphasis */
.btn-d   /* Destructive (red) — dangerous actions */
.btn-ok  /* Success (green) — confirmation */
.btn-tl  /* Tertiary/Link (cyan) — navigational */
```

**Sizes**:
```css
.btn-sm  /* 7px × 15px, .8125rem text — compact buttons */
.btn-md  /* 11px × 20px, .9375rem text — default buttons */
.btn-icon /* Square, 8px padding — icon-only buttons */
.btn-full /* 100% width — full-width buttons */
```

**States**:
- **Default**: `background color + shadow`
- **Hover**: Darker background, larger shadow, `translateY(-1px)`
- **Active**: `scale(.97)` — pressed animation
- **Disabled**: `opacity: .45`, no pointer events
- **Focus**: `outline: 2px solid var(--p)` with `outline-offset: 2px`

**Example**:
```html
<button class="btn btn-p btn-md">Primary Action</button>
<button class="btn btn-s btn-sm">Secondary Button</button>
<button class="btn btn-d btn-md">Delete</button>
```

### Form Elements

**Input Fields**:
```css
.inp / .sel / .ta {
  padding: .6875rem 1rem        /* 11px × 16px */
  border-radius: 10px
  border: 1.5px solid var(--bdr2)
  font-size: .9375rem (15px)
  transition: border-color, box-shadow .22s ease
}

/* States */
.inp:hover         → border: var(--bdr)
.inp:focus         → border: var(--p), box-shadow: 0 0 0 4px rgba(13,148,136,.14)
.inp.err           → border: var(--red), box-shadow: 0 0 0 4px rgba(255,59,48,.11)
.inp:disabled      → opacity: .5
```

**Labels** (`.lbl`):
```css
font-size: .875rem (14px)
font-weight: 600
color: var(--t1)
margin-bottom: .25rem

/* Required indicator */
.lbl .req { color: var(--red); font-weight: 700; }
```

**Error Messages** (`.ferr`):
```css
font-size: .8125rem (13px)
color: var(--red)
margin-top: 4px
font-weight: 500
```

**Form Group** (`.fg`):
```css
display: flex
flex-direction: column
gap: .5rem /* 8px between label and input */
```

### Card & Container System

**Card** (`.card`):
```css
background: var(--surf)
border: 1px solid var(--bdr2)
border-radius: var(--r2)  /* 16px */
padding: 1.375rem          /* 22px */
box-shadow: var(--sh1)     /* subtle */

/* Hover */
box-shadow: var(--sh2)     /* elevated */
border-color: var(--p-l)   /* teal tint */
transform: translateY(-2px)
transition: all .25s cubic-bezier(.22,1,.36,1)
```

**Page Layout** (`.page-wrap`):
```css
max-width: 960px
margin: 0 auto
padding: 1.75rem 1.25rem   /* 28px × 20px */
animation: pageIn .25s ease
```

**Page Center** (`.page-center`):
```css
min-height: calc(100vh - 52px)  /* Full height minus navbar */
display: flex
align-items: center
justify-content: center
padding: 2rem 1.25rem 5rem     /* Bottom padding for nav */
```

### Navigation

**Top Navbar** (`.nb`):
```css
height: var(--nb-h)        /* 52px */
background: rgba(255,255,255,.92)
border-bottom: 1px solid var(--bdr2)
backdrop-filter: blur(20px) saturate(1.6)
position: fixed
z-index: 50
```

**Bottom Navigation** (`.bnav-pill`):
```css
/* Pill-shaped container */
border-radius: 2rem
padding: .4375rem          /* 7px */
background: rgba(255,255,255,.96)
box-shadow: var(--sh2)

/* Animated track indicator */
.bnav-pill-track {
  background: linear-gradient(135deg, var(--p), rgba(13,148,136,.3))
  border-radius: 1.5rem
  transition: left .34s cubic-bezier(.22,1,.36,1)
}

/* Nav items */
.bnav-item {
  padding: .6rem .5rem
  border-radius: 1.5rem
  font-size: .625rem
  font-weight: 600
  transition: all .28s cubic-bezier(.22,1,.36,1)
}

.bnav-item:hover:not(.active) {
  color: var(--p)
  transform: translateY(-2px)
}

.bnav-item.active {
  color: #fff
  transform: scale(1.04) translateY(-1px)
}
```

### Animations & Transitions

**Timing Functions**:
```css
.22s / .25s  — UI interactions (buttons, inputs)
.28s / .34s  — Navigation, layout shifts
cubic-bezier(.22,1,.36,1)  — Smooth, natural easing (default)
```

**Keyframe Animations**:
```css
@keyframes fadeIn      { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp     { from { opacity: 0; transform: translateY(12px) } }
@keyframes slideIn     { from { opacity: 0; transform: translateX(-12px) } }
@keyframes scaleIn     { from { opacity: 0; transform: scale(.95) } }
@keyframes springBounce { 0% { scale: .8 } 50% { scale: 1.05 } }
@keyframes pulse       { 0%,100% { opacity: 1 } 50% { opacity: .6 } }
@keyframes spin        { to { transform: rotate(360deg) } }
```

**Usage**:
```css
.card {
  animation: scaleIn .2s cubic-bezier(.25,.46,.45,.94) both;
}

.bnav-item:hover {
  transition: all .28s cubic-bezier(.22,1,.36,1);
  transform: translateY(-2px);
}
```

### Shadows

**Shadow Hierarchy**:
```css
--sh1: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)
       /* Subtle, used for cards at rest */

--sh2: 0 4px 16px rgba(0,0,0,.09)
       /* Medium, used for hover states, modals */

--sh3: 0 8px 32px rgba(0,0,0,.13)
       /* Strong, used for elevated surfaces, dropdowns */
```

**Custom Shadows**:
```css
/* Button shadow */
box-shadow: 0 4px 12px rgba(13,148,136,.28)

/* Hover elevation */
box-shadow: 0 8px 20px rgba(13,148,136,.38)

/* Icon drop shadow */
filter: drop-shadow(0 1px 3px rgba(0,0,0,.2))
```

### Responsive Design

**Breakpoints**:
```css
@media (max-width: 640px) {
  /* Mobile adjustments */
  .page-wrap { padding: 1.25rem 1rem }
  .card { padding: 1.125rem }
  font-size scale increases
}
```

**Mobile-First Approach**:
- Default styles for mobile
- Desktop enhancements use `min-width` queries
- Navigation switches from bottom pill to top navbar on larger screens

---

## COMPONENT LIBRARY

### Common Components (from `public/js/components.js`)

**Header Component**:
```javascript
createHeader(title, subtitle?, backBtn?) {
  // Returns: <header> with navbar styling
  // Params: title string, optional subtitle, back button handler
}
```

**Input Component**:
```javascript
createInput({
  type,        // 'text' | 'email' | 'password' | 'number'
  label,       // Form label text
  placeholder,
  required,
  error,       // Error message to display
  hint,        // Helper text below input
  icon         // Icon class for prefix
})
```

**Button Component**:
```javascript
createButton({
  text,        // Button text
  variant,     // 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size,        // 'sm' | 'md' | 'lg' | 'full'
  onclick,     // Click handler
  disabled,
  loading      // Show spinner
})
```

**Modal Component**:
```javascript
createModal({
  title,
  content,     // HTML string or element
  buttons,     // Array of { text, onclick, variant }
  closeable    // Show X button
})
```

**Card Component**:
```javascript
createCard({
  title,
  content,     // HTML string or element
  footer,      // Optional footer
  clickable,   // Add hover effect
  onclick
})
```

**Form Component**:
```javascript
createForm({
  fields: [
    { name, type, label, required, ... },
    { name, type, label, required, ... }
  ],
  onsubmit,    // Form submit handler
  submitText   // Button text (default "Submit")
})
```

---

## STATE MANAGEMENT

### Global App State (`AppState`)

```javascript
AppState = {
  // Auth
  session: null,        // Supabase session object
  sessionId: string,    // UUID for multi-login detection

  // Doctor Profile
  doctor: {
    id, user_id, full_name, email, phone, university,
    status, rejection_reason, last_seen, ...
  },

  // Admin Status
  isAdmin: boolean,
  isSuperAdmin: boolean,
  adminRole: 'super' | 'moderator' | 'viewer',
  adminPerms: object,

  // UI State
  loading: boolean,
  notifications: array,
  currentPage: string,

  // Presence (Real-time)
  onlineDoctors: array,
  activeSessions: object
}
```

**State Updates**:
```javascript
// Direct manipulation (not ideal, but current pattern)
AppState.session = newSession
AppState.doctor = doctorData

// Or use event listeners
dbOnAuthChange((event, session) => {
  AppState.session = session
})
```

**Persistence**:
- Session: Stored by Supabase in `localStorage` under `senna-auth`
- Language preference: `localStorage.senna-lang`
- Theme preference: `localStorage.senna-theme` (stored on `<html>` element)

---

## COMMON PATTERNS & BEST PRACTICES

### 1. Loading States
```javascript
// Show loading spinner
AppState.loading = true
const btn = document.querySelector('#submit-btn')
btn.disabled = true
btn.innerHTML = '<div class="spin-btn"></div> Loading...'

// Hide after async operation
AppState.loading = false
btn.disabled = false
btn.innerHTML = 'Submit'
```

### 2. Error Handling
```javascript
try {
  const result = await dbSomeQuery()
} catch (e) {
  console.error('[page:name]', e.message)
  showToast(`Error: ${e.message}`, 'error')
  // Don't expose internal errors to users
}
```

### 3. Form Validation
```javascript
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const validatePhone = (phone) => /^\d{10,15}$/.test(phone)

if (!validateEmail(email)) {
  showError('#email', 'Invalid email address')
  return
}
```

### 4. API Calls
```javascript
// All API calls use Authorization header with JWT
const response = await fetch('/api/approve-doctor', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AppState.session.access_token}`
  },
  body: JSON.stringify({ doctorId })
})

if (!response.ok) {
  const { error } = await response.json()
  throw new Error(error)
}

const { ok } = await response.json()
return ok
```

### 5. Real-Time Updates
```javascript
// Join real-time channel
const channel = sb.channel(`presence:doctor:${doctorId}`)
  .on('presence', { event: 'sync' }, () => {
    const presenceState = channel.presenceState()
    // Update UI with online doctors
  })
  .subscribe()

// Clean up on leave
channel.unsubscribe()
```

### 6. RTL / i18n Implementation
```javascript
// Set language
setLang('ar')  // Sets lang cookie + RTL on <html>
setLang('en')  // Sets lang + LTR

// Get translated string
const text = t('button.submit')  // "Submit" or "إرسال"

// Dynamic language switching
document.documentElement.dir = getLang() === 'ar' ? 'rtl' : 'ltr'
document.documentElement.lang = getLang()
```

---

## DEPLOYMENT & ENVIRONMENT VARIABLES

### Required Environment Variables (Vercel)

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SECRET_KEY=eyJhbGc...xxx
SUPABASE_PUBLISHABLE_KEY=eyJhbGc...xxx
```

### Configuration Delivery
- `/api/config` endpoint serves `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to browser
- SECRET key stays server-side only
- Config cached for 5 minutes
- Client-side code initializes Supabase client with these keys

### Deployment Checklist
- [ ] Environment variables set in Vercel dashboard
- [ ] Database migrations run on Supabase
- [ ] Bucket policies configured (document uploads)
- [ ] RLS (Row Level Security) policies enabled where needed
- [ ] Real-time channels subscribed by users
- [ ] API rate limiting configured
- [ ] CORS headers allow your domain

---

## TROUBLESHOOTING GUIDE

| Issue | Cause | Solution |
|-------|-------|----------|
| "Supabase failed to load" | Missing env vars | Check `/api/config` response |
| Blank page on load | Missing schema tables | Run database migrations |
| Auth loop | Doctor not approved | Check `doctors.status` in DB |
| Real-time not working | RLS policy blocking | Check Supabase RLS settings |
| Mobile nav hidden | CSS specificity issue | Check `.has-bnav` class on body |
| Dark mode not applying | Missing `dark` class | Call `applyTheme()` on load |

---

## FILE EDITING GUIDELINES FOR CLAUDE

### When Editing `public/style.css`:
1. **Preserve structure**: Keep CSS variable section at top
2. **Add new variables** if introducing new colors/spacing
3. **Use existing spacing scale** (no arbitrary `px` values)
4. **Test dark mode** by toggling `html.dark` class
5. **Mobile-first approach**: Default styles first, then `@media` for desktop

### When Editing API Endpoints:
1. **Always require auth**: Start with `await requireAuth(req)` or `requireAdmin(req)`
2. **Validate input**: Check required fields before querying
3. **Use sendError()**: `sendError(res, status, message)` for consistency
4. **Log errors**: `console.error('[api:name]', e.message)`
5. **Return JSON**: Always `res.json({ ok: true })` or error response

### When Editing Database Queries (`public/js/db.js`):
1. **Use Supabase client methods**: `.select()`, `.insert()`, `.update()`, `.delete()`
2. **Handle errors**: `if (error) throw error` or `console.warn()`
3. **Return consistent shape**: Always return data or null, not error objects
4. **Use `.maybeSingle()`** for optional records, `.single()` for required

### When Creating New Pages:
1. **Follow naming**: `public/js/pages/page-name.js`
2. **Export function**: `function pageNamePage(container) { /* render to container */ }`
3. **Register route**: Add `registerRoute('#/path', pageNamePage)` in `main.js`
4. **Use AppState**: Check `AppState.isAdmin`, `AppState.doctor`, etc.
5. **Use i18n**: Wrap user-facing text in `t()` function
6. **Handle loading**: Show spinners during async operations
7. **Error boundaries**: Try/catch with user-friendly error messages

---

## NEXT STEPS FOR DEVELOPMENT

1. **Add new features** following the patterns in existing pages
2. **Update styling** in `public/style.css` using design token system
3. **Extend API** with new endpoints in `/api/` folder
4. **Add database tables** via Supabase dashboard, then create query functions in `db.js`
5. **Test on mobile** with bottom navigation visible
6. **Check RTL** by switching to Arabic language
7. **Monitor real-time** channels in Supabase dashboard
8. **Performance**: Use browser DevTools to ensure Largest Contentful Paint < 3s

---

**Last Updated**: April 2026
**Maintainer**: v0 AI Assistant
**Questions?** Check `console.error()` output and database logs in Supabase dashboard.
