# COMSATSPrepHub Product Architecture & Surface Modes

## Mission
COMSATSPrepHub is an independent, student-built exam preparation platform for COMSATS University students across Islamabad, Lahore, Wah, Abbottabad, Attock, Sahiwal, Vehari, and Virtual Campus. It delivers verified past papers with KaTeX/Mermaid model solutions, timed and AI-generated practice quizzes, spaced-repetition flashcards, and an official 4.00-scale SGPA/CGPA/NAT academic calculator, built to perform reliably on mobile devices and campus Wi-Fi.

## Preserved Business Logic & Data Flows
The following service modules, calculations, and persistence contracts are authoritative and remain intact across all UI and platform upgrades:
- **Supabase Auth & Database (`src/services/supabase.js`, `src/services/auth.js`, `src/services/papersService.js`)**: Session management, PKCE auth, password recovery, RLS-bound moderation submissions, shared pending subject queries, and fallback paper provenance.
- **AI Quiz & OCR Endpoints (`src/services/geminiService.js`, `src/services/aiQuizService.js`, `api/generate-quiz.js`, `api/analyze-screenshot.js`)**: Fail-closed auth/rate-limit handling, JSON schema validation, and curated bank fallback provenance.
- **COMSATS GPA Engine (`src/services/gpaEngine.js`)**: Official 11-grade 4.00 scale, course credit bounds (1 to 6), retake quality-point replacement, sessional + 1-credit lab weighting, target CGPA planner, and NTS NAT aggregate (10% / 40% / 50%).
- **Local Workspace Persistence (`src/utils/studyTracker.js`)**: Multi-account localStorage workspace isolation (`pph_*` keys), study streaks, Leitner SRS flashcard intervals, revision deck stars, paper bookmarks, private paper notes, exam countdowns, and JSON export/clear.
- **Math & Bilingual Rendering (`src/components/MathText/MathText.jsx`, `mathRenderSafety.js`)**: KaTeX math rendering with text-safe fallback, strict Mermaid diagrams, Markdown tables, code blocks, and bilingual Urdu RTL (`[dir="rtl"]` + Noto Nastaliq Urdu).

## Route Surface Mode Classification
Every route in `src/App.jsx` belongs to one of three interaction modes so visual ambition and information density match student intent:

| Route Hash | Component | Surface Mode | Design Intent & Constraints |
| :--- | :--- | :--- | :--- |
| `/` (`home`) | `Home.jsx` | **Persuade Mode** | Monumental opening viewport, immediate utility via ARIA course combobox and quick-jump filters, single primary CTA, interactive Remotion Exam Loop showcase, asymmetric bento capabilities, and clean editorial pacing. |
| `#subjects` | `Subjects.jsx` | **Operate Mode** | Instant course & paper search with department filters, facet selects, `content-visibility: auto` grid performance, and shared View Transition entry. |
| `#subject-papers` | `SubjectPapers.jsx` | **Operate Mode** | Direct filter bar (exam type, semester, year, teacher, sort), virtualized paper rows, one-tap bookmarking, and zero decorative hero chrome. |
| `#quiz` | `Quiz.jsx` | **Operate Mode** | Subject selection, mode/difficulty configuration, distraction-free timed exam mode, keyboard shortcuts (`1-4`, `A-D`, `Enter`, `F`, `H`, `ArrowLeft`/`ArrowRight`), and missed-question retry. |
| `#ai-quiz-generator` | `AiQuizGenerator.jsx` | **Operate Mode** | Presets, anchor-positioned accessible course combobox, syllabus topic picker, keyboard radiogroups, and live quiz summary. |
| `#take-ai-quiz` | `TakeAiQuiz.jsx` | **Operate Mode** | Tactile active-learning quiz player with `1-4`/`Enter`/`H` shortcuts, calm semantic answer feedback, and revision deck starring. |
| `#study-hub` | `StudyHub.jsx` | **Operate Mode** | Tabbed workspace: 5-question daily challenge, 3D perspective Leitner flashcards (`Space` flip, `1/2/3` rating, reduced-motion crossfade), course cheat-sheets, and revision deck. |
| `#gpa` | `GpaCalculator.jsx` | **Operate Mode** | 4-tab academic calculator (Semester GPA, Target CGPA, Subject Marks + screenshot OCR, NAT Aggregate) with sticky live result rail and `tabular-nums` readouts. |
| `#dashboard` | `Dashboard.jsx` | **Operate Mode** | Structured study metrics, earned badges, accuracy history chart, weak-topic drills, bookmarked papers, recent activity feed, and exam countdowns. |
| `#upload` | `Upload.jsx` | **Operate Mode** | Tabbed upload dropzone and missing-paper request form with validation and moderation queue delivery. |
| `#account` | `Account.jsx` | **Operate Mode** | Campus preference, password recovery update, analytics consent toggle, JSON backup export, and local/cloud data clearing. |
| `#auth` | `Auth.jsx` | **Operate Mode** | Focused email/password and Google OAuth authentication card with password recovery mode. |
| `#admin-paste` | `AdminPaste.jsx` | **Operate Mode** | Guarded administrator JSON parser, LaTeX repair preview, and transactional `replace_paper_questions` publisher. |
| `#admin-generate` | `AdminGenerateQuizzes.jsx` | **Operate Mode** | Guarded administrator moderation queue and batch quiz generator. |
| `#paper-view` | `PaperView.jsx` | **Read Mode** | Comprehension-first exam paper reader (`<= 65ch` prose blocks, zoom controls, scroll-driven progress bar, `J/K/E/B/N` keyboard shortcuts, private notes drawer, KaTeX/Mermaid solutions, print stylesheet). |
| `#about`, `#team` | `About.jsx` | **Read Mode** | Clean editorial team profile and contributor roster with fixed avatar dimensions for zero CLS. |
| `#terms`, `#privacy`, `#disclaimer` | `Terms.jsx` | **Read Mode** | Calm legal and academic integrity prose layout prioritizing scanability and contrast. |
| `#faq`, `#contact` | `FaqContact.jsx` | **Read Mode** | Accessible disclosure FAQ accordion and support submission form. |
