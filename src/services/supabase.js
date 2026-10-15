import { createClient } from '@supabase/supabase-js';

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
      then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve)
    };
    return builder;
  };

  return {
    from: () => createQueryBuilder(),
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
      async signOut() {
        return { error: null };
      }
    }
  };
}

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : createFallbackSupabaseClient();

export const authHelper = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data?.session ?? null;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Sign out error:', error);
  },

  getUserName(user) {
    return (
      user?.user_metadata?.full_name?.split(' ')[0] ||
      user?.email?.split('@')[0] ||
      'Student'
    );
  }
};
