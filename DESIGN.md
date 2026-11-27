# COMSATSPrepHub Design System (`DESIGN.md`)

## Brand Palette & Semantic Tokens (`src/index.css`)
All UI components consume CSS custom properties defined in `:root` (light mode) and `html.dark` (dark mode). Hardcoded hex colors in component stylesheets are forbidden.

### Core Brand & Surface Tokens
- **Light Mode (`:root`)**
  - Background (`--bg`): `#f7f8fa`
  - Primary Surface (`--surface`): `#ffffff`
  - Secondary Surface (`--surface-2`): `#f1f5f9`
  - Elevated Control Surface (`--surface-3`): `#e2e8f0`
  - Brand Navy (`--brand`): `#1e40af` (interactive blue `--brand-2`: `#2563eb`, sky highlight `--brand-light`: `#38bdf8`)
  - On-Brand Ink (`--on-brand`): `#ffffff`
  - Scholar Amber Accent (`--accent`): `#d97706`
  - Text (`--text`): `#0f172a`, Muted (`--text-muted`): `#334155`, Subtle (`--text-subtle`): `#475569`
- **Dark Mode (`html.dark`)**
  - Background (`--bg`): `#090e1a`
  - Primary Surface (`--surface`): `#111827`
  - Secondary Surface (`--surface-2`): `#1e293b`
  - Elevated Control Surface (`--surface-3`): `#334155`
  - Brand Sky (`--brand`): `#60a5fa` (`--brand-2`: `#3b82f6`, `--brand-light`: `#93c5fd`)
  - On-Brand Ink (`--on-brand`): `#0f172a`
  - Scholar Amber Accent (`--accent`): `#fbbf24`
  - Text (`--text`): `#f8fafc`, Muted (`--text-muted`): `#cbd5e1`, Subtle (`--text-subtle`): `#94a3b8`
- **Semantic & Specialized Tokens**
  - Status pairs: `--success` / `--success-soft` / `--success-ink`, `--warning` / `--warning-soft`, `--danger` / `--danger-soft` / `--danger-ink`
  - Math, Diagram & Code surfaces: `--code-bg`, `--code-header-bg`, `--code-border`, `--code-text`, `--code-accent`, `--math-surface`, `--math-formula-bg`, `--math-formula-border`, `--math-formula-pill`, `--math-note-bg`, `--math-note-border`, `--math-note-text`, `--paper-ink`
  - Backdrop & Shell surfaces: `--backdrop-scrim`, `--nav-glass-bg`, `--nav-pill-bg`, `--nav-mobile-bg`, `--footer-bg`, `--footer-bg-end`

## Typography Scale & Rules
- **Font Families**:
  - `--font-display`: `'Space Grotesk', 'Inter', system-ui, sans-serif` (hero `<h1>`, major section `<h2>`, navbar wordmark)
  - `--font-body`: `'Inter', system-ui, -apple-system, sans-serif`
  - `--font-mono`: `'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace` (strictly course codes like `CSC211` and code blocks)
  - `--font-urdu`: `'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif` (applied on `[dir="rtl"]` and `.urdu-text` with `line-height: 2.15`)
- **Consolidated Body Type Scale**:
  - `--fs-heading`: `1.25rem` (20px)
  - `--fs-body`: `0.9375rem` (15px)
  - `--fs-sm`: `0.875rem` (14px)
  - `--fs-data`: `0.8125rem` (13px, strictly for dense GPA/Dashboard tables, metadata, and tabular counters)
  - Exempt display hierarchy: Hero `<h1>` (`clamp(2.75rem, 6vw, 4.75rem)`), PageHeader `<h1>`, major KPI values, and navbar wordmark.
  - Zero text smaller than `13px` (`0.8125rem`) above the fold.
- **Numeric Precision**: Apply `.tabular-nums` (`font-variant-numeric: tabular-nums`) to all timers, scores, GPA/CGPA figures, paper counts, and progress metrics.
- **Casing**: Use sentence case for UI labels, tabs, and table headers (`text-transform: uppercase` reserved strictly for course codes such as `CSC211`).

## Z-Index & Top Layer Architecture
All stacked UI uses a 5-tier scale in `:root`, while modals and palettes render natively in the browser Top Layer via `<dialog>.showModal()`:
- `--z-base: 1` (page flow, sticky progress indicators)
- `--z-sticky: 40` (sticky quiz/paper toolbars)
- `--z-nav: 60` (top header and mobile bottom navigation)
- `--z-popover: 80` (floating scroll-to-top button and anchored popovers)
- `--z-toast: 100` (toast notifications, cookie consent, offline/install banners)
- **Top Layer**: `Modal.jsx`, `AuthModal.jsx`, and `CommandPalette.jsx` use native `<dialog>` + `showModal()`, styled with `dialog::backdrop`, `@starting-style`, `transition-behavior: allow-discrete`, and scroll-locked via `body:has(dialog[open])`.

## Motion, Modern CSS & Accessibility Rules
- **Progressive Web Platform Features**:
  - View Transitions API (`document.startViewTransition`) with `view-transition-name` handoff from subject cards to `SubjectPapers` header.
  - CSS Container Queries (`@container`) on Home bento grids, Subjects cards, SubjectPapers rows, Dashboard layout, and GPA workspace panels.
  - CSS Scroll-Driven Animations (`animation-timeline: scroll(root block)` for `PaperView` progress bar; `animation-timeline: view()` for Home below-the-fold reveals, gated behind `@supports` and `prefers-reduced-motion: no-preference`).
  - CSS Anchor Positioning (`anchor-name` / `position-anchor` / `position-try-fallbacks: flip-block`) inside `@supports` with absolute fallback for search/course popovers.
  - `content-visibility: auto; contain-intrinsic-size: auto 180px;` on long lists of subjects, papers, questions, and quiz review items.
- **Accessibility & Craft Guardrails**:
  - WCAG 2.2 AA contrast (`>= 4.5:1` normal text, `>= 3:1` large text) in both light and dark modes, `44x44px` minimum touch targets, visible `:focus-visible` rings, full keyboard navigation across comboboxes, modals, quizzes, flashcards, and paper reader.
  - Full `@media (prefers-reduced-motion: reduce)` parity across CSS, Framer Motion (`MotionConfig reducedMotion="user"`), programmatic scroll (`instant`), and Remotion (`ExamLoopPlayer` paused keyframe poster).
  - **Zero Decorative Clutter**: Zero eyebrow/kicker labels above headings, zero decorative non-interactive pills/chips/badges, zero `STEP 01/02/03` numbering, zero `transition: all`, zero emoji used as UI icons (use `AppIcon` inline SVGs), and zero em-dashes in newly written UI copy.
