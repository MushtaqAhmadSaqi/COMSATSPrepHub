# Smoke Test Checklist

Run this checklist after each major frontend change.

## Core pages
- `index.html` loads and layout injects header/footer/mobile nav.
- `subjects.html` and `subject-papers.html` fetch and render content.
- `quiz.html` loads quiz cards and completes quiz flow.
- `paper-view.html` loads paper/questions and reveals model answers.
- `dashboard.html` redirects unauthenticated users.

## Security and auth
- Admin pages redirect non-admin users: `admin-paste.html`, `admin-generate-quizzes.html`.
- DB-driven text does not execute HTML/JS payloads in quiz/paper views.
- Mermaid diagrams render without enabling loose security mode.

## Mobile stability
- Swipe gestures do not trigger accidental route changes from interactive controls.
- Header and bottom nav hide/show smoothly while scrolling.
- Quiz mode hides bottom nav during active questions and restores after completion.

## Accessibility baseline
- Quiz options can be selected and announced correctly after render.
- Buttons/links remain reachable and visible with keyboard focus.

