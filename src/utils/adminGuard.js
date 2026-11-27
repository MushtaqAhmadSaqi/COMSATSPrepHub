import { isSafeRedirectUrl, isSafePdfUrl } from './sanitize.js';

function getDevAdminEmails() {
  const isDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
  if (!isDev) return new Set();
  const envList = import.meta.env?.VITE_ADMIN_EMAILS
    ? String(import.meta.env.VITE_ADMIN_EMAILS)
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    : [];
  return new Set(envList);
}

/**
 * Checks if a user has administrator privileges.
 * 1. Checks Supabase server-controlled app_metadata.role === 'admin'
 * 2. In local DEV builds only, optionally checks VITE_ADMIN_EMAILS
 * Note: Database write security is independently enforced by Supabase RLS (public.is_admin()).
 */
export function isAdminUser(user) {
  if (!user) return false;
  if (user?.app_metadata?.role === 'admin') return true;
  const devAdmins = getDevAdminEmails();
  if (devAdmins.size === 0) return false;
  const email = String(user?.email || '').trim().toLowerCase();
  return Boolean(email && devAdmins.has(email));
}

export function isSafeHttpUrl(value) {
  return isSafePdfUrl(value);
}

export { isSafeRedirectUrl, isSafePdfUrl };
