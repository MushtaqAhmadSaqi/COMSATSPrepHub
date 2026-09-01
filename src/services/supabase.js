import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://xylyiscatznexduatjmg.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_K0t4H7M3LU96jy8_z_TJHg_ok_u-7HC';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
