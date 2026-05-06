# Frontend Rebranding Design Spec
**Date:** 2026-05-06  
**Project:** Obras — Brazilian Construction SaaS  
**Status:** Approved

---

## Context

The current frontend uses a "technical blueprint" dark aesthetic (deep navy, neon amber, Anton display font, blueprint grid texture). While functional, it reads as a dev-tool or gamer-adjacent product rather than a professional SaaS for construction project managers. The goal is to evolve the visual identity into a **dark-slate corporate construction brand** — grounded, premium, and legible — without changing the dark theme or the underlying component structure.

---

## Design Principles

1. **Professional, not flashy** — Depth through quality typography and consistent spacing, not visual noise (no grid textures, no glow effects except sparingly on primary CTAs).
2. **Data-first** — Construction management is number-heavy; IBM Plex Mono stays for all numeric/amount display.
3. **Dark slate, not dark navy** — Backgrounds shift from blue-tinted navy to neutral dark slate, feeling more like a high-end dashboard than a dev tool.
4. **Incremental phases** — Each phase is independently shippable and reviewable before the next begins.

---

## Design Token Changes

### Colors

| Token | Current | New | Rationale |
|---|---|---|---|
| `--bg` | `#050a14` | `#0f1117` | Neutral dark slate instead of navy |
| `--surface` | `#0d1526` | `#161b22` | Warmer, less blue-shifted |
| `--surface-2` | `#111d35` | `#1c2128` | Consistent neutral progression |
| `--surface-3` | `#162040` | `#21262d` | Elevated surface, still dark |
| `--accent` | `#f0b429` | `#d4a017` | Premium gold, less neon |
| `--accent-glow` | `rgba(240,180,41,0.18)` | `rgba(212,160,23,0.15)` | Subtler glow |
| `--accent-dim` | `rgba(240,180,41,0.08)` | `rgba(212,160,23,0.08)` | Match new accent |
| `--text` | `#e8edf7` | `#e6edf3` | Slightly warmer white |
| `--text-muted` | `#6b7a99` | `#7d8590` | Neutral slate, less blue |
| `--text-dim` | `#2d3c5a` | `#3d444d` | Neutral disabled tone |
| `--border` | `#1a2744` | `#21262d` | Matches new surface scale |
| `--border-2` | `#243558` | `#30363d` | Stronger divider, neutral |

Semantic colors (green/red/orange/blue) remain unchanged — they carry status meaning and are well-calibrated.

### Typography

| Token | Current | New |
|---|---|---|
| `--font-display` | `'Anton'` | `'Plus Jakarta Sans'` Bold 700/800 |
| `--font-ui` | `'Barlow Condensed'` | `'Inter'` |
| `--font-mono` | `'IBM Plex Mono'` | `'IBM Plex Mono'` (unchanged) |

**Google Fonts import** will change from:
```
Anton + IBM Plex Mono + Barlow Condensed
```
To:
```
Plus Jakarta Sans (weights 400, 500, 600, 700, 800) + Inter (weights 400, 500, 600) + IBM Plex Mono (weights 400, 500, 600)
```

### Removed Visual Effects

- **Blueprint grid body texture** — removed entirely (background SVG pattern)
- **Vignette gradient** — removed
- **Glow shadows on cards** — removed; replace with subtle `box-shadow` depth system

### New Shadow System

```css
--shadow-sm:  0 1px 3px rgba(0,0,0,0.4);
--shadow-md:  0 4px 12px rgba(0,0,0,0.5);
--shadow-lg:  0 8px 24px rgba(0,0,0,0.6);
```

Cards use `--shadow-sm` at rest, `--shadow-md` on hover.

---

## Phase 1 — Design Token Foundation

**Files:** `frontend/index.html`, `frontend/src/index.css`

**Changes:**
1. Update Google Fonts `<link>` in `index.html` to load Plus Jakarta Sans + Inter + IBM Plex Mono.
2. Update all CSS custom property values in `:root` block of `index.css` (colors, font variables).
3. Remove the `body::before` blueprint grid pseudo-element and the vignette gradient.
4. Add `--shadow-sm`, `--shadow-md`, `--shadow-lg` variables to `:root`.
5. Update `body` font-family to use `var(--font-ui)` (Inter).

**Verification:** Open the app — backgrounds shift to neutral slate, text looks warmer, grid texture is gone. Typography not yet updated in components (that is Phase 2).

---

## Phase 2 — Typography & Global Styles

**Files:** `frontend/src/index.css`

**Changes:**
1. Update `.page-title` and all `h1`–`h3` rules to use `var(--font-display)` (Plus Jakarta Sans Bold) with adjusted letter-spacing (reduce aggressive tracking from Anton era).
2. Update `.page-subtitle`, `.card-header`, `.section-label` to use Inter with appropriate weights.
3. Audit all hardcoded `font-family` declarations and replace with CSS variable references.
4. Update uppercase label sizes — Anton-era labels often needed large size to be legible; Plus Jakarta Sans reads better at 11–12px, so reduce `font-size` on `.form-label`, `.table` headers, badge text.
5. Tune `line-height` globally: `--lh-tight: 1.2`, `--lh-base: 1.5`, `--lh-loose: 1.7`.

**Verification:** All headings render in Plus Jakarta Sans. Labels and body text use Inter. Mono text (amounts, timestamps, codes) still uses IBM Plex Mono.

---

## Phase 3 — Buttons, Badges, Forms & Modals

**Files:** `frontend/src/index.css`

**Changes:**

**Buttons:**
- `.btn-primary`: replace glow `box-shadow` with subtle `--shadow-sm`; keep amber background but use new `--accent`; border-radius to `var(--radius)` (6px — same).
- Remove all `text-transform: uppercase` from buttons (Inter reads well in sentence case).
- `.btn-ghost`: border color to `--border-2`, hover background to `--surface-2`.

**Badges:**
- Increase padding slightly (3px 8px → 4px 10px) for better touch affordance.
- Reduce font-size from 10px to match Inter at 11px (Inter is taller than Barlow Condensed).

**Forms:**
- `.form-label`: sentence case (remove uppercase transform), Inter 500 weight, 13px.
- `.form-input`, `.form-select`, `.form-textarea`: update focus ring to use new `--accent` value; background to `--surface-2`.
- Add `--radius` border-radius to all inputs for consistency.

**Modals:**
- `.modal`: switch from pure border to `border + --shadow-lg` for depth.
- `.modal-header`: lighter border-bottom using `--border`.
- `.modal-title`: use `--font-display` at appropriate size.

**Verification:** Open a modal (e.g., add expense, create stage). Buttons, labels, inputs all consistent with new type and color system.

---

## Phase 4 — Cards & Data Display

**Files:** `frontend/src/index.css`, targeted inline style cleanup in key components

**Changes:**

**Card base (`.card`):**
- Add `box-shadow: var(--shadow-sm)`.
- Hover state: `box-shadow: var(--shadow-md)`, border-color to `--border-2`.
- Remove any `border-left` accent bars (replace with a different visual treatment in stat cards).

**Stat cards (`.stat-card`):**
- Add a top 3px border using `--accent` (replaces left bar idiom; cleaner in grid layouts).
- Icon sizing: standardize to 20px with `--surface-3` background circle (32px diameter).
- Number: `--font-display` Bold, 28px; label: Inter 500, 12px, `--text-muted`.

**Project cards (`.proj-card`):**
- Clean up padding to 20px consistent.
- Footer action: Inter 500 instead of uppercase mono.
- Status badge placement: top-right corner overlay instead of inline.

**Stage cards (`.stage-card`):**
- Similar cleanup, consistent with proj-card patterns.

**Tables:**
- Header: Inter 600 12px, `--text-muted`, remove uppercase.
- Row hover: `--surface-2` background.
- Amount columns: IBM Plex Mono unchanged (correct).

**Inline style cleanup (targeted):**
- `StageCompletionCard.jsx`: extract repeated color logic to CSS classes (`.status-box--green`, `.status-box--orange`, etc.) instead of inline style objects.
- `Budget.jsx`: same pattern — CSS classes for status coloring instead of inline styles.

**Verification:** Projects page, Stages page, Budget page — cards look polished and consistent.

---

## Phase 5 — Navigation & Layout

**Files:** `frontend/src/index.css`, `frontend/src/components/Sidebar.jsx`, `frontend/src/components/Topbar.jsx`, `frontend/src/components/Layout.jsx`

**Changes:**

**Sidebar:**
- Brand block: replace any Anton text with Plus Jakarta Sans 700; increase brand logo area padding.
- Nav links: Inter 500 14px, remove uppercase; active state keeps accent left-bar indicator.
- User card at bottom: Inter, cleaner separator.
- Width: keep `--sidebar-w: 240px` but add a subtle right border `--border`.

**Topbar:**
- Height: standardize to 56px (from current varied heights).
- Back navigation: Inter 500, remove uppercase.
- User pill / role badge: cleaner with new badge styles from Phase 3.

**Page headers (`.page-header`, `.page-title`, `.page-subtitle`):**
- Title: Plus Jakarta Sans 800, 28px (down from Anton 32px+ with tracking).
- Subtitle: Inter 400, 15px, `--text-muted`.
- Header padding: standardize to 24px bottom margin before content.

**Verification:** Navigate through sidebar — consistent nav appearance. Page titles look professional on all pages.

---

## Phase 6 — Mobile Responsiveness

**Files:** `frontend/src/index.css`, `frontend/src/components/Layout.jsx`, `frontend/src/components/Sidebar.jsx`

**Changes:**

**Touch targets:**
- All `.btn` minimum height: 44px.
- All `.nav-link` minimum height: 44px.
- Form inputs minimum height: 44px.
- Icon buttons: minimum 40×40px tap area.

**Spacing:**
- Add `--space-page-mobile: 16px` variable; apply to `.page-header` and main content area padding on mobile.
- Cards in grid: switch from fixed column widths to `minmax(280px, 1fr)` on mobile breakpoint.

**Navigation:**
- Mobile drawer overlay: ensure it covers full viewport height including safe area insets (`padding-bottom: env(safe-area-inset-bottom)`).
- Close button on drawer: minimum 44px tap target.
- Backdrop: `rgba(0,0,0,0.7)` (increase from current for better contrast).

**Typography on mobile:**
- `.page-title`: scale down to 22px on mobile (from 28px desktop).
- Stat cards: stack into single column below 480px.
- Tables: horizontal scroll wrapper with `-webkit-overflow-scrolling: touch`.

**Breakpoints (unchanged thresholds, improved content):**
- 1280px: tablet adjustments
- 960px: sidebar icon-only or hidden
- 768px: mobile drawer, stacked layouts
- 480px: small phone, single-column everything

**Verification:** Open app on Chrome DevTools mobile emulation (iPhone 14 Pro, Pixel 7). Sidebar drawer opens/closes. All buttons have adequate tap targets. Cards and stat grids stack properly. Tables scroll horizontally.

---

## Critical Files

| File | Phases |
|---|---|
| `frontend/index.html` | 1 |
| `frontend/src/index.css` | 1, 2, 3, 4, 5, 6 |
| `frontend/src/components/Sidebar.jsx` | 5, 6 |
| `frontend/src/components/Topbar.jsx` | 5 |
| `frontend/src/components/Layout.jsx` | 5, 6 |
| `frontend/src/components/StageCompletionCard.jsx` | 4 |
| `frontend/src/pages/Budget.jsx` | 4 |

---

## Out of Scope

- BOM.css (specialized page with its own layout — handled separately if needed)
- Chart styling (Recharts colors will inherit from CSS variables but chart-specific polish is a separate task)
- New illustrations or icons (Lucide React stays)
- Backend changes

---

## Verification (End-to-End)

After all phases:
1. Run `docker-compose up` and open `localhost:5173`
2. Check Login, Projects, ProjectDetail, Stages, Budget, Expenses, DailyReports pages
3. Open every modal type (create project, add expense, stage approval)
4. Verify on mobile emulation: iPhone SE (375px), iPhone 14 Pro (390px), Pixel 7 (412px)
5. Check dark theme consistency — no leftover navy-blue tinted surfaces
6. Confirm mono font on all numeric/amount fields
