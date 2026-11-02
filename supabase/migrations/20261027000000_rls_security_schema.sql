-- =============================================================================
-- COMSATSPrepHub — Complete Production RLS & Security Schema (All 10 Tables)
-- =============================================================================

-- 1. Server-controlled Admin Check (reads JWT app_metadata, which users CANNOT self-modify)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- 2. Profiles Table (Prevents Privilege Escalation)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text CHECK (char_length(full_name) <= 100),
  campus text DEFAULT 'Islamabad' CHECK (char_length(campus) <= 40),
  department text DEFAULT 'CS & IT' CHECK (char_length(department) <= 60),
  leaderboard_opt_in boolean DEFAULT false,
  xp integer DEFAULT 0 CHECK (xp >= 0),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile or opted-in leaderboard profiles" ON public.profiles;
CREATE POLICY "Users can read own profile or opted-in leaderboard profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR leaderboard_opt_in = true OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Past Papers & Questions (Public Read, Admin-Only Write)
ALTER TABLE IF EXISTS public.past_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow write access on past_papers" ON public.past_papers;
DROP POLICY IF EXISTS "Allow public read on past_papers" ON public.past_papers;
CREATE POLICY "Allow public read on past_papers"
  ON public.past_papers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow admin write access on past_papers" ON public.past_papers;
CREATE POLICY "Allow admin write access on past_papers"
  ON public.past_papers FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow write access on questions" ON public.questions;
DROP POLICY IF EXISTS "Allow public read on questions" ON public.questions;
CREATE POLICY "Allow public read on questions"
  ON public.questions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow admin write access on questions" ON public.questions;
CREATE POLICY "Allow admin write access on questions"
  ON public.questions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. User-Scoped Study Tables (Strict Owner-Only RLS with WITH CHECK)
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'user_subject_progress',
    'user_quiz_attempts',
    'user_visits',
    'user_gpa_data',
    'paper_bookmarks'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Owner full access on %I" ON public.%I;', tbl, tbl);
      EXECUTE format(
        'CREATE POLICY "Owner full access on %I" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);',
        tbl, tbl
      );
    END IF;
  END LOOP;
END $$;

-- 5. Paper Submissions / Moderation Queue
CREATE TABLE IF NOT EXISTS public.paper_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('upload', 'request', 'report', 'contact')),
  subject_code text NOT NULL CHECK (char_length(subject_code) <= 20),
  title text NOT NULL CHECK (char_length(title) <= 160),
  contributor text CHECK (char_length(contributor) <= 80),
  details text CHECK (char_length(details) <= 1000),
  file_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.paper_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit papers or reports" ON public.paper_submissions;
CREATE POLICY "Users can submit papers or reports"
  ON public.paper_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "Users read own submissions or admins read all" ON public.paper_submissions;
CREATE POLICY "Users read own submissions or admins read all"
  ON public.paper_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can update or delete submissions" ON public.paper_submissions;
CREATE POLICY "Admins can update or delete submissions"
  ON public.paper_submissions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. AI Quiz Usage Quota Table & Atomic RPC (Server-Only Mutation)
CREATE TABLE IF NOT EXISTS public.ai_quiz_usage (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_quiz_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own AI quiz usage" ON public.ai_quiz_usage;
CREATE POLICY "Users can view own AI quiz usage"
  ON public.ai_quiz_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.reserve_ai_quiz_generation(p_user_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(allowed boolean, used integer, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer;
BEGIN
  INSERT INTO public.ai_quiz_usage (user_id, used_count, updated_at)
  VALUES (p_user_id, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.ai_quiz_usage
  SET used_count = used_count + 1,
      updated_at = now()
  WHERE user_id = p_user_id AND used_count < p_limit
  RETURNING used_count INTO v_used;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_used, GREATEST(0, p_limit - v_used);
  ELSE
    SELECT used_count INTO v_used FROM public.ai_quiz_usage WHERE user_id = p_user_id;
    RETURN QUERY SELECT false, COALESCE(v_used, p_limit), 0;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_ai_quiz_generation(uuid, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_quiz_generation(uuid, integer) TO service_role;
