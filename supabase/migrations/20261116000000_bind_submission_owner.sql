-- Bind moderation submissions to their authenticated owner.
-- The previous INSERT policy only checked status = 'pending', so a signed-in
-- user could submit a row with another account's user_id (which would then show
-- up in that victim's "my submissions" list).

DROP POLICY IF EXISTS "Users can submit papers or reports" ON public.paper_submissions;
CREATE POLICY "Users can submit papers or reports"
  ON public.paper_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND user_id IS NOT DISTINCT FROM auth.uid()
  );
