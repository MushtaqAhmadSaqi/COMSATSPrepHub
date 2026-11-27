/**
 * Sanitize utilities for input handling, redirection safety, PDF framing, and avatar generation.
 */

function getConfiguredSupabaseHost(overrideUrl) {
  const raw =
    overrideUrl ??
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
      ? import.meta.env.VITE_SUPABASE_URL
      : typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL
        ? process.env.VITE_SUPABASE_URL
        : '');
  if (!raw || typeof raw !== 'string') return '';
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' ? parsed.hostname.toLowerCase() : '';
  } catch {
    return '';
  }
}

function escapeXmlChars(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

export function isSafeRedirectUrl(
  targetUrl,
  baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://comsatsprephub.vercel.app'
) {
  if (!targetUrl || typeof targetUrl !== 'string') return false;
  if (/[\\\x00-\x1F\x7F]/.test(targetUrl)) return false;
  const trimmed = targetUrl.trim();
  if (!trimmed || trimmed.startsWith('//')) {
    return false;
  }

  try {
    const base = new URL(baseOrigin);
    const parsed = new URL(trimmed, base.origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    return parsed.origin === base.origin;
  } catch {
    return false;
  }
}

export function isSafePdfUrl(
  value,
  baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://comsatsprephub.vercel.app',
  supabaseUrl = undefined
) {
  if (!value || typeof value !== 'string') return false;
  if (/[\\\x00-\x1F\x7F]/.test(value)) return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('//')) return false;

  if (trimmed.startsWith('/')) {
    try {
      const parsedRel = new URL(trimmed, 'https://comsatsprephub.vercel.app');
      return parsedRel.origin === 'https://comsatsprephub.vercel.app';
    } catch {
      return false;
    }
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return false;
    const configuredSupabaseHost = getConfiguredSupabaseHost(supabaseUrl);
    return (
      url.origin === baseOrigin ||
      url.hostname.toLowerCase() === 'comsatsprephub.vercel.app' ||
      (Boolean(configuredSupabaseHost) && url.hostname.toLowerCase() === configuredSupabaseHost)
    );
  } catch {
    return false;
  }
}

export function sanitizePlainText(text = '', maxLength = 1000) {
  if (typeof text !== 'string') return '';
  let clean = text;
  let prev;
  do {
    prev = clean;
    clean = clean.replace(/<[^>]*>/g, '');
  } while (clean !== prev);

  clean = clean
    .replace(/<[^>]*/g, '')
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
  return clean.slice(0, maxLength);
}

export function getInitialsAvatarDataUri(name = 'Student', bgColor = '#1e40af') {
  const safeBg =
    typeof bgColor === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(bgColor.trim())
      ? bgColor.trim()
      : '#1e40af';
  const parts = String(name || 'Student')
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);
  const rawInitials = ((parts[0]?.[0] || 'S') + (parts[1]?.[0] || '')).toUpperCase().slice(0, 2);
  const safeInitials = escapeXmlChars(/^[A-Z0-9]{1,2}$/.test(rawInitials) ? rawInitials : 'S');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <circle cx="50" cy="50" r="50" fill="${safeBg}"/>
    <text x="50" y="55" font-family="system-ui, sans-serif" font-size="38" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${safeInitials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
