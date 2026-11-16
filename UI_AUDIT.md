# COMSATSPrepHub UI Audit

Audit run: 16–17 November 2026

## Scope and method

- Reviewed the existing React/Vite UI, shared components, global styles, page styles, route handling, and current design tokens.
- Preserved the current palette, typography, logo, visual identity, routes, navigation, page structure, features, API behavior, Supabase/auth logic, sanitization, AI validation, and security headers.
- Tested 21 reachable route states in isolated Microsoft Edge at 360, 390, 768, 1280, and 1440 px in light and dark themes: 210 baseline combinations.
- Captured baseline screenshots at 360 and 1440 px, plus interactive scenario screenshots for timed quiz, curated fallback, an eight-course GPA layout, and long display math.
- Tested guest, sample-data, sign-in entry, and protected admin guard states. An authenticated account was not available in the isolated browser profile, so no authentication controls were bypassed and no credentials were invented.
- Expected Supabase and `/api/generate-quiz` requests were deliberately isolated. The sweep produced no console errors or browser exceptions.

Severity labels:

- **bug** — behavior, accessibility, clipping, or content order prevents or materially impairs use.
- **inconsistency** — a working pattern differs from the rest of the product or from an equivalent state.
- **polish** — the experience works but can be clearer, easier to touch, or more coherent.

## Shared shell and foundations

1. **bug — Repeated primary controls miss the 44 px touch-target minimum.** The mobile search, language, theme, and sign-in controls measure 40 × 40 px; the logo button is only 28 px high. This affects every route. **Proposed fix:** retain their visual size while expanding the interactive box to at least 44 × 44 px and preserving existing spacing.
2. **inconsistency — Touch-target sizing varies across equivalent controls.** Buttons, chips, icon actions, form fields, and compact links range from 15 to 43 px high. **Proposed fix:** establish shared 44 px minimums for non-inline interactive elements, with a compact visual treatment inside the larger hit area.
3. **polish — Focus treatment should be consolidated.** Interactive elements use several local styles, making keyboard focus less predictable between pages. **Proposed fix:** apply one high-contrast `:focus-visible` treatment to shared controls and retain component-specific shapes.
4. **polish — Motion safeguards should cover CSS effects as well as Framer Motion.** The app already uses user-preference reduced motion for Framer Motion. **Proposed fix:** ensure shimmer, decorative movement, and smooth scrolling also stop or simplify under `prefers-reduced-motion: reduce`.
5. **verified — Responsive containment is generally strong.** No route produced document-level horizontal scrolling in the 210-combination sweep. Hidden file inputs, hidden responsive labels, native checkbox dimensions, and decorative hero clipping were reviewed as intentional rather than defects.
6. **verified — Theme and font delivery are stable.** Light/dark rendering completed at every target width, and Inter, the display face, and Material Symbols loaded in the isolated browser.

## Home

1. **bug — Hero search controls are undersized on mobile.** The text field is about 31 px high and Explore is 40 px high. **Proposed fix:** make the combined search control at least 44 px high without changing its visual identity.
2. **polish — Suggestion contact actions are just below the target.** Email and WhatsApp actions measure about 42 px high. **Proposed fix:** add minimal vertical padding to reach 44 px.
3. **verified — Decorative clipping is intentional.** The hero’s hidden horizontal overflow contains background decoration and does not create page scrolling.

## About

1. **verified — No page-specific responsive, hierarchy, or overflow defect was found.** Apply only the shared navigation, focus, and touch-target refinements.

## Subjects

1. **bug — Department filter chips are too short for reliable touch input.** Chips measure about 39.5 px high. **Proposed fix:** increase the interactive height to 44 px while keeping the existing selected-state colors and horizontal scrolling behavior.
2. **polish — Subject search is one pixel below the shared target.** The field measures 43 px high. **Proposed fix:** align it with the shared 44 px form-control height.

## Subject papers

1. **bug — Breadcrumb actions have a 16 px-high hit area.** **Proposed fix:** add transparent block padding around each breadcrumb while preserving its compact visual appearance.
2. **bug — Bookmark actions are 38 × 38 px on mobile.** **Proposed fix:** expand each icon-button hit area to 44 × 44 px.
3. **polish — Filter controls are 42 px high.** **Proposed fix:** normalize the search, exam type, semester, year, and sort controls to 44 px.
4. **polish — Applied filters need a clearer mobile summary.** Values are visible inside individual selects, but an active multi-filter state is not obvious at a glance. **Proposed fix:** show a compact applied-filter count and a clear action only while filters are active; preserve the current stacked one-hand layout.
5. **verified — Paper cards remain contained at every tested width.** No mobile document overflow was detected.

## Paper view

1. **bug — Breadcrumb actions have 16 px-high hit areas.** **Proposed fix:** use the shared expanded breadcrumb target.
2. **bug — Zoom actions measure roughly 37–40 px.** **Proposed fix:** increase both controls to 44 × 44 px while retaining their current icons and grouping.
3. **verified — Long display math is contained.** The math container uses internal horizontal overflow and the 360 px scenario produced no document-level horizontal scroll. Preserve this containment while refining surrounding controls.

## Practice quiz

1. **bug — The timed-quiz timer is not visible during long-question review.** At 360 px, the timer begins at 199.5 px but moves to −1195.5 px after scrolling; the timer itself is unchanged at `7:30`, proving it is off-screen rather than expired. **Proposed fix:** make the timer/review header sticky within the quiz flow, account for the global header offset, and keep it readable in both themes.
2. **bug — The timer width is content-dependent.** Its baseline width is about 98.6 px and can shift as digits change. **Proposed fix:** use tabular numerals and a stable minimum inline size.
3. **bug — Question navigator targets are 36 × 36 px.** **Proposed fix:** enlarge them to 44 × 44 px without changing status colors.
4. **bug — Mark for Review is 38 px high.** **Proposed fix:** normalize it to 44 px.
5. **polish — Review states should remain distinguishable without color alone.** Current/answered/incorrect/marked states have useful color differences and accessible labels. **Proposed fix:** strengthen border/icon treatment and add a compact legend so marked and answered states remain immediately clear.

## AI quiz generator

1. **bug — Topic utility controls are undersized.** Random Topic is about 31 px high, Clear Topic is 24 × 24 px, and the suggestion toggle is 36 px high. **Proposed fix:** expand all three hit areas to 44 px while retaining the compact visual treatment.
2. **polish — The topic input reports clipped internal text at 360 px.** This is contained and does not widen the document, but long input is less comfortable to review. **Proposed fix:** reserve clear-button space explicitly and keep the text caret area unobstructed.

## AI quiz taker

1. **bug — Export and Hint controls have extremely small hit areas.** Export measures about 26 px high and the hint toggle about 16 px high. **Proposed fix:** expand each to a 44 px target while preserving the light inline styling.
2. **inconsistency — Curated fallback is identified only by the badge `Curated Bank · Medium`.** The interactive scenario confirmed there is no explanatory notice. **Proposed fix:** add a calm informational notice explaining that cloud generation was unavailable and curated questions were loaded instead; do not style it as an error.
3. **polish — Fallback origin should remain visible without overpowering the quiz.** **Proposed fix:** keep the existing badge and place the explanation once near the quiz heading rather than repeating it per question.

## Study Hub

1. **inconsistency — The no-due-flashcards state is plain centered text.** Other areas use structured cards and next steps. **Proposed fix:** render a compact empty state that confirms the student is caught up and points to adding a custom card or trying the Daily Challenge.
2. **polish — Flashcard interaction already supports Enter and Space.** Preserve the keyboard behavior and ensure the card’s focus ring uses the shared visible-focus treatment.

## Dashboard

1. **bug — Exam-reminder remove buttons are 28 × 28 px.** **Proposed fix:** enlarge the hit area to 44 × 44 px while keeping the icon visually compact.
2. **bug — The exam-title input is 33 px high; date and Add controls are about 42 px.** **Proposed fix:** normalize the reminder form to 44 px controls and maintain its mobile stack.
3. **inconsistency — Quiz History explains the empty state but provides no direct action.** **Proposed fix:** add a clear route to start a practice or AI quiz.
4. **inconsistency — The bookmarks section disappears when empty.** Students cannot tell where saved papers will appear. **Proposed fix:** keep the section visible with explanatory copy and a Browse papers action.
5. **inconsistency — Recent activity has explanatory copy but no next step.** **Proposed fix:** add a context-appropriate action to browse papers or start a quiz.
6. **polish — Guest/sample state communication is already present.** Preserve its clear distinction from synced account data.

## Account and settings

1. **verified — The measured 13 × 13 px native checkbox is not itself a defect because it sits inside a clickable label.** Preserve the full-label activation area and apply shared focus visibility.
2. **polish — Guest and authenticated settings should retain the same spacing rhythm.** This could not be visually compared in a signed-in profile; verify after implementation with an available authenticated test account rather than bypassing auth.

## Upload or request a paper

1. **verified — The 1 × 1 px file input is intentionally screen-reader-only.** Its visible label provides the interaction; no page overflow was found.
2. **polish — Preserve clear drag/drop, keyboard activation, selected-file, validation, and submit states while applying the shared focus treatment.

## FAQ and contact

1. **bug — Contact name/email fields are 37 px high and Send Message is 36 px high.** **Proposed fix:** normalize these controls to at least 44 px.
2. **polish — Keep validation and submission feedback adjacent to the form fields and announce status updates to assistive technology.

## Authentication

1. **bug — Forgot password has a 15 px-high hit area.** **Proposed fix:** expand the button’s block area to at least 44 px while retaining link-like typography.
2. **bug — Password visibility is 28 × 28 px.** **Proposed fix:** enlarge the button target to 44 × 44 px without visually enlarging the eye icon.
3. **bug — The Sign Up mode switch has a 17 px-high hit area.** **Proposed fix:** expand its clickable area to 44 px and preserve inline placement where space allows.
4. **polish — Maintain clear focus movement and announced validation when switching sign-in/sign-up modes.

## Terms, privacy, and disclaimer

1. **inconsistency — Privacy and Disclaimer routes change the page heading but still begin with Terms content.** The selected policy is not prioritized. **Proposed fix:** render the selected route’s section first while retaining all current legal content and route names.
2. **verified — Legal pages remain readable and contained at all tested widths and in both themes.

## Admin guards

1. **bug — The protected-route Sign In action is about 36.7 px high.** **Proposed fix:** normalize it to the shared 44 px button target.
2. **verified — Both admin routes correctly displayed the unauthenticated guard.** No authorization behavior was changed or bypassed.

## GPA calculator

1. **bug — Visual order contradicts the numbered workflow.** CSS places `04 / INTERNAL MARKS ESTIMATOR` before `01 / THIS SEMESTER`, including on desktop and mobile. **Proposed fix:** restore semantic `01 → 04` order and place the optional estimator after the core semester/CGPA workflow.
2. **bug — The header action overflows at 768 px.** The Export PDF / Print tag extends to about 778 px in a 768 px viewport. **Proposed fix:** let the header action wrap beneath the copy before it reaches the viewport edge.
3. **bug — Remove Course is only 36 px wide.** **Proposed fix:** expand it to a 44 × 44 px target.
4. **polish — Add Course and Reset Calculator measure about 41.6 and 42.4 px high.** **Proposed fix:** normalize them to 44 px.
5. **verified — Numeric mobile input is implemented.** All eight course credit inputs in the many-course scenario expose numeric input mode.
6. **verified — Inline validation is implemented.** Invalid credit and previous-GPA fields expose `aria-invalid`, described error text, and inline messages.
7. **verified — The eight-course mobile layout remains usable.** At 360 px, all eight rows remain inside the panel with no document-level horizontal scroll.

## Missing page

1. **bug — Back to Home is about 36.7 px high.** **Proposed fix:** normalize it to 44 px.
2. **polish — Preserve the concise recovery path and recognizable shared shell.

## Implementation order

1. Fix functional and responsive bugs: sticky/stable quiz timer, GPA order and 768 px overflow, legal content priority.
2. Apply shared foundations: 44 px targets, visible focus, reduced-motion coverage, and shared breadcrumb/icon-button behavior.
3. Refine page states: curated fallback notice, dashboard/bookmark/activity empty states, Study Hub completion state, quiz review legend, and mobile filter summary.
4. Re-run lint, automated tests, production build, smoke checklist, the 210-combination route sweep, and all four interactive scenarios; capture matching after screenshots.
