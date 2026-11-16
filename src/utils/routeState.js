export function resolveSubjectFromRoute(code, subjects) {
  if (!code) return null;
  const normalized = String(code).trim().toUpperCase();
  if (!normalized) return null;
  const list = Array.isArray(subjects) ? subjects : [];
  return list.find((subject) => String(subject?.code || '').toUpperCase() === normalized) || null;
}

export function getRouteSubjectCode(event, fallbackCode) {
  const stateCode = event?.state?.code;
  if (stateCode) return String(stateCode);
  return fallbackCode || null;
}

export function isPasswordRecoveryUrl(hash = '', search = '') {
  const raw = `${hash || ''}${search || ''}`;
  return /(?:[#?&])type=recovery(?:&|$)/.test(raw);
}
