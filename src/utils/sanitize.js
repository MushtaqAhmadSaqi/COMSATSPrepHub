/**
 * Sanitize utilities for input handling, redirection safety, and avatar generation.
 */

export function isSafeRedirectUrl(targetUrl, baseOrigin = window.location.origin) {
  if (!targetUrl || typeof targetUrl !== 'string') return false;
  const trimmed = targetUrl.trim();

  // Allow safe relative paths, block protocol-relative //evil.com
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed, baseOrigin);
    return parsed.origin === baseOrigin;
  } catch {
    return false;
  }
}

export function sanitizePlainText(text = '', maxLength = 1000) {
  if (typeof text !== 'string') return '';
  // Strip script and html tags
  const clean = text
    .replace(/<[^>]*>?/gm, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
  return clean.slice(0, maxLength);
}

export function getInitialsAvatarDataUri(name = 'Student', bgColor = '#1e3a8a') {
  const parts = String(name).trim().split(/\s+/);
  const initials = (parts[0]?.[0] || 'S') + (parts[1]?.[0] || '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <circle cx="50" cy="50" r="50" fill="${bgColor}"/>
    <text x="50" y="55" font-family="system-ui, sans-serif" font-size="38" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials.toUpperCase()}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

