import { supabase } from './supabase';
import { isSafeRedirectUrl } from '../utils/sanitize';
import { logger } from '../utils/logger';

/**
 * Validates password strength:
 * - Minimum 8 characters, maximum 128 characters
 * - At least one lowercase letter, one uppercase letter, and one digit
 */
export function validatePasswordStrength(password = '') {
  const pwd = String(password || '');
  if (pwd.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (pwd.length > 128) {
    return { valid: false, error: 'Password must be 128 characters or fewer.' };
  }
  if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/\d/.test(pwd)) {
    return {
      valid: false,
      error: 'Password must include uppercase, lowercase, and at least one number.'
    };
  }
  return { valid: true, error: '' };
}

/**
 * Normalizes auth error messages without enabling account enumeration.
 */
export function getReadableAuthError(error, mode = 'login') {
  if (!error) return 'An error occurred. Please try again.';
  const raw = String(error.message || error).toLowerCase();

  if (raw.includes('invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (raw.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }
  if (raw.includes('user already registered') || raw.includes('already exists')) {
    // Enumeration-safe guidance
    return 'Unable to complete registration with this email. If you already have an account, please sign in or reset your password.';
  }
  if (raw.includes('rate limit') || raw.includes('too many requests')) {
    return 'Too many attempts. Please wait a minute before trying again.';
  }
  if (raw.includes('password should be at least')) {
    return 'Password must be at least 8 characters long and include uppercase, lowercase, and a number.';
  }
  if (raw.includes('unable to validate email') || raw.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (raw.includes('supabase is not configured')) {
    return 'Authentication service is not configured in this environment.';
  }
  return mode === 'signup'
    ? 'Could not create account right now. Please try again.'
    : 'Authentication could not be completed. Please try again.';
}

export async function signInWithEmail(email, password) {
  try {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });
    if (error) return { ok: false, error: getReadableAuthError(error, 'login') };
    return { ok: true, session: data.session, user: data.user };
  } catch (err) {
    logger.error('auth.signInWithEmail', err);
    return { ok: false, error: getReadableAuthError(err, 'login') };
  }
}

export async function signUpWithEmail(fullName, email, password, extraMeta = {}) {
  const pwdCheck = validatePasswordStrength(password);
  if (!pwdCheck.valid) {
    return { ok: false, error: pwdCheck.error };
  }

  try {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(fullName || '').trim().slice(0, 80);
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          campus: extraMeta.campus || 'Islamabad',
          department: extraMeta.department || 'CS & IT'
        }
      }
    });
    if (error) return { ok: false, error: getReadableAuthError(error, 'signup') };
    return { ok: true, session: data.session, user: data.user };
  } catch (err) {
    logger.error('auth.signUpWithEmail', err);
    return { ok: false, error: getReadableAuthError(err, 'signup') };
  }
}

export async function signInWithGoogle(customRedirect) {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectTo =
      customRedirect && isSafeRedirectUrl(customRedirect, origin)
        ? customRedirect
        : origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if (error) return { ok: false, error: getReadableAuthError(error, 'google') };
    return { ok: true };
  } catch (err) {
    logger.error('auth.signInWithGoogle', err);
    return { ok: false, error: getReadableAuthError(err, 'google') };
  }
}

export async function requestPasswordReset(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (typeof supabase.auth.resetPasswordForEmail === 'function') {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${origin}/#account`
      });
      if (error && !String(error.message || '').toLowerCase().includes('not configured')) {
        logger.warn('auth.requestPasswordReset', error.message);
      }
    }
    // Always return an enumeration-safe confirmation message
    return {
      ok: true,
      message: 'If an account exists for that email, a password reset link has been sent.'
    };
  } catch (err) {
    logger.error('auth.requestPasswordReset', err);
    return {
      ok: true,
      message: 'If an account exists for that email, a password reset link has been sent.'
    };
  }
}

export async function updateUserPassword(newPassword) {
  const check = validatePasswordStrength(newPassword);
  if (!check.valid) return { ok: false, error: check.error };

  try {
    if (typeof supabase.auth.updateUser !== 'function') {
      return { ok: false, error: 'Password update requires an active Supabase connection.' };
    }
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: getReadableAuthError(error, 'update') };
    return { ok: true, user: data?.user };
  } catch (err) {
    logger.error('auth.updateUserPassword', err);
    return { ok: false, error: 'Could not update password. Please try again.' };
  }
}

export async function signOutUser() {
  await supabase.auth.signOut();
}
