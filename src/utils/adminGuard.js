import { isSafeRedirectUrl, isSafePdfUrl } from './sanitize.js';

const DEFAULT_ADMIN_EMAILS = [
  'mushtaqahmedsaqi1234@gmail.com',
  'mushtaqsaqi00@gmail.com',
  'saqijanitormiki@gmail.com'
];

function getConfiguredAdminEmails() {
  const envList =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_EMAILS
      ? String(import.meta.env.VITE_ADMIN_EMAILS)
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
      : [];
  return new Set([...DEFAULT_ADMIN_EMAILS, ...envList]);
}

/**
 * Checks if a user has administrator privileges.
 * 1. Checks Supabase server-controlled app_metadata.role === 'admin'
 * 2. Checks configured admin email allowlist (DEFAULT_ADMIN_EMAILS + VITE_ADMIN_EMAILS)
 * Note: Database write security is independently enforced by Supabase RLS (public.is_admin()).
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
