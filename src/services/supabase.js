import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

// Read exclusively from environment variables — never hardcode project credentials in source code
export const SUPABASE_URL = String(import.meta.env?.VITE_SUPABASE_URL || '').trim();
export const SUPABASE_KEY = String(import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

function createFallbackSupabaseClient() {
  const unconfiguredError = {
    message: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  };

  const createQueryBuilder = () => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      ilike: () => builder,
      or: () => builder,
      is: () => builder,
      order: () => builder,
      limit: () => builder,
      single: async () => ({ data: null, error: unconfiguredError }),
      insert: () => builder,
      update: () => builder,
      upsert: () => builder,
      delete: () => builder,
      then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve)
    };
    return builder;
  };

  return {
    from: () => createQueryBuilder(),
    rpc: async () => ({ data: null, error: unconfiguredError }),
    auth: {
      async getSession() {
        return { data: { session: null }, error: null };
      },
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      async signInWithPassword() {
        return { data: null, error: unconfiguredError };
      },
      async signUp() {
        return { data: null, error: unconfiguredError };
      },
      async signInWithOAuth() {
        return { data: null, error: unconfiguredError };
      },
      async resetPasswordForEmail() {
        return { data: null, error: null };
      },
      async updateUser() {
        return { data: null, error: unconfiguredError };
      },
      async signOut() {
        return { error: null };
      }
    }
  };
}

/**
 * Supabase client note on session storage:
 * By default, @supabase/supabase-js stores the short-lived access JWT and refresh token
 * in localStorage under `sb-<project-ref>-auth-token` for automatic PKCE session persistence.
 * No custom sensitive tokens or passwords are ever written to localStorage/sessionStorage.
 */
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : createFallbackSupabaseClient();

export const authHelper = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data?.session ?? null;
  },

  async getAccessToken() {
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token ?? null;
    } catch {
      return null;
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) logger.error('authHelper.signOut', error);
  },

  getUserName(user) {
    return (
      user?.user_metadata?.full_name?.split(' ')[0] ||
      user?.email?.split('@')[0] ||
      'Student'
    );
  }
};
