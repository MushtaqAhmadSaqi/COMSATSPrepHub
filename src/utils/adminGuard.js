const ADMIN_EMAILS = new Set([
  'mushtaqsaqi00@gmail.com',
  'saqijanitormiki@gmail.com'
]);

export function isAdminUser(user) {
  const email = String(user?.email || '').trim().toLowerCase();
  return ADMIN_EMAILS.has(email);
}

export function isSafeHttpUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
