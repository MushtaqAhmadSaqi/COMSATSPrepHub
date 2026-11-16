-- Allow users to delete their own synced activity.
-- The Account page promises "clear all local and cloud study records", but
-- user_activity only had SELECT and INSERT policies, so deletes were blocked.

DROP POLICY IF EXISTS "Users can delete own activity" ON public.user_activity;
CREATE POLICY "Users can delete own activity"
  ON public.user_activity FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
