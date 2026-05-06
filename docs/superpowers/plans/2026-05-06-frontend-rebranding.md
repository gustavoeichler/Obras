# Frontend Rebranding — Dark Slate Corporate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand Obras frontend from "technical blueprint navy" to "dark-slate corporate construction brand" — same dark theme, professional typography, refined colors, no decorative grid textures.

**Architecture:** CSS-first. All token changes flow from `:root` in `index.css` (2290 lines of global CSS). Two JSX components need targeted inline-style extraction. No new dependencies except swapping the Google Fonts CDN import. Six sequential phases, each independently shippable.

**Tech Stack:** React 18, Vite, plain CSS custom properties (no preprocessor), Google Fonts CDN, Lucide React.

---

## File Map

| File | What changes |
|---|---|
| `frontend/index.html` | Replace Google Fonts CDN link (Anton+Barlow → Plus Jakarta Sans+Inter) |
| `frontend/src/index.css` | All design token values, typography rules, component styles (all 6 phases) |
| `frontend/src/components/StageCompletionCard.jsx` | Extract status-box inline styles → CSS classes |
| `frontend/src/pages/Budget.jsx` | Extract status-coloring inline styles → CSS classes |

---

## Task 1 — Phase 1: Update Google Fonts

**Files:**
- Modify: `frontend/index.html:12`

> CSS-only work — no test file. Verification is visual in browser.

- [ ] **Step 1: Replace the font CDN link in index.html**

  Find lines 9–14 (the preconnect + font link block) and replace with:

  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
    rel="stylesheet"
  />
  ```

  Also update `<meta name="theme-color" content="#f0b429" />` on line 6 to:
  ```html
  <meta name="theme-color" content="#d4a017" />
  ```

- [ ] **Step 2: Verify fonts load**

  Run `npm run dev` inside `frontend/` (or use Docker: `docker-compose up`).  
  Open `http://localhost:5173`. Open DevTools → Network → filter "fonts.gstatic.com".  
  Expected: requests for PlusJakartaSans and Inter woff2 files appear (not Anton/Barlow).

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/index.html
  git commit -m "rebrand: swap Google Fonts to Plus Jakarta Sans + Inter"
  ```

---

## Task 2 — Phase 1: Design Tokens + Remove Body Textures

**Files:**
- Modify: `frontend/src/index.css:5-71` and `frontend/src/index.css:119-198`

- [ ] **Step 1: Replace the `:root` token block (lines 5–35)**

  Replace the entire `:root { ... }` block with:

  ```css
  :root {
    --bg:          #0f1117;
    --surface:     #161b22;
    --surface-2:   #1c2128;
    --surface-3:   #21262d;
    --accent:      #d4a017;
    --accent-glow: rgba(212, 160, 23, 0.15);
    --accent-dim:  rgba(212, 160, 23, 0.08);
    --text:        #e6edf3;
    --text-muted:  #7d8590;
    --text-dim:    #3d444d;
    --border:      #21262d;
    --border-2:    #30363d;
    --green:       #10b981;
    --green-dim:   rgba(16, 185, 129, 0.12);
    --red:         #f43f5e;
    --red-dim:     rgba(244, 63, 94, 0.12);
    --orange:      #fb923c;
    --orange-dim:  rgba(251, 146, 60, 0.12);
    --blue:        #60a5fa;
    --blue-dim:    rgba(96, 165, 250, 0.12);

    --font-display: 'Plus Jakarta Sans', sans-serif;
    --font-mono:    'IBM Plex Mono', monospace;
    --font-ui:      'Inter', sans-serif;

    --radius:    6px;
    --radius-lg: 12px;
    --sidebar-w: 240px;
    --transition: 160ms ease;

    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.6);

    --lh-tight: 1.2;
    --lh-base:  1.5;
    --lh-loose: 1.7;

    --space-page-mobile: 16px;
  }
  ```

- [ ] **Step 2: Remove the blueprint grid (body::before) and vignette (body::after)**

  Delete lines 50–71 entirely — the two pseudo-element blocks:

  ```css
  /* Blueprint grid background */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(240, 180, 41, 0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(240, 180, 41, 0.025) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
  }

  /* Vignette overlay */
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 40%, rgba(5, 10, 20, 0.7) 100%);
    pointer-events: none;
    z-index: 0;
  }
  ```

- [ ] **Step 3: Remove the sidebar grid texture (sidebar::after, lines ~119–128)**

  Delete the `/* subtle blueprint grid on the rail itself */` comment and `.sidebar::after { ... }` block:

  ```css
  /* subtle blueprint grid on the rail itself */
  .sidebar::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(240, 180, 41, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(240, 180, 41, 0.03) 1px, transparent 1px);
    background-size: 24px 24px;
    pointer-events: none;
  }
  ```

- [ ] **Step 4: Remove the sidebar brand crosshair (sidebar-brand::after, lines ~191–198)**

  Delete the `/* tiny blueprint crosshair in corner */` comment and `.sidebar-brand::after { ... }` block:

  ```css
  /* tiny blueprint crosshair in corner */
  .sidebar-brand::after {
    content: '';
    position: absolute;
    right: 14px; top: 14px;
    width: 10px; height: 10px;
    border-top: 1px solid rgba(240, 180, 41, 0.4);
    border-right: 1px solid rgba(240, 180, 41, 0.4);
  }
  ```

- [ ] **Step 5: Update the sidebar background gradient**

  Find `.sidebar { ... }` and update `background:` line from:
  ```css
  background: linear-gradient(180deg, var(--surface) 0%, #0a1220 100%);
  ```
  To:
  ```css
  background: var(--surface);
  ```

- [ ] **Step 6: Update sidebar::before amber capline accent color reference**

  The capline references the old `--accent` (now updated via :root), so no change needed — it inherits correctly.

  Also update `.brand-tag` border color (line ~168) from hardcoded `rgba(240, 180, 41, 0.35)` to `rgba(212, 160, 23, 0.35)` and background from `rgba(240, 180, 41, 0.05)` to `rgba(212, 160, 23, 0.05)`.

  And `.brand-name` text-shadow (line ~179): change `rgba(240, 180, 41, 0.15)` to `rgba(212, 160, 23, 0.10)`.

  And `.user-avatar` box-shadow (line ~399): change `rgba(240, 180, 41, 0.15)` to `rgba(212, 160, 23, 0.12)`.

  And `.readout-value` text-shadow (line ~348): change `rgba(240, 180, 41, 0.18)` to `rgba(212, 160, 23, 0.12)`.

- [ ] **Step 7: Update modal overlay background**

  Find `.modal-overlay { ... }` and change:
  ```css
  background: rgba(5, 10, 20, 0.85);
  ```
  To:
  ```css
  background: rgba(0, 0, 0, 0.75);
  ```

- [ ] **Step 8: Verify in browser**

  Open `http://localhost:5173`.  
  Expected:
  - Page background is dark slate (neutral gray-black), not navy blue
  - No grid lines visible anywhere on body or sidebar
  - Sidebar is flat dark, no gradient to near-black
  - Accent elements (active nav link, buttons) show muted gold vs. neon yellow

- [ ] **Step 9: Commit**

  ```bash
  git add frontend/src/index.css
  git commit -m "rebrand: update design tokens to dark slate palette, remove blueprint textures"
  ```

---

## Task 3 — Phase 2: Typography

**Files:**
- Modify: `frontend/src/index.css` (typography rules scattered through the file)

- [ ] **Step 1: Update the `.font-display` helper class**

  Find:
  ```css
  .font-display { font-family: var(--font-display); letter-spacing: 0.03em; }
  ```
  Replace with:
  ```css
  .font-display { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.01em; }
  ```

- [ ] **Step 2: Update `.page-title` and `.page-subtitle`**

  Find the `.page-title` block:
  ```css
  .page-title {
    font-family: var(--font-display);
    font-size: 42px;
    letter-spacing: 0.04em;
    line-height: 1;
    color: var(--text);
  }
  ```
  Replace with:
  ```css
  .page-title {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: var(--lh-tight);
    color: var(--text);
  }
  ```

  Find `.page-subtitle`:
  ```css
  .page-subtitle {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 6px;
    letter-spacing: 0.06em;
  }
  ```
  Replace with:
  ```css
  .page-subtitle {
    font-family: var(--font-ui);
    font-size: 15px;
    font-weight: 400;
    color: var(--text-muted);
    margin-top: 6px;
    line-height: var(--lh-base);
  }
  ```

- [ ] **Step 3: Update `.page-header` bottom margin**

  Find:
  ```css
  .page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 32px;
    gap: 16px;
  }
  ```
  Change `margin-bottom: 32px` to `margin-bottom: 28px`.

- [ ] **Step 4: Update `.brand-name` typography**

  Find:
  ```css
  .sidebar-brand .brand-name {
    font-family: var(--font-display);
    font-size: 34px;
    letter-spacing: 0.06em;
    color: var(--text);
    line-height: 1;
    text-shadow: 0 0 24px rgba(240, 180, 41, 0.15);
  }
  ```
  Replace with:
  ```css
  .sidebar-brand .brand-name {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text);
    line-height: 1;
  }
  ```

  Also update the mobile override at `@media (max-width: 767px)`:
  ```css
  .sidebar-brand .brand-name { font-size: 34px; letter-spacing: 0.06em; }
  ```
  Replace with:
  ```css
  .sidebar-brand .brand-name { font-size: 26px; letter-spacing: -0.02em; }
  ```

  And at `@media (max-width: 960px)`:
  ```css
  .sidebar-brand .brand-name { font-size: 18px; letter-spacing: 0.04em; }
  ```
  Replace with:
  ```css
  .sidebar-brand .brand-name { font-size: 16px; letter-spacing: -0.01em; }
  ```

- [ ] **Step 5: Update `.card-title`**

  Find:
  ```css
  .card-title {
    font-size: 12px;
    font-family: var(--font-mono);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  ```
  Replace with:
  ```css
  .card-title {
    font-size: 13px;
    font-family: var(--font-ui);
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0;
  }
  ```

- [ ] **Step 6: Update `.stat-label` and `.stat-value` typography**

  Find:
  ```css
  .stat-card .stat-label {
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 6px;
  }
  ```
  Replace with:
  ```css
  .stat-card .stat-label {
    font-size: 12px;
    font-family: var(--font-ui);
    font-weight: 500;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  ```

  Find:
  ```css
  .stat-card .stat-value {
    font-family: var(--font-display);
    font-size: 32px;
    letter-spacing: 0.02em;
    line-height: 1;
    color: var(--text);
  }
  ```
  Replace with:
  ```css
  .stat-card .stat-value {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
    color: var(--text);
  }
  ```

- [ ] **Step 7: Update table header typography**

  Find:
  ```css
  thead th {
    padding: 10px 16px;
    text-align: left;
    font-size: 10px;
    font-family: var(--font-mono);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;
    font-weight: 500;
  }
  ```
  Replace with:
  ```css
  thead th {
    padding: 10px 16px;
    text-align: left;
    font-size: 12px;
    font-family: var(--font-ui);
    color: var(--text-muted);
    white-space: nowrap;
    font-weight: 600;
  }
  ```

- [ ] **Step 8: Update `.modal-title` typography**

  Find:
  ```css
  .modal-title {
    font-family: var(--font-display);
    font-size: 22px;
    letter-spacing: 0.04em;
    color: var(--text);
  }
  ```
  Replace with:
  ```css
  .modal-title {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text);
  }
  ```

- [ ] **Step 9: Update auth page wordmark**

  Find:
  ```css
  .auth-wordmark {
    font-size: clamp(72px, 10vw, 140px);
    letter-spacing: 0.04em;
    line-height: 0.9;
    color: var(--text);
    margin-bottom: 24px;
    text-shadow: 0 0 60px rgba(240, 180, 41, 0.1);
  }
  ```
  Replace with:
  ```css
  .auth-wordmark {
    font-size: clamp(60px, 8vw, 120px);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 0.9;
    color: var(--text);
    margin-bottom: 24px;
  }
  ```

- [ ] **Step 10: Verify typography in browser**

  Navigate to `http://localhost:5173`.  
  Expected:
  - Page titles are Plus Jakarta Sans Bold (not Anton's ultra-wide letterforms)
  - Stat card values and modal titles are visibly slimmer and more professional
  - Card headers are in Inter (readable, not mono-caps)
  - Table headers are Inter semi-bold without uppercase
  - Sidebar brand name is compact and weight-800

- [ ] **Step 11: Commit**

  ```bash
  git add frontend/src/index.css
  git commit -m "rebrand: typography overhaul — Plus Jakarta Sans headings, Inter UI text"
  ```

---

## Task 4 — Phase 3: Buttons & Badges

**Files:**
- Modify: `frontend/src/index.css` (buttons ~762–845, badges ~962–978)

- [ ] **Step 1: Update `.btn` base — remove uppercase, adjust sizing**

  Find:
  ```css
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: var(--radius);
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    border: none;
    transition: all var(--transition);
    white-space: nowrap;
    text-decoration: none;
  }
  ```
  Replace with:
  ```css
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    min-height: 38px;
    border-radius: var(--radius);
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0;
    cursor: pointer;
    border: none;
    transition: all var(--transition);
    white-space: nowrap;
    text-decoration: none;
  }
  ```

- [ ] **Step 2: Update `.btn-primary` hover — remove glow, use shadow**

  Find:
  ```css
  .btn-primary {
    background: var(--accent);
    color: #050a14;
  }

  .btn-primary:hover {
    background: #f7c84a;
    box-shadow: 0 0 20px var(--accent-glow);
  }
  ```
  Replace with:
  ```css
  .btn-primary {
    background: var(--accent);
    color: #0f1117;
  }

  .btn-primary:hover {
    background: #e0aa1a;
    box-shadow: var(--shadow-sm);
  }
  ```

- [ ] **Step 3: Update `.btn-sm`**

  Find:
  ```css
  .btn-sm { padding: 6px 12px; font-size: 12px; }
  ```
  Replace with:
  ```css
  .btn-sm { padding: 6px 12px; font-size: 12px; min-height: 32px; }
  ```

- [ ] **Step 4: Update `.badge` — switch font, adjust padding**

  Find:
  ```css
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 11px;
    font-family: var(--font-mono);
    font-weight: 500;
    letter-spacing: 0.05em;
  }
  ```
  Replace with:
  ```css
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 100px;
    font-size: 11px;
    font-family: var(--font-ui);
    font-weight: 500;
    letter-spacing: 0;
  }
  ```

- [ ] **Step 5: Update `.topbar-role-pill`**

  Find:
  ```css
  .topbar-role-pill {
    padding: 2px 7px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 2px;
    font-size: 9px;
    letter-spacing: 0.12em;
    color: var(--accent);
  }
  ```
  Replace with:
  ```css
  .topbar-role-pill {
    padding: 2px 8px;
    background: var(--accent-dim);
    border: 1px solid rgba(212, 160, 23, 0.25);
    border-radius: var(--radius);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0;
    color: var(--accent);
  }
  ```

- [ ] **Step 6: Verify in browser**

  Open any modal (e.g., Projects → New Project).  
  Expected:
  - Primary button is muted gold, no neon glow on hover
  - Button text is sentence-case Inter, not uppercase
  - Badges are rounder, Inter font, slightly more padded

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/index.css
  git commit -m "rebrand: update buttons (no uppercase, shadow hover) and badge styles"
  ```

---

## Task 5 — Phase 3: Forms & Modals

**Files:**
- Modify: `frontend/src/index.css` (forms ~847–893, modals ~901–960)

- [ ] **Step 1: Update `.form-label`**

  Find:
  ```css
  .form-label {
    display: block;
    font-size: 10px;
    font-family: var(--font-mono);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 7px;
  }
  ```
  Replace with:
  ```css
  .form-label {
    display: block;
    font-size: 13px;
    font-family: var(--font-ui);
    font-weight: 500;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  ```

- [ ] **Step 2: Add min-height to form inputs**

  Find:
  ```css
  .form-input,
  .form-select,
  .form-textarea {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border-2);
    border-radius: var(--radius);
    padding: 10px 14px;
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 14px;
    transition: border-color var(--transition), box-shadow var(--transition);
    outline: none;
  }
  ```
  Replace with:
  ```css
  .form-input,
  .form-select,
  .form-textarea {
    width: 100%;
    min-height: 42px;
    background: var(--surface-2);
    border: 1px solid var(--border-2);
    border-radius: var(--radius);
    padding: 10px 14px;
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 14px;
    transition: border-color var(--transition), box-shadow var(--transition);
    outline: none;
  }
  ```

- [ ] **Step 3: Update modal box-shadow to use shadow variables**

  Find:
  ```css
  .modal {
    background: var(--surface);
    border: 1px solid var(--border-2);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--accent-dim);
    animation: slideUp 200ms ease;
  }
  ```
  Replace with:
  ```css
  .modal {
    background: var(--surface);
    border: 1px solid var(--border-2);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-lg);
    animation: slideUp 200ms ease;
  }
  ```

- [ ] **Step 4: Verify forms and modals**

  Open a modal (e.g., create expense).  
  Expected:
  - Form labels are Inter 500, readable sentence case (not mono uppercase)
  - Input fields are slightly taller (42px min)
  - Modal has clean shadow without accent outline ring

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/index.css
  git commit -m "rebrand: update form labels (Inter, sentence case) and modal shadow"
  ```

---

## Task 6 — Phase 4: Card Base & Stat Cards

**Files:**
- Modify: `frontend/src/index.css` (card ~666–699, stat-card ~607–664)

- [ ] **Step 1: Update `.card` base — add shadow**

  Find:
  ```css
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  ```
  Replace with:
  ```css
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: box-shadow var(--transition), border-color var(--transition);
  }

  .card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--border-2);
  }
  ```

- [ ] **Step 2: Update `.stat-card` — add top accent border, shadow**

  Find:
  ```css
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px 24px;
    position: relative;
    overflow: hidden;
    transition: border-color var(--transition);
  }

  .stat-card::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-2), transparent);
  }

  .stat-card:hover { border-color: var(--border-2); }
  ```
  Replace with:
  ```css
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-top: 3px solid var(--accent);
    border-radius: var(--radius-lg);
    padding: 20px 24px;
    position: relative;
    box-shadow: var(--shadow-sm);
    transition: box-shadow var(--transition), border-color var(--transition);
  }

  .stat-card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--border-2);
    border-top-color: var(--accent);
  }
  ```

- [ ] **Step 3: Update `.stat-card .stat-icon` sizing**

  Find:
  ```css
  .stat-card .stat-icon {
    width: 36px; height: 36px;
    border-radius: var(--radius);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
  }
  ```
  Replace with:
  ```css
  .stat-card .stat-icon {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: var(--surface-3);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 14px;
  }
  ```

- [ ] **Step 4: Update `.stat-grid` to use minmax for better mobile flow**

  Find:
  ```css
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }
  ```
  Replace with:
  ```css
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 28px;
  }
  ```

- [ ] **Step 5: Verify stat cards**

  Navigate to any page with stat cards (e.g., Analytics or Budget).  
  Expected:
  - Each stat card has a 3px gold stripe across the top
  - Cards have subtle shadow instead of just a border
  - Icon containers are small circles (32px) with surface-3 background

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/index.css
  git commit -m "rebrand: card shadows, stat card accent-top border, icon circles"
  ```

---

## Task 7 — Phase 4: Project Cards, Stage Cards, Tables

**Files:**
- Modify: `frontend/src/index.css` (proj-card ~1429–1457, stage-card ~987–1039, table ~701–760)

- [ ] **Step 1: Update `.proj-card` — shadow and remove glow**

  Find:
  ```css
  .proj-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    cursor: pointer;
    transition: border-color var(--transition), transform var(--transition), box-shadow var(--transition);
    position: relative;
    overflow: hidden;
    animation: fadeInUp 0.3s ease both;
  }

  .proj-card::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0; width: 2px;
    background: var(--accent);
    opacity: 0;
    transition: opacity var(--transition);
    box-shadow: 0 0 8px var(--accent-glow);
  }

  .proj-card:hover {
    border-color: var(--border-2);
    transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  }

  .proj-card:hover::before { opacity: 1; }
  ```
  Replace with:
  ```css
  .proj-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    cursor: pointer;
    transition: border-color var(--transition), transform var(--transition), box-shadow var(--transition);
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    animation: fadeInUp 0.3s ease both;
  }

  .proj-card:hover {
    border-color: var(--border-2);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  ```

- [ ] **Step 2: Update `.stage-card` hover — remove transform, add shadow**

  Find:
  ```css
  .stage-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    transition: border-color var(--transition), transform var(--transition);
    position: relative;
    overflow: hidden;
  }

  .stage-card:hover {
    border-color: var(--border-2);
    transform: translateY(-2px);
  }
  ```
  Replace with:
  ```css
  .stage-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    box-shadow: var(--shadow-sm);
    transition: border-color var(--transition), box-shadow var(--transition);
    position: relative;
    overflow: hidden;
  }

  .stage-card:hover {
    border-color: var(--border-2);
    box-shadow: var(--shadow-md);
  }
  ```

- [ ] **Step 3: Update `.stage-card .stage-name` typography**

  Find:
  ```css
  .stage-card .stage-name {
    font-family: var(--font-display);
    font-size: 20px;
    letter-spacing: 0.03em;
    color: var(--text);
    flex: 1;
    padding-right: 8px;
  }
  ```
  Replace with:
  ```css
  .stage-card .stage-name {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text);
    flex: 1;
    padding-right: 8px;
  }
  ```

- [ ] **Step 4: Update `.proj-card-name` typography**

  Find the `.proj-card-name` rule (around line 1468):
  ```css
  .proj-card-name {
    font-size: 22px; letter-spacing: 0.03em; color: var(--text); line-height: 1.1;
  ```
  Update `letter-spacing` from `0.03em` to `-0.01em` and add `font-weight: 700`.

- [ ] **Step 5: Verify cards**

  Navigate to Projects page and a Stage list.  
  Expected:
  - Project cards have subtle shadow at rest, lift on hover without glow streak
  - Stage cards do the same
  - Card and stage names are tighter-tracked Plus Jakarta Sans

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/index.css
  git commit -m "rebrand: project and stage cards — shadow system, typography update"
  ```

---

## Task 8 — Phase 4: Inline Style Extraction (StageCompletionCard + Budget)

**Files:**
- Modify: `frontend/src/index.css` (add new status-box classes)
- Modify: `frontend/src/components/StageCompletionCard.jsx`
- Modify: `frontend/src/pages/Budget.jsx`

- [ ] **Step 1: Add status-box CSS classes to index.css**

  At the end of the `/* ─── Cards / Panels ──────────────────────────────────────────── */` section in `index.css`, add:

  ```css
  /* ─── Status boxes (StageCompletionCard, Budget) ─────────────── */
  .status-box {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: var(--radius);
    margin-bottom: 12px;
    border: 1px solid;
  }

  .status-box--green {
    background: var(--green-dim);
    border-color: var(--green);
  }

  .status-box--orange {
    background: var(--orange-dim);
    border-color: var(--orange);
  }

  .status-box--red {
    background: var(--red-dim);
    border-color: var(--red);
  }

  .status-box-body { flex: 1; }

  .status-box-title {
    font-size: 13px;
    font-weight: 500;
  }

  .status-box-sub {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .status-box-value {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .status-box--green .status-box-value { color: var(--green); }
  .status-box--orange .status-box-value { color: var(--orange); }

  .status-complete-btn {
    width: 100%;
    margin-top: 16px;
    padding: 12px;
    border: none;
    border-radius: var(--radius);
    font-size: 13px;
    font-family: var(--font-ui);
    font-weight: 600;
    cursor: pointer;
    transition: opacity var(--transition);
  }

  .status-complete-btn--enabled {
    background: var(--green);
    color: white;
    opacity: 1;
  }

  .status-complete-btn--disabled {
    background: var(--surface-3);
    color: var(--text-muted);
    opacity: 0.6;
    cursor: not-allowed;
  }
  ```

- [ ] **Step 2: Refactor StageCompletionCard.jsx to use CSS classes**

  Replace the entire file content with:

  ```jsx
  import { useState, useEffect } from 'react'
  import { AlertCircle, CheckCircle, Clock } from 'lucide-react'
  import { useToast } from './Toast'

  export const StageCompletionCard = ({ stageId, apiClient, onRefresh }) => {
    const [workflow, setWorkflow] = useState(null)
    const [loading, setLoading] = useState(false)
    const toast = useToast()

    useEffect(() => {
      if (stageId) fetchWorkflow()
    }, [stageId])

    const fetchWorkflow = async () => {
      try {
        setLoading(true)
        const { data } = await apiClient.get(`/api/stages/${stageId}/workflow`)
        setWorkflow(data)
      } catch (err) {
        toast('Erro ao carregar fluxo de trabalho', 'error')
      } finally {
        setLoading(false)
      }
    }

    if (!workflow) return null

    const incompletCount = workflow.checklists.filter(c => !c.is_completed).length
    const pendingApprovals = workflow.approvals.filter(a => a.status === 'pending')
    const rejectedApprovals = workflow.approvals.filter(a => a.status === 'rejected')
    const allApproved = workflow.approvals.length > 0 &&
      workflow.approvals.filter(a => a.status === 'approved').length === workflow.approvals.length
    const canComplete = workflow.can_complete && !workflow.is_locked

    return (
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
            Status de Conclusão
          </h3>
        </div>

        {workflow.checklists.length > 0 && (
          <div className={`status-box ${incompletCount > 0 ? 'status-box--orange' : 'status-box--green'}`}>
            {incompletCount > 0
              ? <AlertCircle size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
              : <CheckCircle size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
            }
            <div className="status-box-body">
              <div className="status-box-title">
                Checklist: {workflow.checklists.filter(c => c.is_completed).length}/{workflow.checklists.length}
              </div>
              {incompletCount > 0 && (
                <div className="status-box-sub">{incompletCount} itens faltando</div>
              )}
            </div>
            <div className="status-box-value">{workflow.completion_pct}%</div>
          </div>
        )}

        {pendingApprovals.length > 0 && (
          <div className="status-box status-box--orange">
            <Clock size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
            <div className="status-box-body">
              <div className="status-box-title">Pendente Aprovação</div>
              <div className="status-box-sub">{pendingApprovals.map(a => a.required_role).join(', ')}</div>
            </div>
          </div>
        )}

        {rejectedApprovals.length > 0 && (
          <div className="status-box status-box--red">
            <AlertCircle size={18} style={{ color: 'var(--red)', flexShrink: 0 }} />
            <div className="status-box-body">
              <div className="status-box-title" style={{ color: 'var(--red)' }}>Rejeitado</div>
              <div className="status-box-sub">{rejectedApprovals.map(a => a.required_role).join(', ')}</div>
            </div>
          </div>
        )}

        {allApproved && (
          <div className="status-box status-box--green">
            <CheckCircle size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
            <div className="status-box-title" style={{ color: 'var(--green)' }}>
              Todas as aprovações concluídas
            </div>
          </div>
        )}

        {workflow.completion_blockers.length > 0 && (
          <div className="status-box status-box--red" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '12px', color: 'var(--red)', fontWeight: '500', marginBottom: '8px' }}>
              ⚠️ Razões para não concluir:
            </div>
            <ul style={{ fontSize: '12px', color: 'var(--text)', margin: '0', paddingLeft: '20px' }}>
              {workflow.completion_blockers.map((blocker, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>{blocker}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          disabled={!canComplete}
          className={`status-complete-btn ${canComplete ? 'status-complete-btn--enabled' : 'status-complete-btn--disabled'}`}
          title={!workflow.can_complete ? 'Completa todos os requisitos primeiro' : workflow.is_locked ? 'Etapa está bloqueada' : 'Marcar como concluída'}
        >
          ✓ Concluir Etapa
        </button>
      </div>
    )
  }

  export default StageCompletionCard
  ```

- [ ] **Step 3: Find and update Budget.jsx status-coloring inline styles**

  Open `frontend/src/pages/Budget.jsx`. Search for inline `style={{ background:` or `style={{ color: 'var(--orange)'` or similar status-color patterns.

  For each status-box-like `<div style={{ background: 'var(--orange-dim)', border: '1px solid var(--orange)', ... }}>` pattern found, replace with `<div className="status-box status-box--orange">` (or `--green`, `--red` as appropriate), extracting child text elements to use `status-box-title` and `status-box-sub` class names.

  If Budget.jsx does not contain such patterns (it may use different status display), skip this step and note it in the commit message.

- [ ] **Step 4: Verify StageCompletionCard renders correctly**

  Open a project that has stages with workflows. Navigate to a stage detail page that shows the StageCompletionCard.  
  Expected:
  - Green/orange/red status boxes render exactly as before but using CSS classes
  - Complete button appears enabled (green) or disabled (gray) correctly
  - No visual regression from the refactor

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/index.css frontend/src/components/StageCompletionCard.jsx frontend/src/pages/Budget.jsx
  git commit -m "rebrand: extract status-box inline styles to CSS classes"
  ```

---

## Task 9 — Phase 5: Sidebar & Navigation

**Files:**
- Modify: `frontend/src/index.css` (sidebar rules ~104–480)

- [ ] **Step 1: Update `.sidebar` to add a proper border-right**

  The sidebar already has `border-right: 1px solid var(--border)`. With new token values this should look correct. No change needed here — inherited via `--border` token update.

- [ ] **Step 2: Update `.nav-group-label` — remove mono uppercase**

  Find:
  ```css
  .nav-group-label {
    font-size: 9px;
    font-family: var(--font-mono);
    color: var(--text-dim);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 4px 10px 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  ```
  Replace with:
  ```css
  .nav-group-label {
    font-size: 11px;
    font-family: var(--font-ui);
    font-weight: 600;
    color: var(--text-dim);
    letter-spacing: 0;
    text-transform: uppercase;
    padding: 4px 10px 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  ```

- [ ] **Step 3: Update `.nav-link` typography**

  Find:
  ```css
  .nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 11px 9px 14px;
    border-radius: var(--radius);
    color: var(--text-muted);
    text-decoration: none;
    font-size: 13.5px;
    font-weight: 500;
    letter-spacing: 0.03em;
    ...
  }
  ```
  Update `font-size` to `14px` and `letter-spacing` to `0`.

- [ ] **Step 4: Remove the glow from the active nav indicator**

  Find:
  ```css
  .nav-link.active::before {
    content: '';
    position: absolute;
    left: 0; top: 18%; bottom: 18%;
    width: 2px;
    background: var(--accent);
    border-radius: 0 2px 2px 0;
    box-shadow: 0 0 10px var(--accent-glow);
  }
  ```
  Replace with:
  ```css
  .nav-link.active::before {
    content: '';
    position: absolute;
    left: 0; top: 18%; bottom: 18%;
    width: 3px;
    background: var(--accent);
    border-radius: 0 2px 2px 0;
  }
  ```

- [ ] **Step 5: Update `.readout-label` from mono to ui font**

  Find:
  ```css
  .readout-label {
    font-size: 9px;
    font-family: var(--font-mono);
    color: var(--text-muted);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  ```
  Replace with:
  ```css
  .readout-label {
    font-size: 11px;
    font-family: var(--font-ui);
    font-weight: 500;
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  ```

- [ ] **Step 6: Update `.user-role` font**

  Find:
  ```css
  .user-role {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--text-dim);
    letter-spacing: 0.16em;
    margin-top: 2px;
  }
  ```
  Replace with:
  ```css
  .user-role {
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 2px;
  }
  ```

- [ ] **Step 7: Verify sidebar**

  Open the app and look at the sidebar.  
  Expected:
  - Nav section labels are Inter Semi-Bold, slightly more readable
  - Nav links are Inter 500, 14px
  - Active nav item has a 3px solid gold left bar (no glow)
  - Brand name is Plus Jakarta Sans 800, compact

- [ ] **Step 8: Commit**

  ```bash
  git add frontend/src/index.css
  git commit -m "rebrand: sidebar nav — Inter typography, remove glow effects, thicker active bar"
  ```

---

## Task 10 — Phase 5: Topbar

**Files:**
- Modify: `frontend/src/index.css` (topbar ~1355–1412)

- [ ] **Step 1: Update topbar height and background**

  Find:
  ```css
  .topbar {
    position: sticky;
    top: 0; z-index: 100;
    height: 54px;
    background: rgba(5, 10, 20, 0.88);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    padding: 0 40px;
  }
  ```
  Replace with:
  ```css
  .topbar {
    position: sticky;
    top: 0; z-index: 100;
    height: 56px;
    background: rgba(15, 17, 23, 0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    padding: 0 40px;
  }
  ```

- [ ] **Step 2: Update topbar back-link and title styles**

  Find:
  ```css
  .topbar-back {
    display: flex; align-items: center; gap: 6px;
    font-family: var(--font-mono);
    font-size: 11px; color: var(--text-muted);
    text-decoration: none; letter-spacing: 0.06em;
    transition: color var(--transition);
  }
  ```
  Replace with:
  ```css
  .topbar-back {
    display: flex; align-items: center; gap: 6px;
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    text-decoration: none;
    transition: color var(--transition);
  }
  ```

  Find:
  ```css
  .topbar-title {
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding-left: 16px;
    border-left: 1px solid var(--border);
    margin-left: 4px;
  }
  ```
  Replace with:
  ```css
  .topbar-title {
    font-size: 13px;
    font-family: var(--font-ui);
    font-weight: 500;
    color: var(--text-muted);
    padding-left: 16px;
    border-left: 1px solid var(--border);
    margin-left: 4px;
  }
  ```

  Find:
  ```css
  .topbar-user {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--font-mono);
    font-size: 11px; color: var(--text-muted);
    letter-spacing: 0.04em;
  }
  ```
  Replace with:
  ```css
  .topbar-user {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--font-ui);
    font-size: 13px;
    color: var(--text-muted);
  }
  ```

- [ ] **Step 3: Verify topbar**

  Open a project detail page (which shows the Topbar with back link).  
  Expected:
  - Topbar back link is Inter 500, readable
  - User email is Inter (not mono)
  - Role pill shows muted gold on slate background
  - Topbar feels slightly heavier/more substantial (56px vs 54px)

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/index.css
  git commit -m "rebrand: topbar — Inter typography, adjusted height and background"
  ```

---

## Task 11 — Phase 6: Mobile Touch Targets

**Files:**
- Modify: `frontend/src/index.css` (mobile media queries ~446–580)

- [ ] **Step 1: Ensure `.btn` meets 44px touch target**

  The `.btn` base already has `min-height: 38px` from Task 4. Add a mobile override that increases it:

  In the `@media (max-width: 767px)` block, add:
  ```css
  .btn { min-height: 44px; }
  .btn-sm { min-height: 36px; }
  ```

- [ ] **Step 2: Ensure `.nav-link` meets 44px touch target on mobile**

  In the `@media (max-width: 767px)` block, find or add to the `.nav-link` override:
  ```css
  .nav-link { min-height: 44px; padding: 11px 11px 11px 14px; }
  ```

- [ ] **Step 3: Ensure form inputs meet 44px on mobile**

  In the `@media (max-width: 767px)` block, add:
  ```css
  .form-input,
  .form-select,
  .form-textarea { min-height: 44px; }
  ```

- [ ] **Step 4: Ensure `.btn-icon` has adequate tap area**

  In the `@media (max-width: 767px)` block, add:
  ```css
  .btn-icon { min-width: 40px; min-height: 40px; }
  ```

- [ ] **Step 5: Update mobile menu button to 44px tap target**

  Find in the `@media (max-width: 767px)` block:
  ```css
  .mobile-menu-btn {
    display: flex;
    position: fixed;
    top: 14px;
    left: 14px;
    z-index: 210;
    width: 40px;
    height: 40px;
    ...
  }
  ```
  Change `width: 40px; height: 40px;` to `width: 44px; height: 44px;`.

- [ ] **Step 6: Increase mobile backdrop opacity**

  Find in `@media (max-width: 767px)`:
  ```css
  .mobile-nav-backdrop {
    ...
    background: rgba(5, 10, 20, 0.72);
    ...
  }
  ```
  Change to:
  ```css
  background: rgba(0, 0, 0, 0.75);
  ```

- [ ] **Step 7: Add safe-area inset to mobile sidebar**

  In the `@media (max-width: 767px)` block, find `.sidebar-footer { padding: 14px 16px; }` and update to:
  ```css
  .sidebar-footer {
    padding: 14px 16px;
    padding-bottom: calc(14px + env(safe-area-inset-bottom));
  }
  ```

- [ ] **Step 8: Verify touch targets on mobile emulation**

  In Chrome DevTools, enable mobile emulation (iPhone 14 Pro — 390px wide).  
  Open `http://localhost:5173`.  
  Expected:
  - All buttons are at least 44px tall
  - Nav links in open sidebar drawer are comfortably tappable
  - Form inputs are full-height (44px)
  - Mobile menu hamburger is 44×44px

- [ ] **Step 9: Commit**

  ```bash
  git add frontend/src/index.css
  git commit -m "rebrand: mobile touch targets — 44px min for buttons, nav links, inputs"
  ```

---

## Task 12 — Phase 6: Mobile Layout & Typography

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Confirm `--space-page-mobile` is in `:root`**

  This variable was added to `:root` in Task 2. Verify it is present in the `:root` block of `index.css`. No action needed if Task 2 is complete.

- [ ] **Step 2: Scale down `.page-title` on mobile**

  In the `@media (max-width: 767px)` block, add:
  ```css
  .page-title { font-size: 22px; }
  ```

- [ ] **Step 3: Fix stat-grid to single column on very small screens**

  In `@media (max-width: 480px)` (add this block if it doesn't exist at the end of index.css):
  ```css
  @media (max-width: 480px) {
    .stat-grid {
      grid-template-columns: 1fr;
    }
    .proj-grid {
      grid-template-columns: 1fr;
    }
    .stage-grid {
      grid-template-columns: 1fr;
    }
    .charts-grid {
      grid-template-columns: 1fr;
    }
    .form-row {
      grid-template-columns: 1fr;
    }
    .page-title { font-size: 20px; }
  }
  ```

- [ ] **Step 4: Ensure table horizontal scroll has touch-friendly behavior**

  Find:
  ```css
  .table-wrap { overflow-x: auto; }
  ```
  Replace with:
  ```css
  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  ```

- [ ] **Step 5: Fix main content mobile padding**

  In `@media (max-width: 767px)`, find:
  ```css
  .main-content { margin-left: 0; padding: 68px 16px 24px; }
  ```
  This is already correct. Verify it matches `--space-page-mobile: 16px` intent. No change needed.

- [ ] **Step 6: Verify mobile layout end-to-end**

  In Chrome DevTools mobile emulation (iPhone SE — 375px wide):
  - Projects page: cards stack in single column ✓
  - Stats grid: single column ✓
  - Tables: horizontally scrollable ✓
  - Page title is 20–22px, not 28px ✓
  - Open sidebar drawer: full-height, closes cleanly ✓

  Also test on Pixel 7 (412px wide):
  - 2-column stat grid where width allows ✓

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/index.css
  git commit -m "rebrand: mobile layout — single-column grids at 480px, table scroll, title scaling"
  ```

---

## Final Verification

- [ ] **Run app**

  ```bash
  docker-compose up
  # or: cd frontend && npm run dev
  ```

- [ ] **Check all pages**

  | Page | What to verify |
  |---|---|
  | `/login` | Wordmark is Plus Jakarta Sans 800, forms look clean |
  | `/projects` | Project cards have shadow, gold left bar gone, Inter nav |
  | Project detail | Topbar back link is Inter, stage cards consistent |
  | Stages | Stage cards shadow, name typography updated |
  | Budget | Stat cards have accent-top border, inline styles cleaned |
  | Expenses | Table headers Inter, no uppercase |
  | Any modal | Inputs 42px+, labels sentence case Inter |
  | Sidebar | No grid texture, Inter nav labels, active gold bar (no glow) |

- [ ] **Mobile check (Chrome DevTools)**

  Test at 375px (iPhone SE), 390px (iPhone 14 Pro), 412px (Pixel 7):
  - Sidebar drawer opens/closes with 75% dark backdrop
  - All tappable elements ≥ 44px
  - Grids collapse to single column at 480px
  - Tables scroll horizontally

- [ ] **Final commit (if any cleanup needed)**

  ```bash
  git add -A
  git commit -m "rebrand: final polish and cleanup"
  ```
