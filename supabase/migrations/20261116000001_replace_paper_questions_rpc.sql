-- Atomic question replacement for a past paper.
-- AdminPaste previously deleted the old questions in the browser and then
-- inserted the new ones; if the insert failed the paper was left with zero
-- questions. This function performs both steps in a single transaction.

CREATE OR REPLACE FUNCTION public.replace_paper_questions(p_paper_id uuid, p_questions jsonb)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.is_admin() AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only admins can replace paper questions' USING ERRCODE = '42501';
  END IF;

  IF p_questions IS NULL OR jsonb_typeof(p_questions) <> 'array' THEN
    RAISE EXCEPTION 'p_questions must be a JSON array' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.questions WHERE paper_id = p_paper_id;

  INSERT INTO public.questions (paper_id, question_number, question_text, model_answer, marks, clo)
  SELECT
    p_paper_id,
    q->>'question_number',
    q->>'question_text',
    q->>'model_answer',
    q->>'marks',
    q->>'clo'
  FROM jsonb_array_elements(p_questions) WITH ORDINALITY AS t(q, ord);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_paper_questions(uuid, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.replace_paper_questions(uuid, jsonb) TO authenticated, service_role;
