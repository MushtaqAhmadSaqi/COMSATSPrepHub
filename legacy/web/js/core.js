/**
 * js/core.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for Supabase client + session helpers (Legacy).
 * Credentials must be provided via window.__SUPABASE_CONFIG__ or environment.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';

// ── Config (Read from runtime config — never hardcode keys in source) ─────────
const runtimeConfig = (typeof window !== 'undefined' && window.__SUPABASE_CONFIG__) || {};
export const SUPABASE_URL = runtimeConfig.url || '';
export const SUPABASE_KEY = runtimeConfig.anonKey || '';

// ── Supabase Client (singleton) ───────────────────────────────────────────────
export const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// ── Auth Helpers ──────────────────────────────────────────────────────────────
export const auth = {
  async getSession() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session ?? null;
  },

  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase signout error:', error);
    }
  },

  getUserName(user) {
    return (
      user?.user_metadata?.full_name?.split(' ')[0] ||
      user?.email?.split('@')[0] ||
      'Student'
    );
  }
};

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function debounce(fn, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}
