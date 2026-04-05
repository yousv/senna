# SENNA PROJECT — COMPLETE FILE STRUCTURE & REFERENCE
**Master index of every file, its purpose, and how to edit it**

---

## QUICK FILE LOOKUP

### Need to...
- **Add authentication logic?** → `public/js/auth.js`
- **Add database queries?** → `public/js/db.js`
- **Create a new API endpoint?** → `api/your-endpoint.js`
- **Add a new page/route?** → `public/js/pages/your-page.js`
- **Fix styling?** → `public/style.css`
- **Add UI components?** → `public/js/components.js`
- **Change translations?** → `public/js/i18n.js`
- **Fix routing?** → `public/js/router.js`

---

## DIRECTORY TREE & FILE PURPOSES

```
/vercel/share/v0-project/
│
├── 📁 api/                              [SERVERLESS API ENDPOINTS]
│   ├── config.js                        Runtime config delivery (Supabase keys)
│   ├── approve-doctor.js                Admin: Approve pending doctor application
│   ├── reject-doctor.js                 Admin: Reject doctor with reason
│   ├── approve-edit.js                  Admin: Approve profile edit request
│   ├── reject-edit.js                   Admin: Reject profile edit
│   └── resolve-claim.js                 Admin: Approve/decline patient claims
│
├── 📁 lib/                              [SERVER-SIDE UTILITIES]
│   ├── auth.js                          JWT verification & middleware
│   ├── supabase.js                      Supabase admin client setup
│   └── utils.ts                         Common server utilities
│
├── 📁 public/                           [STATIC ASSETS & CLIENT CODE]
│   ├── 📁 js/                           [JAVASCRIPT APPLICATION]
│   │   ├── config.js                    Load Supabase config from /api/config
│   │   ├── db.js                        Database queries wrapper (Supabase)
│   │   ├── auth.js                      Auth state management & session handling
│   │   ├── router.js                    Hash-based router (#/path routing)
│   │   ├── main.js                      App initialization & error handler
│   │   ├── ui.js                        UI helper functions (modals, toasts)
│   │   ├── i18n.js                      Internationalization (AR/EN)
│   │   ├── utils.js                     Client-side utilities & helpers
│   │   ├── icons.js                     Icon definitions (inline SVGs)
│   │   ├── components.js                Reusable UI components
│   │   │
│   │   └── 📁 pages/                    [PAGE COMPONENTS]
│   │       ├── landing.js               Public landing page (no auth required)
│   │       ├── login.js                 Login form page
│   │       ├── signup.js                Registration form page
│   │       ├── doctor-dash.js           Doctor dashboard (main view)
│   │       ├── doctor-profile.js        Doctor profile editor
│   │       ├── patient.js               Patient dashboard (claims management)
│   │       ├── admin-dash.js            Admin dashboard (statistics)
│   │       ├── admin-doctors.js         Admin: Doctor approval management
│   │       └── admin-requests.js        Admin: Claims & profile edits review
│   │
│   └── style.css                        Global stylesheet (compiled/current version)
│
├── 📁 components/                       [REACT/NEXT.js UI COMPONENTS]
│   ├── theme-provider.tsx               Theme provider component
│   ├── 📁 ui/                           [shadcn/ui COMPONENT LIBRARY]
│   │   ├── accordion.tsx                Collapsible accordion component
│   │   ├── alert-dialog.tsx             Alert dialog component
│   │   ├── alert.tsx                    Alert notification component
│   │   ├── avatar.tsx                   User avatar component
│   │   ├── badge.tsx                    Status badge component
│   │   ├── button.tsx                   Button component (various variants)
│   │   ├── card.tsx                     Card container component
│   │   ├── checkbox.tsx                 Checkbox input
│   │   ├── dialog.tsx                   Modal dialog component
│   │   ├── dropdown-menu.tsx            Dropdown menu component
│   │   ├── input.tsx                    Text input component
│   │   ├── label.tsx                    Form label component
│   │   ├── progress.tsx                 Progress bar component
│   │   ├── select.tsx                   Select dropdown component
│   │   ├── spinner.tsx                  Loading spinner component
│   │   ├── table.tsx                    Data table component
│   │   ├── tabs.tsx                     Tab navigation component
│   │   ├── textarea.tsx                 Textarea input component
│   │   └── [... other ui components]
│
├── 📁 app/                              [NEXT.js APP DIRECTORY (if used)]
│   ├── layout.tsx                       Root layout & metadata
│   ├── globals.css                      Global styles (Next.js)
│   └── page.tsx                         Home page (if Next.js in use)
│
├── 📁 styles/                           [ADDITIONAL STYLES (if Next.js)]
│   └── globals.css                      Global stylesheet
│
├── 🔧 CONFIGURATION FILES
│   ├── package.json                     Dependencies & scripts
│   ├── tailwind.config.ts               Tailwind CSS configuration
│   ├── tsconfig.json                    TypeScript configuration
│   ├── components.json                  shadcn/ui CLI configuration
│   ├── vercel.json                      Vercel deployment configuration
│   └── next.config.js                   Next.js configuration (if used)
│
├── 📄 DOCUMENTATION (NEW)
│   ├── PROJECT_ARCHITECTURE.md          **Complete architecture guide**
│   ├── STYLING_GUIDELINES.md            **Design system & styling rules**
│   ├── FILE_STRUCTURE.md                **This file — quick reference**
│   └── README.md                        Project overview (if exists)
│
└── 📁 .git/                             [GIT REPOSITORY]
    └── (version control)
```

---

## DETAILED FILE DOCUMENTATION

### 1. api/config.js
**Purpose**: Serve Supabase configuration to the browser at runtime

**What it does**:
- Returns JavaScript that sets `window.__ENV__` with Supabase keys
- Caches response for 5 minutes
- Never exposes the SECRET key to browser

**When to edit**: 
- Only modify if changing how env vars are delivered
- Don't touch this unless instructed

**Key code**:
```javascript
res.send(`window.__ENV__={SUPABASE_URL:${JSON.stringify(url)},SUPABASE_KEY:${JSON.stringify(key)}};`)
```

---

### 2. api/approve-doctor.js
**Purpose**: Admin endpoint to approve a pending doctor application

**Required auth**: Admin only

**Request body**:
```json
{ "doctorId": "uuid" }
```

**What it does**:
1. Verifies user is admin
2. Updates doctor status to "approved"
3. Logs action in doctor_applications table
4. Returns `{ ok: true }`

**When to edit**:
- To change approval logic
- To add notifications
- To require additional checks

**Error handling**:
```javascript
return sendError(res, 400, 'doctorId required')
return sendError(res, e.status || 500, e.message)
```

---

### 3. api/reject-doctor.js
**Purpose**: Admin endpoint to reject a doctor application with reason

**Required auth**: Admin only

**Request body**:
```json
{ "doctorId": "uuid", "reason": "string" }
```

**What it does**:
1. Verifies admin status
2. Updates doctor status to "rejected"
3. Stores rejection reason
4. Clears any previous rejection reason if re-submitted

---

### 4. api/approve-edit.js
**Purpose**: Admin endpoint to approve doctor profile edit request

**Required auth**: Admin only

**Request body**:
```json
{ "doctorId": "uuid", "editId": "uuid" }
```

---

### 5. api/reject-edit.js
**Purpose**: Admin endpoint to reject profile edit with reason

**Required auth**: Admin only

**Request body**:
```json
{ "doctorId": "uuid", "editId": "uuid", "reason": "string" }
```

---

### 6. api/resolve-claim.js
**Purpose**: Admin endpoint to resolve (approve/decline) patient claims

**Required auth**: Admin only

**Request body**:
```json
{
  "claimId": "uuid",
  "status": "approved" | "declined",
  "reason": "string (optional)"
}
```

**What it does**:
1. Validates status is approved or declined
2. Updates claim status in database
3. Stores decline reason if provided
4. Returns `{ ok: true }`

**When to edit**:
- To add notification emails
- To trigger workflows
- To add audit logging

---

### 7. lib/auth.js
**Purpose**: Server-side authentication middleware & JWT verification

**Exports**:
- `requireAuth(req)` — Verifies JWT token from Authorization header
- `requireAdmin(req)` — Verifies user is admin (requires requireAuth first)
- `sendError(res, status, message)` — Standard error response format

**Usage in API endpoints**:
```javascript
const { requireAuth, requireAdmin, sendError } = require('../lib/auth')

// Verify authenticated user
await requireAuth(req)

// Verify admin user
await requireAdmin(req)
```

**When to edit**:
- To change auth method
- To add role-based access control
- To implement different permission checking

---

### 8. lib/supabase.js
**Purpose**: Initialize and export Supabase admin client

**Exports**:
- `getSupabaseAdmin()` — Returns authenticated Supabase client with service role

**Usage**:
```javascript
const { getSupabaseAdmin } = require('./supabase')
const sb = getSupabaseAdmin()

const { data, error } = await sb.from('doctors').select()
```

**When to edit**:
- To change connection settings
- To add client middleware
- To configure timeout/retry logic

---

### 9. public/js/config.js
**Purpose**: Load Supabase configuration from /api/config endpoint

**What it does**:
1. Fetches config from `/api/config`
2. Executes returned JavaScript to set `window.__ENV__`
3. Stores SUPABASE_URL and SUPABASE_KEY globally

**Usage**:
```javascript
// Loaded automatically before app.js
// Creates global variables:
// - SUPABASE_URL
// - SUPABASE_KEY
```

**When to edit**:
- To change config loading strategy
- To add additional environment variables

---

### 10. public/js/db.js
**Purpose**: All database queries and Supabase client wrapper

**Key functions**:

**Authentication**:
```javascript
dbGetSession()                    // Get current session
dbSignIn(email, password)        // Login
dbSignUp(email, password, meta)  // Register
dbSignOut()                       // Logout
dbExchangeCode(code)             // PKCE flow
dbOnAuthChange(callback)         // Listen to auth changes
```

**Doctor queries**:
```javascript
dbGetDoctor(userId)              // Get doctor profile
dbGetAdminRecord(userId)         // Get admin record
dbGetProfile(userId)             // Get combined profile
dbUpdateDoctorLastSeen(doctorId) // Heartbeat for presence
```

**Real-time**:
```javascript
dbJoinSessionChannel(doctorId, sessionId, onConflict)
dbJoinPresenceChannel(doctorId, data)
```

**When to edit**:
- To add new database queries
- To modify query fields
- To change error handling
- To add caching logic

**Pattern for adding queries**:
```javascript
async function dbGetMyNewData(userId) {
  const { data, error } = await sb
    .from('table_name')
    .select('col1,col2,col3')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (error) {
    console.warn('[db:getMyNewData]', error.message)
    return null
  }
  return data
}
```

---

### 11. public/js/auth.js
**Purpose**: Authentication state management and session lifecycle

**Key functions**:

```javascript
authInit()                  // Initialize auth on app load
authSetSession(session)     // Called after login to load profile
_loadProfile(userId)        // Load doctor/admin data from DB
_startPresence()            // Start real-time presence updates
```

**Global State Updated**:
- `AppState.session` — Supabase session object
- `AppState.doctor` — Doctor profile data
- `AppState.isAdmin` — Admin status boolean
- `AppState.sessionId` — Unique session UUID

**When to edit**:
- To change auth flow
- To add additional checks (e.g., email verification)
- To modify profile loading
- To change presence behavior

**Important**: 
- Unapproved doctors are auto-logged out
- Multi-login detection prevents concurrent sessions
- All state cleared on logout

---

### 12. public/js/router.js
**Purpose**: Hash-based routing system (#/path)

**Functions**:
```javascript
registerRoute(path, handler)  // Register a page handler
navigate(path)                // Navigate to path
dispatch()                    // Render current route
initRouter()                  // Initialize router on app load
```

**Usage**:
```javascript
// In pages/login.js
registerRoute('/login', loginPage)

// To navigate
navigate('/doctor/dashboard')
```

**How it works**:
1. Each route maps to a page function
2. Page function receives `<div id="app">` as argument
3. Page renders content into the app div
4. Hash change triggers route dispatch
5. Wildcard route `'*'` handles 404

**When to edit**:
- Only if changing routing mechanism
- Don't add routes here — add them in main.js or page files

---

### 13. public/js/main.js
**Purpose**: Application entry point and initialization

**What it does**:
1. Check if Supabase loaded
2. Initialize database client
3. Set language
4. Apply theme
5. Initialize authentication
6. Render navbar and bottom nav
7. Initialize router
8. Register all routes

**Order matters**:
- Config must load first (from /api/config)
- DB must initialize before auth
- Auth must initialize before router
- Router must initialize last

**Error handling**:
- Shows fatal error modal if anything fails
- Logs to console for debugging

**When to edit**:
- To add new initialization steps
- To change startup order
- To add additional event listeners

---

### 14. public/js/ui.js
**Purpose**: User interface helper functions and utilities

**Key functions**:
```javascript
showModal(content, options)      // Display modal dialog
closeModal()                     // Close current modal
showToast(message, type)         // Show notification toast
showConfirm(title, msg, ok, cancel) // Confirmation dialog
setLoading(id, bool)             // Toggle loading state
showError(id, msg)               // Show field error
renderNavbar()                   // Render top navbar
renderBottomNav()                // Render bottom navigation
```

**When to edit**:
- To add new UI helpers
- To modify modal/toast styling
- To change notification behavior

---

### 15. public/js/i18n.js
**Purpose**: Internationalization (Arabic & English)

**Functions**:
```javascript
setLang(lang)                    // 'ar' or 'en'
getLang()                        // Get current language
t(key)                          // Translate key → "ar text" or "en text"
applyTheme()                     // Apply RTL/LTR based on language
```

**Storage**:
- Language preference stored in `localStorage.senna-lang`

**RTL Support**:
- Arabic sets `html[dir="rtl"]` and `html[lang="ar"]`
- English sets `html[dir="ltr"]` and `html[lang="en"]`

**Adding translations**:
```javascript
// In i18n.js, add to translation object
const translations = {
  'page.title': {
    en: 'Welcome',
    ar: 'أهلاً'
  }
}

// Use in code
const title = t('page.title')  // Gets 'Welcome' or 'أهلاً'
```

**When to edit**:
- To add new language strings
- To change translations
- To modify RTL/LTR logic
- To support additional languages

---

### 16. public/js/utils.js
**Purpose**: Client-side utility functions

**Typical utilities**:
```javascript
esc(string)                      // HTML escape
parseJwt(token)                  // Decode JWT payload
formatDate(date)                 // Format date string
formatPhone(phone)               // Format phone number
validateEmail(email)             // Email validation
```

**When to edit**:
- To add new helper functions
- To add validation functions
- To add formatting functions

---

### 17. public/js/icons.js
**Purpose**: Icon definitions as inline SVG strings

**Pattern**:
```javascript
const IC = {
  home: '<svg>...</svg>',
  settings: '<svg>...</svg>',
  user: '<svg>...</svg>',
  // etc.
}
```

**Usage in code**:
```javascript
document.innerHTML = IC.home  // Inline SVG into HTML
```

**When to edit**:
- To add new icons
- To change icon sizes (modify width/height attributes)
- To update icon colors

---

### 18. public/js/components.js
**Purpose**: Reusable UI component functions

**Common components**:
```javascript
createHeader(title, subtitle, backBtn)
createInput({ type, label, required, error, hint, icon })
createButton({ text, variant, size, onclick, disabled, loading })
createModal({ title, content, buttons, closeable })
createCard({ title, content, footer, clickable, onclick })
createForm({ fields, onsubmit, submitText })
```

**Pattern**:
```javascript
function createButton(options) {
  const btn = document.createElement('button')
  btn.className = `btn btn-${options.variant} btn-${options.size}`
  btn.textContent = options.text
  btn.onclick = options.onclick
  return btn
}
```

**When to edit**:
- To add new components
- To modify component styling
- To change component behavior
- To add new variants

---

### 19. public/js/pages/landing.js
**Purpose**: Public landing page (no authentication required)

**What it shows**:
- App introduction
- Feature overview
- Call-to-action buttons (Login/Sign Up)
- Public information

**Registration**:
```javascript
registerRoute('/', landingPage)
registerRoute('#', landingPage)  // Home
```

**When to edit**:
- To change landing page content
- To add features/benefits
- To modify CTAs
- To add testimonials

**Important**: No auth check needed here

---

### 20. public/js/pages/login.js
**Purpose**: User login page

**Features**:
- Email & password fields
- Remember me checkbox (optional)
- Error message display
- Link to sign up

**Route**: `/#/login`

**Functionality**:
1. User enters email & password
2. Click submit
3. Calls `dbSignIn(email, password)`
4. On success: `authSetSession(session)` then navigate to dashboard
5. On error: Show error message in UI

**When to edit**:
- To add social login
- To change form validation
- To modify error messages
- To add password reset link

---

### 21. public/js/pages/signup.js
**Purpose**: User registration page

**Features**:
- Role selection (Doctor, Patient, Admin)
- Email validation
- Password strength requirements
- Terms acceptance
- Error display

**Route**: `/#/signup`

**Functionality**:
1. User fills form
2. Validate inputs
3. Check password strength
4. Call `dbSignUp(email, password, meta)`
5. On success: Auto-login or redirect to email verification
6. On error: Show validation message

**When to edit**:
- To change required fields
- To modify role selection
- To adjust password requirements
- To add terms & conditions link

---

### 22. public/js/pages/doctor-dash.js
**Purpose**: Doctor's main dashboard

**Shows**:
- Doctor profile summary
- Patient claims (if any)
- Pending requests
- Performance metrics
- Quick actions

**Route**: `/#/doctor/dashboard`

**Access**: Requires authenticated approved doctor

**Functionality**:
1. Load doctor's claims data
2. Display dashboard widgets
3. Show action buttons
4. Update presence status

**When to edit**:
- To add widgets
- To change metrics
- To modify layout
- To add new sections

---

### 23. public/js/pages/doctor-profile.js
**Purpose**: Doctor profile editor

**Features**:
- Edit full name, email, phone
- University & semester
- Upload ID documents
- Submit changes for admin approval

**Route**: `/#/doctor/profile`

**Functionality**:
1. Load current doctor profile
2. Display editable form
3. Handle file uploads
4. Submit for admin review
5. Show submission status

**When to edit**:
- To add/remove fields
- To change upload requirements
- To modify validation
- To add document preview

---

### 24. public/js/pages/patient.js
**Purpose**: Patient dashboard

**Shows**:
- Patient's claims (status: pending/approved/declined)
- Doctor history
- Claim details
- Submit new claim button

**Route**: `/#/patient`

**Access**: Requires authenticated patient

**Functionality**:
1. Load patient's claims
2. Display claims list
3. Show claim details on click
4. Allow new claim submission
5. Track claim status

**When to edit**:
- To change claims display format
- To add filtering/sorting
- To modify claim form
- To add claim history

---

### 25. public/js/pages/admin-dash.js
**Purpose**: Admin dashboard overview

**Shows**:
- Key metrics (total doctors, claims, etc.)
- Recent applications
- Pending approvals count
- System status

**Route**: `/#/admin/dashboard`

**Access**: Requires admin authentication

**Functionality**:
1. Fetch admin statistics
2. Display dashboard widgets
3. Show summary metrics
4. Quick navigation to management pages

**When to edit**:
- To add/remove metrics
- To change widget layout
- To modify data sources
- To add charts/analytics

---

### 26. public/js/pages/admin-doctors.js
**Purpose**: Admin doctor management

**Features**:
- List all doctors with status
- Filter by status (pending, approved, rejected)
- Approve/reject buttons
- View doctor details
- Search functionality

**Route**: `/#/admin/doctors`

**Access**: Requires admin authentication

**API calls**:
- `POST /api/approve-doctor` — Approve application
- `POST /api/reject-doctor` — Reject with reason

**When to edit**:
- To add filters
- To modify table columns
- To change approval flow
- To add bulk actions

---

### 27. public/js/pages/admin-requests.js
**Purpose**: Admin claim & edit request management

**Features**:
- List pending claims
- Approve/decline claims
- View claim details
- Add reason for rejection
- Filter by status

**Route**: `/#/admin/requests`

**Access**: Requires admin authentication

**API calls**:
- `POST /api/resolve-claim` — Approve/decline claim

**When to edit**:
- To change claim display
- To add filtering
- To modify approval form
- To add notes/comments

---

### 28. public/style.css
**Purpose**: Global stylesheet with all styling

**Structure**:
1. CSS Variables (colors, spacing, shadows)
2. Reset & base styles
3. Keyframe animations
4. Layout (navbar, page wrap, grid)
5. Components (buttons, forms, cards)
6. Utilities & helpers
7. Dark mode overrides
8. Responsive adjustments

**Key sections**:
- `:root` — Light theme variables
- `html.dark` — Dark theme overrides
- `.nb` — Top navbar
- `.bnav-*` — Bottom navigation
- `.btn-*` — Button variants
- `.card` — Card styling
- `.inp`, `.sel`, `.ta` — Form inputs
- `@media` — Mobile adjustments

**When to edit**:
- To fix styling issues
- To change colors
- To adjust spacing
- To add animations
- To support dark mode
- To fix mobile layout

**IMPORTANT RULES**:
- Always use CSS variables (--p, --t1, etc.)
- Don't hardcode colors or spacing
- Use var(--r) or var(--r2) for border radius
- Test dark mode (add `dark` class to `<html>`)
- Test mobile (<= 640px viewport)
- Maintain animation timing consistency

---

### 29. components/theme-provider.tsx
**Purpose**: React theme provider (if using Next.js/React)

**Functionality**:
- Provides theme context to components
- Handles dark/light mode switching
- Manages theme persistence

---

### 30. components/ui/* (shadcn/ui Library)
**Purpose**: Pre-built accessible UI components

**Available components**:
- Button, Card, Input, Select, etc.
- Use these if building with React/Next.js
- Follow shadcn/ui documentation for usage

---

### 31. app/layout.tsx & globals.css
**Purpose**: Next.js root layout (if using Next.js)

**What to edit**:
- Add fonts, metadata, providers
- Update global styles
- Configure theme system

---

### 32. package.json
**Purpose**: Project dependencies and scripts

**Key fields**:
```json
{
  "name": "senna",
  "version": "2.0.0",
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0"
  }
}
```

**When to edit**:
- To add new dependencies
- To update dependency versions
- To add npm scripts
- To configure build settings

**Important**: Don't edit by hand for Supabase — use `npm install`

---

### 33. PROJECT_ARCHITECTURE.md (NEW)
**Purpose**: Complete architecture guide for Claude & developers

**Contains**:
- Feature documentation
- API endpoint specifications
- Database schema
- Authentication flow
- State management
- Common patterns
- Troubleshooting guide

**Use this for**: Understanding how features work together

---

### 34. STYLING_GUIDELINES.md (NEW)
**Purpose**: Comprehensive design system specification

**Contains**:
- Design tokens (colors, spacing, typography)
- Button system with all variants
- Form input specifications
- Card & container patterns
- Navigation styling
- Animation & timing
- Dark mode implementation
- Accessibility guidelines
- Copy-paste snippets

**Use this for**: Ensuring consistent styling across the app

---

### 35. FILE_STRUCTURE.md (NEW — THIS FILE)
**Purpose**: Master index of all files and their purposes

**Use this for**: Quick lookup when editing files

---

## EDITING WORKFLOW

### When adding a new feature:

1. **Create database table** (in Supabase)
2. **Add queries** to `public/js/db.js`
3. **Create API endpoint** in `api/` if needed
4. **Create page** in `public/js/pages/` if needed
5. **Register route** in `public/js/main.js`
6. **Add styling** to `public/style.css`
7. **Add translations** to `public/js/i18n.js` if user-facing

### When fixing a bug:

1. **Check browser console** for errors
2. **Check Supabase logs** for database errors
3. **Identify affected file** using this guide
4. **Add debug logging** to understand state
5. **Fix the issue** (see file-specific advice above)
6. **Test in dark mode** and mobile
7. **Remove debug logs** when fixed

### When styling a component:

1. **Use CSS variables** (--p, --t1, --r, etc.)
2. **Follow spacing scale** (4px grid)
3. **Match animation timing** (.22s - .34s)
4. **Test dark mode** (add `dark` class)
5. **Test mobile** (viewport <= 640px)
6. **Ensure touch targets** >= 44px
7. **Check text contrast** >= 4.5:1

---

## FILE DEPENDENCY GRAPH

```
main.js (entry point)
├── config.js (load env)
├── db.js (init supabase)
├── auth.js (manage session)
│   └── db.js
├── router.js (hash routing)
├── ui.js (helpers)
├── i18n.js (translations)
├── icons.js (svg icons)
├── components.js (reusable)
├── utils.js (helpers)
│
└── pages/
    ├── landing.js
    ├── login.js → auth.js, db.js
    ├── signup.js → auth.js, db.js
    ├── doctor-dash.js → db.js, ui.js
    ├── doctor-profile.js → db.js, ui.js
    ├── patient.js → db.js, ui.js
    ├── admin-dash.js → db.js, ui.js
    ├── admin-doctors.js → db.js, ui.js, api/approve-doctor
    └── admin-requests.js → db.js, ui.js, api/resolve-claim

api/
├── config.js (serves env vars)
├── approve-doctor.js → lib/auth.js, lib/supabase.js
├── reject-doctor.js → lib/auth.js, lib/supabase.js
├── resolve-claim.js → lib/auth.js, lib/supabase.js
└── (other endpoints)

lib/
├── auth.js (middleware)
└── supabase.js (db client)

styles/
└── public/style.css (global styles)
```

---

## COMMON EDITING TASKS

### Task: Add a new form field to doctor signup

1. **Edit**: `public/js/pages/signup.js`
   - Add field to form HTML
   - Add validation logic
   - Include in POST body

2. **Edit**: `public/style.css` (if needed)
   - Add styling for new input

3. **Test**: 
   - Fill form and submit
   - Check database for new field

### Task: Add a new API endpoint

1. **Create**: `api/your-endpoint.js`
   ```javascript
   const { requireAuth, sendError } = require('../lib/auth')
   const { getSupabaseAdmin } = require('../lib/supabase')

   module.exports = async (req, res) => {
     try {
       await requireAuth(req)  // Verify auth
       // Your logic here
       res.json({ ok: true })
     } catch (e) {
       sendError(res, e.status || 500, e.message)
     }
   }
   ```

2. **Call from page**:
   ```javascript
   const res = await fetch('/api/your-endpoint', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${AppState.session.access_token}`
     },
     body: JSON.stringify({ /* data */ })
   })
   ```

### Task: Fix mobile layout issue

1. **Edit**: `public/style.css`
2. **Add media query**:
   ```css
   @media (max-width: 640px) {
     /* mobile styles */
   }
   ```
3. **Test**: Set viewport to mobile size
4. **Check**: Tap targets >= 44px, no horizontal scroll

### Task: Add dark mode support

1. **Edit**: `public/style.css`
2. **Add to `html.dark`**:
   ```css
   html.dark {
     --your-variable: dark-color;
   }
   ```
3. **Test**: Toggle `dark` class on `<html>`

### Task: Change translations

1. **Edit**: `public/js/i18n.js`
2. **Find translations object**
3. **Add new key or modify existing**
4. **Use in code**: `t('key')`
5. **Test**: Switch language in app

---

## QUICK REFERENCE: FILE EDIT CHECKLIST

- [ ] Read the file first to understand structure
- [ ] Check for dependent files
- [ ] Make changes following existing patterns
- [ ] Test changes in browser
- [ ] Test dark mode (add `dark` class)
- [ ] Test mobile (viewport < 640px)
- [ ] Check console for errors
- [ ] Verify no hardcoded values (use CSS variables)
- [ ] Update documentation if needed
- [ ] Commit changes with descriptive message

---

**Last Updated**: April 2026
**Total Files**: 40+
**Lines of Code**: 5000+
**Key Technologies**: Vanilla JS, Supabase, Vercel Functions, CSS3
