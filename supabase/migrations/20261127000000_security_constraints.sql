-- =============================================================================
-- COMSATSPrepHub — Defense-in-Depth Input & Payload Constraints (SEC-10)
-- =============================================================================
-- Additive, idempotent constraints reinforcing existing RLS policies on
-- public.paper_submissions and public.user_activity.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'paper_submissions'
  ) THEN
    ALTER TABLE public.paper_submissions
      DROP CONSTRAINT IF EXISTS chk_paper_submissions_subject_nonempty,
      DROP CONSTRAINT IF EXISTS chk_paper_submissions_title_nonempty,
      DROP CONSTRAINT IF EXISTS chk_paper_submissions_file_path_safe;

    ALTER TABLE public.paper_submissions
      ADD CONSTRAINT chk_paper_submissions_subject_nonempty
        CHECK (char_length(btrim(subject_code)) > 0) NOT VALID,
      ADD CONSTRAINT chk_paper_submissions_title_nonempty
        CHECK (char_length(btrim(title)) > 0) NOT VALID,
      ADD CONSTRAINT chk_paper_submissions_file_path_safe
        CHECK (
          file_path IS NULL OR (
            char_length(file_path) <= 500
            AND (file_path ~* '^https://' OR file_path ~ '^/[A-Za-z0-9]')
          )
        ) NOT VALID;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_activity'
  ) THEN
    ALTER TABLE public.user_activity
      DROP CONSTRAINT IF EXISTS chk_user_activity_client_id_len,
      DROP CONSTRAINT IF EXISTS chk_user_activity_title_nonempty,
      DROP CONSTRAINT IF EXISTS chk_user_activity_metadata_bytes;

    ALTER TABLE public.user_activity
      ADD CONSTRAINT chk_user_activity_client_id_len
        CHECK (char_length(btrim(client_id)) BETWEEN 1 AND 80) NOT VALID,
      ADD CONSTRAINT chk_user_activity_title_nonempty
        CHECK (char_length(btrim(title)) > 0) NOT VALID,
      ADD CONSTRAINT chk_user_activity_metadata_bytes
        CHECK (octet_length(metadata::text) <= 4096) NOT VALID;
  END IF;
END $$;
