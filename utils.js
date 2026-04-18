/**
 * utils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Backward-compatibility shim.
 * All logic now lives in js/core.js — this file re-exports from there so
 * existing imports (e.g. import { supabase } from './utils.js') continue to work.
 */
export { supabase, escapeHtml, SUPABASE_URL, SUPABASE_KEY } from './js/core.js';
