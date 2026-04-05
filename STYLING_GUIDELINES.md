# SENNA STYLING GUIDE — Vercel Design System
**Comprehensive Design Specifications for Consistent UI Implementation**

---

## QUICK START: DESIGN TOKENS

### Color Palette (Light Theme)
```css
/* Backgrounds */
--bg:    #f2f2f7   /* App background */
--surf:  #ffffff   /* Card/modal surface */
--surf2: #f2f2f7   /* Secondary surface, input backgrounds */

/* Borders */
--bdr:   #c8c8cd   /* Active/hover border */
--bdr2:  #e0e0e5   /* Default border */

/* Text */
--t1:    #1c1c1e   /* Primary text (99% contrast) */
--t2:    #636366   /* Secondary text (71% contrast) */
--tm:    #8e8e93   /* Muted text (51% contrast) */

/* Brand Colors */
--p:     #0d9488   /* Primary brand (teal) */
--p-h:   #0f766e   /* Primary hover state */
--p-l:   #ccfbf1   /* Primary light background tint */

/* Semantic Colors */
--red:   #ff3b30   /* Error/destructive */
--green: #34c759   /* Success */
--amber: #ff9500   /* Warning */
--blue:  #007aff   /* Info */

/* Shadows */
--sh1: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)
--sh2: 0 4px 16px rgba(0,0,0,.09)
--sh3: 0 8px 32px rgba(0,0,0,.13)

/* Spacing */
--r:  12px        /* Small border radius */
--r2: 16px        /* Medium border radius */
--rf: 9999px      /* Full/pill border radius */
```

### Color Palette (Dark Theme)
```css
/* Applied via html.dark selector */
--bg:   #0a0a0c    /* App background (near black) */
--surf: #1c1c1e    /* Surface (dark gray) */
--surf2: #2c2c2e   /* Secondary surface */

--bdr:  #48484a    /* Border */
--bdr2: #3a3a3c    /* Border secondary */

--t1: #f5f5f7      /* Text (white) */
--t2: #aeaeb2      /* Text secondary */
--tm: #7a7a82      /* Text muted */

/* Brand colors adjusted for dark */
--p-l: #0f3f3d     /* Primary tint (dark green) */
--p-h: #13b0a0     /* Primary lighter in dark */

/* Shadows darker */
--sh1: 0 1px 3px rgba(0,0,0,.5), 0 1px 2px rgba(0,0,0,.3)
--sh2: 0 4px 16px rgba(0,0,0,.6)
--sh3: 0 8px 32px rgba(0,0,0,.7)
```

---

## SPACING SYSTEM

### Base Unit: 4px
All spacing follows a 4px grid for consistency.

```css
/* Spacing Scale */
2px   /* .25 unit — very tight */
4px   /* .5 unit — tight spacing */
8px   /* 1 unit — default gap */
12px  /* 1.5 unit — comfortable spacing */
16px  /* 2 unit — standard section spacing */
20px  /* 2.5 unit — larger spacing */
24px  /* 3 unit — section separator */
32px  /* 4 unit — major spacing */
40px  /* 5 unit — page margins */
```

### Application Rules

**Gaps Between Elements** (use `gap` in flex/grid):
```css
gap: 4px    /* Inline elements (button + icon) */
gap: 8px    /* List items, form fields */
gap: 12px   /* Sections within a container */
gap: 16px   /* Major content sections */
gap: 24px   /* Page-level sections */
```

**Padding Inside Elements**:
```css
/* Small components (badges, small buttons) */
padding: 4px 8px

/* Standard buttons */
padding: 11px 16px  /* .6875rem 1rem */

/* Cards and containers */
padding: 22px  /* 1.375rem */

/* Page layouts */
padding: 28px 20px  /* 1.75rem 1.25rem */
```

**Margin Between Elements**:
```css
margin: 4px      /* Very tight */
margin: 8px      /* Tight */
margin: 12px     /* Comfortable */
margin: 16px     /* Standard */
margin: 24px     /* Large spacing */
```

---

## TYPOGRAPHY SYSTEM

### Font Stack
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, "Helvetica Neue",
             Arial, "Noto Sans Arabic", sans-serif;
```

**Why**: System fonts are preinstalled, load instantly, match OS design language

### Font Sizes

| Size | Value | Usage | Example |
|------|-------|-------|---------|
| XS | `.625rem` (10px) | Badges, tags | Status indicators |
| SM | `.75rem` (12px) | Small captions | Hints, timestamps |
| SM+ | `.8125rem` (13px) | Form hints | Error messages, helper text |
| BASE | `.875rem` (14px) | Form labels | "Email address", "Password" |
| BODY | `.9375rem` (15px) | Default size | Body copy, descriptions |
| BODY+ | `1rem` (16px) | Slightly larger body | Button text, nav items |
| LG | `1.125rem` (18px) | Section heads | Card titles, "Settings" |
| XL | `1.375rem` (22px) | Page titles | "Dashboard", "Profile" |

### Font Weights

```css
400 /* Regular */ — Body copy, descriptions, long text
500 /* Medium */  — Button text (sometimes), secondary headings
600 /* Semibold */ — Form labels, button text (primary), emphasis
700 /* Bold */    — Page titles, important text, strong emphasis
```

### Implementing Font Sizes

```css
/* Page heading */
.page-title {
  font-size: 1.375rem;     /* 22px */
  font-weight: 700;
  color: var(--t1);
  margin-bottom: 1.5rem;
  line-height: 1.2;
}

/* Section heading */
.section-title {
  font-size: 1.125rem;     /* 18px */
  font-weight: 600;
  color: var(--t1);
  margin-bottom: 1rem;
}

/* Form label */
.form-label {
  font-size: .875rem;      /* 14px */
  font-weight: 600;
  color: var(--t1);
  margin-bottom: .25rem;
  letter-spacing: -.005em;
}

/* Body text */
.body-text {
  font-size: .9375rem;     /* 15px */
  font-weight: 400;
  color: var(--t2);
  line-height: 1.6;
}

/* Small helper text */
.helper-text {
  font-size: .8125rem;     /* 13px */
  font-weight: 400;
  color: var(--tm);
  margin-top: .25rem;
}
```

### Line Height Guidelines

```css
1     /* Single line — buttons, labels, inline text */
1.2   /* Headings — slight breathing room */
1.4   /* Short text — form fields, captions */
1.5   — DEFAULT (body text)
1.6   /* Long-form — accessibility, readability */
```

---

## BUTTON SYSTEM

### Button Variants

#### 1. **Primary** (`.btn-p`)
```css
/* Usage: Main actions, next step, submit forms */
background: var(--p)         /* Teal #0d9488 */
color: #fff
box-shadow: 0 4px 12px rgba(13,148,136,.28)

/* Hover */
background: var(--p-h)       /* Darker teal #0f766e */
box-shadow: 0 8px 20px rgba(13,148,136,.38)
transform: translateY(-1px)  /* Lift effect */

/* Active */
transform: scale(.97)        /* Pressed effect */
```

**Example**:
```html
<button class="btn btn-p btn-md">Submit Application</button>
```

#### 2. **Secondary** (`.btn-s`)
```css
/* Usage: Less important actions, cancel, alternatives */
background: var(--surf)      /* White */
color: var(--t1)             /* Dark text */
border: 1.5px solid var(--bdr2)
box-shadow: 0 2px 6px rgba(0,0,0,.06)

/* Hover */
background: var(--surf2)     /* Light gray */
border-color: var(--bdr)
box-shadow: 0 4px 12px rgba(0,0,0,.1)
transform: translateY(-1px)
```

**Example**:
```html
<button class="btn btn-s btn-md">Cancel</button>
```

#### 3. **Ghost** (`.btn-g`)
```css
/* Usage: Tertiary actions, links, minimal emphasis */
background: transparent
color: var(--tm)

/* Hover */
background: rgba(0,0,0,.05)  /* Subtle highlight */
color: var(--t1)
```

**Example**:
```html
<button class="btn btn-g">Learn More</button>
```

#### 4. **Destructive** (`.btn-d`)
```css
/* Usage: Delete, remove, dangerous actions */
background: var(--red)       /* #ff3b30 */
color: #fff
box-shadow: 0 4px 12px rgba(255,59,48,.28)

/* Hover */
background: #ff453a          /* Lighter red */
box-shadow: 0 8px 20px rgba(255,59,48,.38)
transform: translateY(-1px)
```

**Example**:
```html
<button class="btn btn-d btn-md">Delete Account</button>
```

#### 5. **Success** (`.btn-ok`)
```css
/* Usage: Confirm, approve, positive actions */
background: var(--green)     /* #34c759 */
color: #fff
box-shadow: 0 4px 12px rgba(52,199,89,.28)

/* Hover */
background: #30d158          /* Lighter green */
box-shadow: 0 8px 20px rgba(52,199,89,.38)
```

**Example**:
```html
<button class="btn btn-ok btn-md">Approve</button>
```

#### 6. **Tertiary/Link** (`.btn-tl`)
```css
/* Usage: Secondary navigation, info links */
background: #0891b2          /* Cyan */
color: #fff
box-shadow: 0 4px 12px rgba(8,145,178,.28)

/* Hover */
background: #0e7490
```

**Example**:
```html
<button class="btn btn-tl btn-sm">Learn About Claims</button>
```

### Button Sizes

#### 1. **Small** (`.btn-sm`)
```css
padding: .4375rem .9375rem    /* 7px × 15px */
font-size: .8125rem           /* 13px */
border-radius: 9px

/* Use for**: Compact layouts, secondary actions, table buttons */
```

**Example**:
```html
<button class="btn btn-s btn-sm">Edit</button>
```

#### 2. **Medium** (`.btn-md`) — DEFAULT
```css
padding: .6875rem 1.25rem     /* 11px × 20px */
font-size: .9375rem           /* 15px */
border-radius: 11px

/* Use for**: Primary buttons, main actions, form submission */
```

**Example**:
```html
<button class="btn btn-p btn-md">Save Changes</button>
```

#### 3. **Icon** (`.btn-icon`)
```css
padding: .5rem                /* 8px on all sides */
border-radius: 9px

/* Use for**: Icon-only buttons, toolbar buttons */
```

**Example**:
```html
<button class="btn btn-icon">🔍</button>
```

#### 4. **Full Width** (`.btn-full`)
```css
width: 100%

/* Use for**: Mobile-optimized buttons, form submissions */
```

**Example**:
```html
<button class="btn btn-p btn-md btn-full">Sign Up</button>
```

### Button States

#### Disabled
```css
.btn:disabled {
  opacity: .45                /* Dimmed out */
  cursor: not-allowed
  pointer-events: none        /* Not clickable */
}
```

#### Focus (Keyboard Navigation)
```css
.btn:focus-visible {
  outline: 2px solid var(--p)
  outline-offset: 2px
}
```

#### Loading State (Custom)
```javascript
button.disabled = true
button.innerHTML = '<div class="spin-btn"></div> Loading...'
button.classList.add('is-loading')

// CSS for spinner
.spin-btn {
  width: .9375rem
  height: .9375rem
  border: 2px solid currentColor
  border-top-color: transparent
  border-radius: 50%
  animation: spin .6s linear infinite
}
```

### Button Combinations

```html
<!-- Primary with icon -->
<button class="btn btn-p btn-md">
  <svg class="icon-sm"><!-- icon --></svg>
  Submit Application
</button>

<!-- Button group -->
<div class="flex gap-2">
  <button class="btn btn-p btn-md">Save</button>
  <button class="btn btn-s btn-md">Cancel</button>
</div>

<!-- Mobile full-width -->
<button class="btn btn-p btn-md btn-full">Next Step</button>
```

---

## INPUT & FORM SYSTEM

### Input Field Styles

```css
.inp, .sel, .ta {
  width: 100%
  padding: .6875rem 1rem           /* 11px × 16px */
  border-radius: 10px
  background: var(--surf)
  border: 1.5px solid var(--bdr2)
  color: var(--t1)
  font-family: inherit
  font-size: .9375rem              /* 15px */
  outline: none
  transition: border-color .22s, box-shadow .22s, background .18s
}
```

### Input States

#### Default
```css
background: var(--surf)      /* White */
border: 1.5px solid var(--bdr2)   /* Light gray */
color: var(--t1)
```

#### Hover
```css
.inp:hover:not(:focus) {
  border-color: var(--bdr)   /* Darker border */
}
```

#### Focus
```css
.inp:focus {
  border-color: var(--p)     /* Brand color */
  box-shadow: 0 0 0 4px rgba(13,148,136,.14)  /* Subtle ring */
  background: var(--surf)    /* Maintain background */
}
```

#### Error
```css
.inp.err {
  border-color: var(--red)
  box-shadow: 0 0 0 4px rgba(255,59,48,.11)  /* Red tint */
}
```

#### Disabled
```css
.inp:disabled {
  opacity: .5
  cursor: not-allowed
  background: var(--surf2)
}
```

### Form Labels

```css
.lbl {
  font-size: .875rem          /* 14px */
  font-weight: 600
  color: var(--t1)
  letter-spacing: -.005em     /* Tighter tracking */
  margin-bottom: .25rem       /* 4px spacing to input */
  display: block
}

/* Required indicator */
.lbl .req {
  color: var(--red)
  margin-left: 3px
  font-weight: 700
}
```

**Example**:
```html
<label class="lbl">
  Email <span class="req">*</span>
</label>
<input type="email" class="inp" />
```

### Form Hints & Errors

```css
/* Helper text (below input) */
.fhint {
  font-size: .8125rem         /* 13px */
  color: var(--tm)
  margin-top: 3px
}

/* Error message */
.ferr {
  font-size: .8125rem         /* 13px */
  color: var(--red)
  margin-top: 4px
  font-weight: 500
  line-height: 1.4
}
```

**Example**:
```html
<div class="fg">
  <label class="lbl">Password</label>
  <input type="password" class="inp err" />
  <div class="ferr">Password must be at least 8 characters</div>
</div>

<div class="fg">
  <label class="lbl">Phone Number</label>
  <input type="tel" class="inp" />
  <div class="fhint">Include country code (e.g., +20 100 123 4567)</div>
</div>
```

### Form Group Wrapper

```css
.fg {
  display: flex
  flex-direction: column
  gap: .5rem           /* 8px */
}
```

**Example**:
```html
<div class="fg">
  <label class="lbl">Full Name</label>
  <input type="text" class="inp" />
</div>
```

### Input with Icon

```css
.inp-with-icon {
  padding-left: 2.25rem        /* Space for left icon */
  padding-right: 1rem
}

.inp-icon {
  position: absolute
  left: .75rem
  top: 50%
  transform: translateY(-50%)
  color: var(--tm)
  pointer-events: none
}
```

**Example**:
```html
<div style="position: relative">
  <span class="inp-icon">📧</span>
  <input type="email" class="inp inp-with-icon" />
</div>
```

### Textarea

```css
.ta {
  resize: vertical
  min-height: 100px
  line-height: 1.6
  /* Inherits .inp styling */
}
```

### Select Dropdown

```css
.sel {
  appearance: none                    /* Remove native styling */
  cursor: pointer
  padding-right: 2.5rem               /* Space for arrow */
  /* Inherits .inp styling */
}

.sel-w {
  position: relative
}

.sel-w::after {
  content: ""
  position: absolute
  top: 50%
  right: 1rem
  transform: translateY(-50%)
  width: 5px
  height: 5px
  border-left: 3px solid transparent
  border-right: 3px solid transparent
  border-top: 4px solid var(--tm)
  pointer-events: none
}
```

**Example**:
```html
<div class="sel-w">
  <select class="sel">
    <option>Select an option</option>
    <option>Option 1</option>
    <option>Option 2</option>
  </select>
</div>
```

---

## CARDS & CONTAINERS

### Card Component

```css
.card {
  background: var(--surf)
  border: 1px solid var(--bdr2)
  border-radius: var(--r2)             /* 16px */
  padding: 1.375rem                    /* 22px */
  box-shadow: var(--sh1)
  transition: box-shadow .25s, border-color .22s, transform .22s
  animation: scaleIn .2s ease both
}

/* Hover state */
.card:hover {
  box-shadow: var(--sh2)               /* Elevated shadow */
  border-color: var(--p-l)             /* Teal tint */
  transform: translateY(-2px)          /* Lift up */
}
```

**Mobile Adjustment**:
```css
@media (max-width: 640px) {
  .card {
    padding: 1.125rem                  /* 18px on mobile */
  }
}
```

**Example**:
```html
<div class="card">
  <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem;">
    Doctor Profile
  </h3>
  <p style="color: var(--t2);">
    Update your medical credentials and contact information
  </p>
</div>
```

### Page Container

```css
.page-wrap {
  max-width: 960px
  margin: 0 auto
  padding: 1.75rem 1.25rem            /* 28px × 20px */
  animation: pageIn .25s ease both
}

@media (max-width: 640px) {
  .page-wrap {
    padding: 1.25rem 1rem              /* 20px × 16px on mobile */
  }
}
```

### Page Center (Full Height)

```css
.page-center {
  min-height: calc(100vh - 52px)       /* Minus navbar */
  display: flex
  align-items: center
  justify-content: center
  padding: 2rem 1.25rem 5rem           /* Top, sides, bottom (for nav) */
}
```

---

## NAVBAR & NAVIGATION

### Top Navbar

```css
.nb {
  height: var(--nb-h)                  /* 52px */
  background: rgba(255,255,255,.92)
  border-bottom: 1px solid var(--bdr2)
  display: flex
  align-items: center
  padding: 0 1.25rem
  backdrop-filter: blur(20px) saturate(1.6)
  position: fixed
  top: 0
  left: 0
  right: 0
  z-index: 50
}

html.dark .nb {
  background: rgba(28,28,30,.92)
}

/* Navbar title */
.nb-center {
  display: flex
  align-items: center
  gap: .4rem
  font-size: 1rem
  font-weight: 700
  color: var(--t1)
  letter-spacing: -.02em
}
```

**Example**:
```html
<div id="nb" class="nb">
  <div class="nb-inner">
    <div class="nb-center">
      <svg class="icon-md"><!-- logo --></svg>
      <span>SENNA</span>
    </div>
  </div>
</div>
```

### Bottom Navigation Pill

```css
.bnav-pill {
  display: flex
  align-items: center
  flex: 1
  max-width: 340px
  background: rgba(255,255,255,.96)
  border: 1px solid rgba(0,0,0,.07)
  border-radius: 2rem                  /* Full pill */
  padding: .4375rem                    /* 7px padding */
  box-shadow: 0 8px 32px rgba(0,0,0,.13)
  backdrop-filter: blur(24px)
  overflow: hidden
  transition: box-shadow .3s, border-color .3s

  position: relative
}

/* Animated track behind items */
.bnav-pill-track {
  position: absolute
  z-index: 0
  background: linear-gradient(135deg, var(--p), color-mix(in srgb, var(--p) 70%, var(--p-l)))
  border-radius: 1.5rem
  transition: left .34s cubic-bezier(.22,1,.36,1)
  box-shadow: 0 2px 10px rgba(13,148,136,.3)
}
```

### Bottom Navigation Items

```css
.bnav-item {
  position: relative
  z-index: 1
  flex: 1
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  gap: .2rem
  padding: .6rem .5rem
  border-radius: 1.5rem
  color: var(--tm)
  font-size: .625rem               /* 10px */
  font-weight: 600
  text-transform: uppercase
  cursor: pointer
  transition: all .28s cubic-bezier(.22,1,.36,1)
  user-select: none
}

/* Hover state */
.bnav-item:hover:not(.active) {
  color: var(--p)
  transform: translateY(-2px)
}

.bnav-item:hover:not(.active) svg {
  transform: scale(1.1)
}

/* Active/selected state */
.bnav-item.active {
  color: #fff
  transform: scale(1.04) translateY(-1px)
  font-weight: 700
}

.bnav-item.active svg {
  filter: drop-shadow(0 1px 3px rgba(0,0,0,.2))
}
```

---

## SHADOWS & ELEVATION

### Shadow System (Hierarchy)

```css
/* 1. Default card shadow — subtle, barely visible */
--sh1: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)
/* Use for**: Cards, inputs, default surface state */

/* 2. Elevated shadow — noticeable lift */
--sh2: 0 4px 16px rgba(0,0,0,.09)
/* Use for**: Hover states, modals, floating elements */

/* 3. Strong shadow — maximum elevation */
--sh3: 0 8px 32px rgba(0,0,0,.13)
/* Use for**: Dropdowns, menus, critical overlays */
```

### Custom Shadows

```css
/* Button primary shadow */
box-shadow: 0 4px 12px rgba(13,148,136,.28)

/* Button hover shadow */
box-shadow: 0 8px 20px rgba(13,148,136,.38)

/* Icon drop shadow (on colored backgrounds) */
filter: drop-shadow(0 1px 3px rgba(0,0,0,.2))

/* Text shadow (rare, use cautiously) */
text-shadow: 0 1px 2px rgba(0,0,0,.1)
```

### Elevation Layers

| Elevation | Shadow | Use Case |
|-----------|--------|----------|
| 0 (Base) | none | Neutral background, base surface |
| 1 | `--sh1` | Cards, inputs, default state |
| 2 | `--sh2` | Hover, floating, interactive |
| 3 | `--sh3` | Modals, dropdowns, top-most |

---

## ANIMATIONS & TRANSITIONS

### Timing & Easing

```css
/* UI Interactions (buttons, inputs, small changes) */
.22s - .25s
cubic-bezier(.22,1,.36,1)     /* Spring-like easing */

/* Navigation & Layout (nav items, slides) */
.28s - .34s
cubic-bezier(.22,1,.36,1)

/* Page Transitions (full page in/out) */
.2s - .25s
cubic-bezier(.25,.46,.45,.94) /* Smooth deceleration */

/* Subtle Animations (pulse, fade) */
.6s
linear                         /* Smooth, constant rate */
```

### Keyframe Library

```css
/* Fade in/out */
@keyframes fadeIn {
  from { opacity: 0 }
  to { opacity: 1 }
}

@keyframes fadeOut {
  from { opacity: 1 }
  to { opacity: 0 }
}

/* Slide animations */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px) }
  to { opacity: 1; transform: translateY(0) }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-12px) }
  to { opacity: 1; transform: translateY(0) }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-12px) }
  to { opacity: 1; transform: translateX(0) }
}

/* Scale animations */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(.95) }
  to { opacity: 1; transform: scale(1) }
}

@keyframes springBounce {
  0% { opacity: 0; transform: scale(.8) }
  50% { transform: scale(1.05) }
  100% { opacity: 1; transform: scale(1) }
}

/* Continuous animations */
@keyframes pulse {
  0%,100% { opacity: 1 }
  50% { opacity: .6 }
}

@keyframes spin {
  to { transform: rotate(360deg) }
}

@keyframes bounce {
  0%,100% { transform: translateY(0) }
  50% { transform: translateY(-4px) }
}
```

### Usage Examples

```css
/* Page entry animation */
.page-wrap {
  animation: pageIn .25s cubic-bezier(.25,.46,.45,.94) both
}

/* Card hover with smooth easing */
.card {
  transition: transform .25s cubic-bezier(.22,1,.36,1),
              box-shadow .25s cubic-bezier(.22,1,.36,1)
}

.card:hover {
  transform: translateY(-2px)
  box-shadow: var(--sh2)
}

/* Loading spinner */
.spin-btn {
  animation: spin .6s linear infinite
}

/* Pulse effect for notifications */
.notification {
  animation: pulse 2s ease-in-out infinite
}
```

---

## RESPONSIVE DESIGN

### Breakpoints

```css
/* Mobile first — default styles for mobile */
/* No media query needed for mobile */

/* Tablet & up */
@media (min-width: 768px) {
  /* Larger fonts, adjusted spacing */
}

/* Desktop & up */
@media (min-width: 1024px) {
  /* Multi-column layouts, max-widths */
}

/* Mobile & down */
@media (max-width: 640px) {
  /* Stack layouts, smaller spacing, touch-optimized */
}
```

### Mobile-First Guidelines

```css
/* Default: Mobile styles */
.card {
  padding: 1.125rem       /* 18px on mobile */
}

/* Tablet */
@media (min-width: 768px) {
  .card {
    padding: 1.375rem     /* 22px on tablet+ */
  }
}

/* Touch targets */
.btn, .bnav-item {
  min-height: 44px        /* Apple touch target minimum */
  min-width: 44px
}

/* Safe area (notches, home indicators) */
padding: env(safe-area-inset-bottom, 0px)
```

---

## DARK MODE IMPLEMENTATION

### Enabling Dark Mode

```javascript
// Detect system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

// Or toggle manually
function applyTheme(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// On user preference change
if (localStorage.getItem('theme') === 'dark') {
  applyTheme(true)
}
```

### CSS Variables in Dark Mode

```css
html.dark {
  --bg: #0a0a0c                 /* Near black background */
  --surf: #1c1c1e                /* Dark gray surfaces */
  --surf2: #2c2c2e               /* Slightly lighter gray */
  
  --bdr: #48484a                 /* Lighter border for visibility */
  --bdr2: #3a3a3c
  
  --t1: #f5f5f7                  /* White text */
  --t2: #aeaeb2                  /* Light gray text */
  --tm: #7a7a82                  /* Muted gray */
  
  --p-l: #0f3f3d                 /* Dark teal tint */
  --p-h: #13b0a0                 /* Lighter teal for buttons */
  
  --sh1: 0 1px 3px rgba(0,0,0,.5), 0 1px 2px rgba(0,0,0,.3)
  --sh2: 0 4px 16px rgba(0,0,0,.6)
  --sh3: 0 8px 32px rgba(0,0,0,.7)
}
```

### Component Adjustments for Dark Mode

```css
/* Navbar in dark mode */
html.dark .nb {
  background: rgba(28,28,30,.92)
  border-color: rgba(255,255,255,.1)
}

/* Button hover in dark mode */
html.dark .btn-p:hover {
  box-shadow: 0 8px 20px rgba(13,148,136,.4)
}

/* Text contrast in dark mode */
html.dark .body-text {
  color: var(--t2)               /* Lighter gray for readability */
}
```

---

## ACCESSIBILITY GUIDELINES

### Color Contrast

```css
/* WCAG AA minimum: 4.5:1 for body text */
color: var(--t1)       /* 99% contrast on light bg */
color: var(--t2)       /* 71% contrast — acceptable for secondary */

/* WCAG AAA: 7:1 */
color: var(--t1)       /* Primary text meets AAA */

/* Avoid relying on color alone */
/* Use text labels, icons, or patterns */
```

### Focus Management

```css
/* Visible focus indicators */
.btn:focus-visible {
  outline: 2px solid var(--p)
  outline-offset: 2px
}

/* Skip keyboard focus on mobile */
@media (hover: none) {
  *:focus-visible {
    outline: none
  }
}
```

### Text Sizing

```css
/* Readable default size */
font-size: .9375rem           /* 15px — larger than typical web default */

/* Line height for readability */
line-height: 1.6              /* Generous spacing */

/* Avoid small text */
font-size: .8125rem           /* Minimum for body text */
```

### ARIA Attributes

```html
<!-- Button describing action -->
<button aria-label="Approve doctor application">
  <svg><!-- icon --></svg>
</button>

<!-- Loading state -->
<button disabled aria-busy="true">
  <span class="spinner"></span> Loading...
</button>

<!-- Dialog/Modal -->
<dialog role="alertdialog" aria-labelledby="modal-title">
  <h2 id="modal-title">Confirm Action</h2>
</dialog>
```

---

## COMMON PATTERNS

### Pattern 1: Form with Validation

```html
<form class="page-wrap">
  <h1 style="font-size: 1.375rem; font-weight: 700; margin-bottom: 2rem;">
    Doctor Registration
  </h1>

  <div class="fg">
    <label class="lbl">
      Full Name <span class="req">*</span>
    </label>
    <input type="text" class="inp" placeholder="Your full name" required />
  </div>

  <div class="fg">
    <label class="lbl">
      Email <span class="req">*</span>
    </label>
    <input type="email" class="inp err" />
    <div class="ferr">Please enter a valid email address</div>
  </div>

  <div class="fg">
    <label class="lbl">University</label>
    <div class="sel-w">
      <select class="sel">
        <option>Select university...</option>
        <option>Cairo University</option>
        <option>Ain Shams University</option>
      </select>
    </div>
  </div>

  <button type="submit" class="btn btn-p btn-md btn-full" style="margin-top: 2rem;">
    Create Account
  </button>
</form>
```

### Pattern 2: Card Grid

```html
<div class="page-wrap">
  <h2 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1.5rem;">
    Recent Applications
  </h2>

  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
    <div class="card">
      <h3 style="font-weight: 600; margin-bottom: .5rem;">Dr. Ahmed Hassan</h3>
      <p style="color: var(--t2); margin-bottom: 1rem; font-size: .9375rem;">
        Cairo University • Pending Approval
      </p>
      <div style="display: flex; gap: .5rem;">
        <button class="btn btn-ok btn-sm">Approve</button>
        <button class="btn btn-d btn-sm">Reject</button>
      </div>
    </div>
  </div>
</div>
```

### Pattern 3: Modal Dialog

```html
<div class="mbk" style="display: flex; align-items: center; justify-content: center;">
  <div class="card" style="max-width: 420px;">
    <h2 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem;">
      Confirm Deletion
    </h2>
    <p style="color: var(--t2); margin-bottom: 1.5rem; line-height: 1.6;">
      This action cannot be undone. All associated data will be permanently deleted.
    </p>
    <div style="display: flex; gap: .75rem;">
      <button class="btn btn-s btn-md" style="flex: 1;">Cancel</button>
      <button class="btn btn-d btn-md" style="flex: 1;">Delete</button>
    </div>
  </div>
</div>
```

### Pattern 4: Top Navigation with Content

```html
<div id="nb" class="nb">
  <div class="nb-inner">
    <div class="nb-center">
      <svg class="icon-md"><!-- icon --></svg>
      <span>Dashboard</span>
    </div>
  </div>
</div>

<div style="padding-top: var(--nb-h); min-height: 100vh;">
  <div class="page-wrap">
    <!-- Main content here -->
  </div>
</div>
```

---

## FIXING COMMON STYLING ISSUES

### Issue: Buttons not aligned with icons

**Problem**: Icon and text not centered
```css
/* Fix */
.btn {
  display: inline-flex      /* NOT inline-block */
  align-items: center       /* Vertical centering */
  justify-content: center   /* Horizontal centering */
  gap: .375rem              /* Space between icon and text */
}
```

### Issue: Input field focus ring not visible

**Problem**: Focus state missing
```css
/* Fix */
.inp:focus {
  border-color: var(--p)
  box-shadow: 0 0 0 4px rgba(13,148,136,.14)
  outline: none              /* Remove default outline */
}
```

### Issue: Form labels colliding with inputs

**Problem**: Missing spacing
```css
/* Fix */
.fg {
  gap: .5rem                 /* Add gap between label and input */
}

.lbl {
  margin-bottom: .25rem      /* Reduce if still too much */
}
```

### Issue: Cards not responsive on mobile

**Problem**: Fixed width
```css
/* Fix */
.card {
  width: auto                /* Remove fixed width */
  max-width: 100%            /* Use full available space */
}

@media (max-width: 640px) {
  .card {
    padding: 1.125rem        /* Reduce padding on mobile */
  }
}
```

### Issue: Bottom nav items overlapping content

**Problem**: Missing bottom padding
```css
/* Fix */
body.has-bnav #app {
  padding-bottom: calc(var(--bn-h) + 1.5rem)
}
```

### Issue: Dark mode text not readable

**Problem**: Wrong color variable
```css
/* Fix */
html.dark .body-text {
  color: var(--t2)           /* NOT var(--t1) for body copy */
  /* --t1 is for headings in dark mode */
}
```

---

## IMPLEMENTATION CHECKLIST

When building a new page or component, ensure:

- [ ] Uses correct CSS variables for colors (no hardcoded hex)
- [ ] Follows spacing scale (4px units)
- [ ] Button sizes match design (sm/md/full)
- [ ] Form labels have proper font weight & size
- [ ] Focus states visible (2px outline)
- [ ] Mobile responsive (stacking layout on mobile)
- [ ] Dark mode support (test with `html.dark` class)
- [ ] Shadows match hierarchy (--sh1/--sh2/--sh3)
- [ ] Animations use correct timing (.22s - .34s)
- [ ] Touch targets ≥ 44px on mobile
- [ ] Text contrast ≥ 4.5:1 (WCAG AA)
- [ ] No horizontal scroll on mobile
- [ ] Loading states show spinner
- [ ] Error states clear & actionable
- [ ] RTL support (test Arabic text direction)

---

## QUICK COPY-PASTE SNIPPETS

### Default Button
```html
<button class="btn btn-p btn-md">Save Changes</button>
```

### Form Field
```html
<div class="fg">
  <label class="lbl">Label Text</label>
  <input type="text" class="inp" placeholder="..." />
  <div class="fhint">Helper text</div>
</div>
```

### Card
```html
<div class="card">
  <h3>Title</h3>
  <p>Content here</p>
</div>
```

### Page Layout
```html
<div class="page-wrap">
  <h1>Page Title</h1>
  <!-- Content -->
</div>
```

---

**Last Updated**: April 2026 | **Vercel Design System v2.0**
