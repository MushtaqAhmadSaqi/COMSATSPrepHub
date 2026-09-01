import { supabase } from './supabase';

export function getReadableAuthError(error, mode = 'login') {
  if (!error) return 'An error occurred. Please try again.';
  const raw = String(error.message || error).toLowerCase();

  if (raw.includes('invalid login credentials')) return 'Wrong email or password. Please check and try again.';
  if (raw.includes('email not confirmed')) return 'Please verify your email first.';
  if (raw.includes('user already registered')) return 'An account with this email already exists.';
  if (raw.includes('password should be at least')) return 'Password must be at least 8 characters long.';
  if (raw.includes('unable to validate email')) return 'Please enter a valid email address.';
  return error.message || 'Authentication error. Please try again.';
}

export async function signInWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) return { ok: false, error: getReadableAuthError(error, 'login') };
    return { ok: true, session: data.session, user: data.user };
  } catch (err) {
    return { ok: false, error: getReadableAuthError(err, 'login') };
  }
}

export async function signUpWithEmail(fullName, email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() }
      }
    });
    if (error) return { ok: false, error: getReadableAuthError(error, 'signup') };
    return { ok: true, session: data.session, user: data.user };
  } catch (err) {
    return { ok: false, error: getReadableAuthError(err, 'signup') };
  }
}

export async function signInWithGoogle() {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) return { ok: false, error: getReadableAuthError(error, 'google') };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: getReadableAuthError(err, 'google') };
  }
}

export async function signOutUser() {
  await supabase.auth.signOut();
}
