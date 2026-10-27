import { isSafeRedirectUrl } from './sanitize.js';

const DEFAULT_ADMIN_EMAILS = [
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
 * Checks Supabase app_metadata.role first (server-controlled), then falls back
 * to configured admin email allowlist.
 * Note: All write operations are independently enforced by Supabase RLS (`public.is_admin()`).
 */
export function isAdminUser(user) {
  if (!user) return false;
  if (user?.app_metadata?.role === 'admin') return true;
  const email = String(user?.email || '').trim().toLowerCase();
  if (!email) return false;
  return getConfiguredAdminEmails().has(email);
}

export function isSafeHttpUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export { isSafeRedirectUrl };
