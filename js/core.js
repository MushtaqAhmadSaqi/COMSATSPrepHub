/**
 * js/core.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for Supabase client + session helpers.
 * Import from this file instead of duplicating createClient() in every page.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';

// ── Config ────────────────────────────────────────────────────────────────────
export const SUPABASE_URL = 'https://xylyiscatznexduatjmg.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_K0t4H7M3LU96jy8_z_TJHg_ok_u-7HC';

// ── Supabase Client (singleton) ───────────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Auth Helpers ──────────────────────────────────────────────────────────────
export const auth = {
    /** Returns the active session object, or null */
    async getSession() {
        const { data } = await supabase.auth.getSession();
        return data?.session ?? null;
    },

    /** Signs the user out and reloads */
    async signOut() {
        await supabase.auth.signOut();
        window.location.reload();
    },

    /** Returns a friendly first-name from the user object */
    getUserName(user) {
        return (
            user?.user_metadata?.full_name?.split(' ')[0] ||
            user?.email?.split('@')[0] ||
            'Student'
        );
    },
};

// ── Utility: XSS-safe HTML escape ─────────────────────────────────────────────
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;');
}
