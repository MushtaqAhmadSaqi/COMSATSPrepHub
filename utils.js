/**
 * utils.js - Centralized configuration and utility functions
 */

// 1. Pinned Secure Dependency for Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';

// 2. Centralized Config
export const SUPABASE_URL = 'https://xylyiscatznexduatjmg.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_K0t4H7M3LU96jy8_z_TJHg_ok_u-7HC';

// Initialize and export the single supabase client instance
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 3. Centralized Input Sanitization (XSS Prevention)
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
