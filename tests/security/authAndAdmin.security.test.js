import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { signInWithOAuthSpy, signInWithPasswordSpy, signUpSpy, resetPasswordSpy } = vi.hoisted(
  () => ({
    signInWithOAuthSpy: vi.fn(),
    signInWithPasswordSpy: vi.fn(),
    signUpSpy: vi.fn(),
    resetPasswordSpy: vi.fn()
  })
);

vi.mock('../../src/services/supabase.js', () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args) => signInWithOAuthSpy(...args),
      signInWithPassword: (...args) => signInWithPasswordSpy(...args),
      signUp: (...args) => signUpSpy(...args),
      resetPasswordForEmail: (...args) => resetPasswordSpy(...args),
      updateUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    }
  }
}));

import { isAdminUser } from '../../src/utils/adminGuard.js';
import {
  validatePasswordStrength,
  getReadableAuthError,
  signInWithGoogle,
  requestPasswordReset
} from '../../src/services/auth.js';

describe('Suite D — Admin Privilege Escalation & Auth Security (SEC-01, SEC-09)', () => {
  beforeEach(() => {
    signInWithOAuthSpy.mockReset().mockResolvedValue({ error: null });
    signInWithPasswordSpy.mockReset();
    signUpSpy.mockReset();
    resetPasswordSpy.mockReset().mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('isAdminUser RBAC gating', () => {
    it('rejects null, empty, student users, and client-mutable user_metadata escalation', () => {
      expect(isAdminUser(null)).toBe(false);
      expect(isAdminUser(undefined)).toBe(false);
      expect(isAdminUser({ email: 'student@comsats.edu.pk' })).toBe(false);
      expect(isAdminUser({ email: 'mushtaqahmedsaqi1234@gmail.com' })).toBe(false);
      expect(isAdminUser({ email: 'mushtaqsaqi00@gmail.com' })).toBe(false);
      expect(isAdminUser({ email: 'saqijanitormiki@gmail.com' })).toBe(false);
      expect(isAdminUser({ user_metadata: { role: 'admin' }, app_metadata: { role: 'student' } })).toBe(
        false
      );
      expect(isAdminUser({ app_metadata: { role: 'authenticated' } })).toBe(false);
    });

    it('grants admin UI access ONLY when server-controlled app_metadata.role === admin in non-dev mode', () => {
      vi.stubEnv('DEV', false);
      vi.stubEnv('VITE_ADMIN_EMAILS', 'bypass@evil.example');
      expect(isAdminUser({ email: 'bypass@evil.example' })).toBe(false);
      expect(
        isAdminUser({ email: 'admin@comsats.edu.pk', app_metadata: { role: 'admin' } })
      ).toBe(true);
    });
  });

  describe('Password policy & enumeration-safe error messages', () => {
    it('enforces strong password rules (8..128 chars, upper, lower, digit)', () => {
      expect(validatePasswordStrength('short1A').valid).toBe(false);
      expect(validatePasswordStrength('alllowercase1').valid).toBe(false);
      expect(validatePasswordStrength('ALLUPPERCASE1').valid).toBe(false);
      expect(validatePasswordStrength('NoDigitsHere').valid).toBe(false);
      expect(validatePasswordStrength('A1b' + 'c'.repeat(126)).valid).toBe(false);
      expect(validatePasswordStrength('StrongPass123').valid).toBe(true);
    });

    it('never leaks whether an account exists in signup, login, or reset flows', async () => {
      const regMsg = getReadableAuthError({ message: 'User already registered' }, 'signup');
      expect(regMsg).not.toMatch(/taken|found|exists in database/i);
      expect(regMsg).toContain('sign in or reset');

      const loginMsg = getReadableAuthError({ message: 'Invalid login credentials' }, 'login');
      expect(loginMsg).toContain('Invalid email or password');

      const resetRes = await requestPasswordReset('unknown-student@example.com');
      expect(resetRes.ok).toBe(true);
      expect(resetRes.message).toMatch(/If an account exists/i);
    });
  });

  describe('OAuth redirect validation', () => {
    it('blocks unsafe custom redirects during Google OAuth sign-in', async () => {
      await signInWithGoogle('https://evil.example.com/steal');
      expect(signInWithOAuthSpy).toHaveBeenCalledTimes(1);
      const passedRedirect = signInWithOAuthSpy.mock.calls[0][0]?.options?.redirectTo;
      expect(passedRedirect).toBe(window.location.origin);

      signInWithOAuthSpy.mockClear();
      await signInWithGoogle('/\\evil.example.com');
      expect(signInWithOAuthSpy.mock.calls[0][0]?.options?.redirectTo).toBe(window.location.origin);
    });
  });
});
