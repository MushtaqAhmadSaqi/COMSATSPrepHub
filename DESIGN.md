# COMSATSPrepHub Design System (`DESIGN.md`)

> Academic precision for COMSATS University students preparing for Midterms and Terminals on mobile phones and campus Wi-Fi.

---

## 1. Design Philosophy & Visual Direction

COMSATSPrepHub is a **calm, authoritative academic workspace** — never a generic SaaS landing page. There are no purple neon gradients, bloated drop shadows, or floating decorative orbs. Every token, spacing rule, and interaction supports rapid retrieval and deep focus under exam pressure.

### Surface Modes
The interface adapts across three purposeful surface modes sharing one token vocabulary:

1. **Persuade Mode — Landing Page (`/`):**
   - Editorial academic-tech hierarchy with balanced display typography, crisp hairline borders, and high-trust proof points (`Works without an account — saved on this device`).
   - Asymmetric bento grid where flagship modules (*Past Paper Library* and *Timed & AI Quizzes*) feature lightweight, functional UI micro-previews instead of uniform icon boxes.
   - Unified instant course-code search (`CSC101`, `CSC211`, `MTH104`, `csc 103` alias handling) wired directly into the `Ctrl K` / `⌘ K` Command Palette flow.

2. **Read Mode — Study Content (*Past Paper Library*, *Paper Viewer*, *Cheat Sheets*):**
   - Warm-neutral paper-like light surface (`#f9fafb` / `#ffffff`) and low-glare slate dark surface (`#0b1120` / `#111827`) for late-night revision.
   - Generous line measure (`max-width: 68ch–75ch`), crisp KaTeX math typesetting, dark-mode-aware Mermaid diagrams, and horizontal scroll scoped strictly to wide equations and truth/scheduling tables (`overflow-x: auto`).
   - Zero decorative chrome competing with exam questions and collapsible model answers.

3. **Operate Mode — Active Practice (*Timed Quizzes*, *AI Quiz Generator*, *Study Hub Flashcards*, *GPA Calculator*, *Student Dashboard*):**
   - High scanability, tight feedback loops, keyboard-first shortcuts (`1–4` / `A–D`, `Enter`, `Space`, `←`/`→`), and distraction-free timed exam mode.
   - Tabular numerals (`font-variant-numeric: tabular-nums`) on all timers, scores, SGPA/CGPA values, and live counters.

---

## 2. Color System & Semantic Tokens

### Brand & Accent Palette
- **Primary Ink / Brand Accent (Academic Cobalt):**
  - Light: `--brand: #1e40af` (hover `#1d4ed8`, ink `#1e3a8a`, deep `#172554`, soft `rgba(30, 64, 175, 0.08)`, soft-2 `rgba(30, 64, 175, 0.14)`, `--on-brand: #ffffff`)
  - Dark: `--brand: #60a5fa` (hover `#93c5fd`, ink `#93c5fd`, deep `#dbeafe`, soft `rgba(96, 165, 250, 0.14)`, soft-2 `rgba(96, 165, 250, 0.24)`, `--on-brand: #0b1120`)
- **Single Purposeful Accent (Scholar Ochre / Amber):**
  - Light: `--accent: #b45309` (soft `rgba(180, 83, 9, 0.10)`) — used sparingly for streaks, flagged review items, and active highlights.
  - Dark: `--accent: #fbbf24` (soft `rgba(251, 191, 36, 0.15)`)

### Surfaces & Text (WCAG 2.2 AA Verified)
| Token | Light Mode | Dark Mode (Low-Glare Exam Night) | Role |
| :--- | :--- | :--- | :--- |
| `--bg` | `#f7f8fa` | `#090e1a` | Page canvas |
| `--surface` | `#ffffff` | `#111827` | Cards, panels, sheets |
| `--surface-2` | `#f1f5f9` | `#1a2333` | Inset controls, subtle rows |
| `--surface-3` | `#e2e8f0` | `#273247` | Pill tracks, hover chips |
| `--border` | `#e2e8f0` | `rgba(255, 255, 255, 0.10)` | Hairline borders |
| `--border-strong` | `#cbd5e1` | `rgba(255, 255, 255, 0.20)` | Form inputs, focused borders |
| `--text` | `#0f172a` | `#f1f5f9` | Primary body & headings |
| `--text-muted` | `#334155` | `#cbd5e1` | Secondary labels & prose |
| `--text-subtle` | `#475569` | `#94a3b8` | Hints, metadata, captions |

### Semantic Status Tokens
- **Success (Mastery / Correct):** Light `#059669` / Dark `#34d399` (`--success-soft`)
- **Warning (Flagged / Deadline < 7d):** Light `#d97706` / Dark `#fbbf24` (`--warning-soft`)
- **Danger (Incorrect / Destructive):** Light `#dc2626` / Dark `#ef4444` (`--danger-soft`)
- **Info:** Light `#1d4ed8` / Dark `#60a5fa`

### Browser & OS Integration
- `html` sets `color-scheme: light` or `color-scheme: dark` synchronously in `public/theme-init.js` and `src/App.jsx`.
- `<meta name="theme-color">` dynamically syncs (`#f7f8fa` in light mode, `#090e1a` in dark mode).
- Native `<select>` and `<option>` elements set explicit `background-color: var(--surface)` and `color: var(--text)` so Windows dark mode menus never render white-on-white or mismatched system popups.

---

## 3. Typography & Hierarchy

- **Display Font (`--font-display`):** `'Space Grotesk', 'Inter', system-ui, sans-serif` — tight tracking (`-0.03em` to `-0.04em`), `text-wrap: balance` on all major headings.
- **UI & Reading Body (`--font-body`):** `'Inter', system-ui, -apple-system, sans-serif` — clean legibility on high-DPI mobile screens; `line-height: 1.5` for UI, `1.75` for Read Mode paper prose.
- **Technical Monospace (`--font-mono`):** `'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace` — applied to all COMSATS course codes (`CSC101`, `CSC211`, `MTH104`), keyboard shortcut badges (`⌘ K` / `Ctrl K`), timers, SGPA/CGPA figures, and code blocks, paired with `font-variant-numeric: tabular-nums`.
- **Urdu RTL Explanations (`--font-urdu`):** `'Noto Nastaliq Urdu', serif` with `line-height: 2.15` for bilingual step-by-step quiz explanations.
- **Translation Protection:** Brand name (`COMSATSPrepHub`) and course codes carry `translate="no"`.

---

## 4. Iconography (Zero-FOUT Campus Wi-Fi Standard)

- External icon font ligatures (`Material Symbols Outlined`) are **eliminated** to prevent raw ligature strings (`menu_book`, `local_fire_department`, `auto_awesome`) from flashing on slow campus networks.
- All UI icons use a single tree-shaken inline SVG component (`src/components/ui/AppIcon.jsx`) modeled after crisp 24×24 stroke geometry (`strokeWidth="1.85"`, `strokeLinecap="round"`, `strokeLinejoin="round"`, `aria-hidden="true"`).
- Icon-only controls require an explicit `aria-label` and a minimum `44×44px` interactive hit area.

---

## 5. Layout, Navigation & Elevation

- **Single-Tier Desktop Navigation (`≥ 1024px`):**
  - Sticky top bar (`height: 3.75rem`) with Brand mark, unified 6-link pill (`Home`, `Papers`, `AI Quiz`, `Study Hub`, `GPA Calc`, `Dashboard`), compact `Search (Ctrl K)` / `(⌘ K)` trigger, `EN / اردو` toggle, Light/Dark toggle, and Account / Sign In action.
- **Mobile & Tablet Navigation (`< 1024px`):**
  - Compact top utility bar (Brand, Search trigger, Language, Theme, Sign In/Account) + fixed bottom tab bar (`Papers`, `AI Quiz`, `Study Hub`, `GPA`, `Dashboard`) with `env(safe-area-inset-bottom)` clearance.
  - Floating overlays (`CookieNotice`, `InstallPrompt`, `ToastContainer`) sit cleanly above the bottom bar (`bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px))`) and remain compact on mobile so CTAs and navigation stay unobstructed.
- **Elevation & Borders:**
  - Restraint over blur: rely on `1px solid var(--border)` hairlines and crisp background stepping (`--bg` → `--surface` → `--surface-2`), with subtle two-layer shadows reserved for floating popovers, command palette, and modals (`--shadow-1`, `--shadow-2`, `--shadow-3`).
- **Back to Top Control:**
  - Only one `Back to top` control is visible in the footer column (or floating `ScrollTop` exclusively above the footer when scrolled, avoiding duplicate adjacent `arrow_upward` controls).

---

## 6. Motion, Accessibility & Performance Guardrails

- **Compositor-Only Motion:** Animate `transform` and `opacity` only. **Zero `transition: all`** anywhere in stylesheets or inline styles.
- **Reduced Motion:** Global `@media (prefers-reduced-motion: reduce)` disables non-essential motion; Framer Motion uses `<MotionConfig reducedMotion="user">`; programmatic `window.scrollTo` checks `prefers-reduced-motion`.
- **Focus & Touch Targets:** Consistent `:focus-visible` ring (`2px solid var(--brand)` + `4px` `--ring` halo) on every interactive element. Non-inline controls enforce `min-height: 44px; min-width: 44px` and `touch-action: manipulation`.
- **Containment & Virtualization:** Modals, drawers, and the `Ctrl K` Command Palette enforce `overscroll-behavior: contain`. Long course/paper catalogs apply `content-visibility: auto` and `contain-intrinsic-size` to avoid layout work off-screen.
- **Single Source of Truth Data:** All landing page course/paper counters and command palette search indexes derive dynamically from `src/constants/subjects.js` + live `papersService` counts (`src/constants/platformStats.js`), eliminating conflicting hardcoded numbers.
