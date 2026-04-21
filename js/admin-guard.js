/**
 * js/admin-guard.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared admin-page guard helper.
 *
 * Purpose:
 * - remove duplicated admin allowlist checks from admin pages
 * - keep auth + admin redirect logic in one place
 * - make future backend / RLS migration easier
 *
 * Important:
 * This improves maintainability and consistency,
 * but frontend allowlist checks are still NOT real security by themselves.
 * Real protection must also exist in Supabase policies / backend rules.
 */

import { requireAuth } from '../user-state.js';

const DEFAULT_ADMIN_ALLOWLIST = [
  'mushtaqsaqi00@gmail.com'
];

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function createAdminAllowlist(extraEmails = []) {
  return new Set(
    [...DEFAULT_ADMIN_ALLOWLIST, ...extraEmails]
      .map(normalizeEmail)
      .filter(Boolean)
  );
}

export function isAdminEmail(email, allowlist = createAdminAllowlist()) {
  return allowlist.has(normalizeEmail(email));
}

export function getAdminEmail(session) {
  return normalizeEmail(session?.user?.email);
}

export function showAdminBlockedMessage(message = 'Admin access only.') {
  // Lightweight visible message before redirect
  try {
    const existing = document.getElementById('admin-access-blocked');
    if (existing) existing.remove();

    const box = document.createElement('div');
    box.id = 'admin-access-blocked';
    box.className =
      'fixed inset-x-4 top-4 z-[9999] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-lg';

    box.textContent = message;
    document.body.appendChild(box);
  } catch (error) {
    console.warn('Unable to show admin blocked message:', error);
  }
}

export async function guardAdminPage({
  authRedirect = 'auth.html',
  unauthorizedRedirect = 'index.html',
  allowlist = createAdminAllowlist(),
  unauthorizedMessage = 'Admin access only.'
} = {}) {
  const session = await requireAuth(authRedirect);
  if (!session) {
    return {
      ok: false,
      session: null,
      email: '',
      reason: 'unauthenticated'
    };
  }

  const email = getAdminEmail(session);
  const allowed = isAdminEmail(email, allowlist);

  if (!allowed) {
    showAdminBlockedMessage(unauthorizedMessage);

    window.setTimeout(() => {
      window.location.href = unauthorizedRedirect;
    }, 600);

    return {
      ok: false,
      session,
      email,
      reason: 'forbidden'
    };
  }

  return {
    ok: true,
    session,
    email,
    reason: null
  };
}
