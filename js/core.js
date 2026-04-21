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

// ── Feedback System (Toast Notifications) ─────────────────────────────────────
/**
 * Shows a non-intrusive feedback message (toast).
 * @param {Object} options { type, message, duration, banner }
 */
export function showFeedbackStatus({ type = 'info', message = '', duration = 4000, banner = false }) {
    const container = document.getElementById('feedback-container');
    if (!container) {
        console.warn('Feedback container missing. Falling back to console.');
        console.log(`[${type.toUpperCase()}] ${message}`);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `feedback-toast feedback-${type} transform translate-x-full opacity-0 transition-all duration-300 ease-out flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border mb-3 min-w-[320px] max-w-md bg-white dark:bg-slate-900 border-gray-200 dark:border-white/10`;
    
    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };

    const colors = {
        success: 'text-emerald-500',
        error: 'text-red-500',
        warning: 'text-amber-500',
        info: 'text-blue-500'
    };

    toast.innerHTML = `
        <span class="material-symbols-outlined ${colors[type] || colors.info}">${icons[type] || icons.info}</span>
        <div class="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">${message}</div>
        <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-2" onclick="this.parentElement.remove()">
            <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    });

    // Optional Global Banner
    if (banner && window.updateGlobalFeedback) {
        window.updateGlobalFeedback({
            type,
            message,
            duration: duration > 0 ? duration + 2000 : 0
        });
    }

    // Auto-remove
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

/**
 * Universal Error Handling Helper for API calls.
 * @param {Error} error The error object
 * @param {String} message User-friendly message
 */
export function handleApiError(error, message = 'An error occurred. Please try again later.') {
    console.error('[API ERROR]', error);
    showFeedbackStatus({
        type: 'error',
        message: message,
        duration: 5000
    });
}

// Attach to window for legacy scripts
if (typeof window !== 'undefined') {
    window.showFeedbackStatus = showFeedbackStatus;
    window.handleApiError = handleApiError;
}

// ── Utility: XSS-safe HTML escape ─────────────────────────────────────────────
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;');
}

// ── Utility: Debounce ────────────────────────────────────────────────────────
export function debounce(fn, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), wait);
    };
}
