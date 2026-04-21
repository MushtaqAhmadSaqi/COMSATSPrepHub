/**
 * user-state.js
 * Shared Supabase auth helpers used across all pages.
 * Auth/session helpers that reuse the shared Supabase core client.
 */

import { supabase, SUPABASE_URL, SUPABASE_KEY } from './js/core.js';

export { supabase, SUPABASE_URL, SUPABASE_KEY };

/**
 * Returns the current Supabase session, or null if not logged in.
 */
export async function getUserSession() {
    const { data } = await supabase.auth.getSession();
    return data?.session ?? null;
}

/**
 * Returns a display-friendly name from the Supabase user object.
 * Falls back to the email prefix if no full_name is set.
 * @param {object} user - Supabase user object
 * @returns {string}
 */
export function getDisplayName(user) {
    if (!user) return 'Student';
    const full = user.user_metadata?.full_name;
    if (full && full.trim()) return full.trim();
    // Fall back to the part before @ in the email
    return user.email?.split('@')[0] ?? 'Student';
}

/**
 * Returns just the first name from the display name.
 * @param {object} user - Supabase user object
 * @returns {string}
 */
export function getFirstName(user) {
    return getDisplayName(user).split(' ')[0];
}

/**
 * Signs the user out and redirects to the given path.
 * @param {string} redirectPath - e.g. '../index.html' or 'index.html'
 */
export async function signOutAndRedirect(redirectPath = 'index.html') {
    await supabase.auth.signOut();
    window.location.href = redirectPath;
}

/**
 * Auth guard — call at the top of protected pages.
 * Redirects to loginPath if no active session.
 * @param {string} loginPath - path to your login page
 * @returns {object|null} session object if authenticated
 */
export async function requireAuth(loginPath = 'AuthScreen/auth.html') {
    const session = await getUserSession();
    if (!session) {
        window.location.href = loginPath;
        return null;
    }
    return session;
}
