import { isSafeRedirectUrl, isSafePdfUrl } from './sanitize.js';

function getConfiguredAdminEmails() {
  const envList =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_EMAILS
      ? String(import.meta.env.VITE_ADMIN_EMAILS)
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
      : [];
  return new Set(envList);
}

/**
 * Checks if a user has administrator privileges.
 * Prioritizes Supabase server-controlled app_metadata.role === 'admin',
 * then falls back to VITE_ADMIN_EMAILS env allowlist for UI routing.
 * All database writes are independently enforced by Supabase RLS (`public.is_admin()`).
 */
export function isAdminUser(user) {
  if (!user) return false;
  if (user?.app_metadata?.role === 'admin') return true;
  const email = String(user?.email || '').trim().toLowerCase();
  if (!email) return false;
  return getConfiguredAdminEmails().has(email);
}

export function isSafeHttpUrl(value) {
  return isSafePdfUrl(value);
}

export { isSafeRedirectUrl, isSafePdfUrl };
