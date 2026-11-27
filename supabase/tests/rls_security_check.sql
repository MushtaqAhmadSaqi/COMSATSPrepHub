-- =============================================================================
-- COMSATSPrepHub — Transactional RLS & Authorization Regression Check (Suite G)
-- =============================================================================
-- SAFE TO RUN IN SUPABASE SQL EDITOR OR STAGING/LOCAL POSTGRES:
-- Wrapped in BEGIN ... ROLLBACK so zero test rows persist.
-- Run as a privileged DB role (postgres / supabase_admin) to SET LOCAL ROLE.

BEGIN;

DO $$
DECLARE
  v_user_a uuid := '11111111-1111-4111-8111-111111111111';
  v_user_b uuid := '22222222-2222-4222-8222-222222222222';
  v_admin  uuid := '33333333-3333-4333-8333-333333333333';
  v_count  integer;
  v_denied boolean;
BEGIN
  -- Seed minimal auth.users rows if running inside a full Supabase database
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    INSERT INTO auth.users (id, email)
    VALUES
      (v_user_a, 'student-a@test.local'),
      (v_user_b, 'student-b@test.local'),
      (v_admin,  'admin@test.local')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Seed User A activity & private quiz attempt as table owner before dropping privilege
  INSERT INTO public.user_activity (user_id, client_id, type, title, description, metadata)
  VALUES (v_user_a, 'test-client-a', 'quiz', 'Student A Quiz', 'Private attempt', '{}'::jsonb);

  INSERT INTO public.paper_submissions (id, user_id, type, subject_code, title, status)
  VALUES ('44444444-4444-4444-8444-444444444444', v_user_a, 'request', 'CSC211', 'User A Request', 'pending')
  ON CONFLICT (id) DO NOTHING;

  -- ===========================================================================
  -- 1. ANON ROLE CHECKS
  -- ===========================================================================
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claims', '{}', true);

  -- Anon cannot insert into past_papers
  v_denied := false;
  BEGIN
    INSERT INTO public.past_papers (id, subject_code, subject_name, title, exam_type, year)
    VALUES (gen_random_uuid(), 'CSC999', 'Injected', 'Anon Paper', 'Midterm', 2026);
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'RLS FAIL: anon was allowed to insert into public.past_papers';
  END IF;

  -- Anon cannot submit pre-approved status into paper_submissions
  v_denied := false;
  BEGIN
    INSERT INTO public.paper_submissions (type, subject_code, title, status)
    VALUES ('upload', 'CSC211', 'Spoofed Approved', 'approved');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'RLS FAIL: anon inserted status=approved into paper_submissions';
  END IF;

  -- Anon cannot call server-only reserve_ai_quiz_generation RPC
  v_denied := false;
  BEGIN
    PERFORM * FROM public.reserve_ai_quiz_generation(v_user_a, 10);
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'RLS FAIL: anon executed reserve_ai_quiz_generation RPC';
  END IF;

  RESET ROLE;

  -- ===========================================================================
  -- 2. AUTHENTICATED NON-ADMIN USER B (IDOR & PRIVILEGE ESCALATION CHECKS)
  -- ===========================================================================
  SET LOCAL ROLE authenticated;
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', v_user_b::text,
      'role', 'authenticated',
      'user_metadata', json_build_object('role', 'admin'),
      'app_metadata', json_build_object('role', 'student')
    )::text,
    true
  );

  -- Spoofed user_metadata.role='admin' MUST NOT make public.is_admin() true
  IF public.is_admin() IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'RLS FAIL: public.is_admin() trusted client-mutable user_metadata';
  END IF;

  -- User B must NOT see User A private activity rows
  SELECT COUNT(*) INTO v_count FROM public.user_activity WHERE user_id = v_user_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'IDOR FAIL: User B read % rows from User A user_activity', v_count;
  END IF;

  -- User B must NOT insert activity attributed to User A
  v_denied := false;
  BEGIN
    INSERT INTO public.user_activity (user_id, client_id, type, title)
    VALUES (v_user_a, 'spoof', 'quiz', 'Cross-user write');
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'IDOR FAIL: User B inserted user_activity owned by User A';
  END IF;

  -- User B must NOT read User A's pending submission
  SELECT COUNT(*) INTO v_count
  FROM public.paper_submissions
  WHERE id = '44444444-4444-4444-8444-444444444444';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'IDOR FAIL: User B read User A paper_submission';
  END IF;

  -- User B must NOT mutate ai_quiz_usage directly
  v_denied := false;
  BEGIN
    INSERT INTO public.ai_quiz_usage (user_id, used_count) VALUES (v_user_b, 0);
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'RLS FAIL: non-admin User B inserted directly into ai_quiz_usage';
  END IF;

  -- User B must NOT mutate past_papers or questions
  v_denied := false;
  BEGIN
    INSERT INTO public.questions (id, question_text) VALUES (gen_random_uuid(), 'Unauthorized');
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'RLS FAIL: non-admin User B inserted into public.questions';
  END IF;

  RESET ROLE;

  -- ===========================================================================
  -- 3. AUTHENTICATED ADMIN (JWT app_metadata.role = 'admin')
  -- ===========================================================================
  SET LOCAL ROLE authenticated;
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', v_admin::text,
      'role', 'authenticated',
      'app_metadata', json_build_object('role', 'admin')
    )::text,
    true
  );

  IF public.is_admin() IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'RLS FAIL: public.is_admin() did not recognize app_metadata.role=admin';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.paper_submissions
  WHERE id = '44444444-4444-4444-8444-444444444444';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'RLS FAIL: admin could not inspect moderation queue row';
  END IF;

  RESET ROLE;

  RAISE NOTICE 'COMSATSPrepHub Suite G RLS security checks PASSED cleanly.';
END $$;

ROLLBACK;
