# Security Policy

## Reporting a Vulnerability
If you discover a security vulnerability in COMSATSPrepHub, please report it privately to **mushtaqahmedsaqi1234@gmail.com** rather than opening a public GitHub issue. We respond within 48 hours.

## Security Architecture Principles
1. **Server-Only Secrets**: `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` must never be prefixed with `VITE_` or imported inside `src/`. Enforced automatically by `npm run lint` (`scripts/lint.cjs`).
2. **Row-Level Security (RLS)**: Every Supabase table enforces RLS (`supabase/migrations/20261027000000_rls_security_schema.sql`). Write access to `past_papers` and `questions` is restricted to `public.is_admin()`.
3. **Strict Content Rendering**: Mermaid diagrams run under `securityLevel: 'strict'`, and user inputs are sanitized before rendering or prompt interpolation.
