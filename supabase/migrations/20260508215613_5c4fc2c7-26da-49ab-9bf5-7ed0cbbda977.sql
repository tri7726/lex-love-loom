-- Add mock_exam_questions table referenced by JLPTMockExam and ExamManager
CREATE TABLE IF NOT EXISTS public.mock_exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  section text NOT NULL DEFAULT 'Kiến thức ngôn ngữ',
  section_type text,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct integer NOT NULL DEFAULT 0,
  explanation text,
  image_url text,
  passage text,
  audio_url text,
  point_weight integer DEFAULT 1,
  order_index integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mock_exam_questions_exam_id ON public.mock_exam_questions(exam_id);

ALTER TABLE public.mock_exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read mock exam questions"
  ON public.mock_exam_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mock_exams me
      WHERE me.id = mock_exam_questions.exam_id
        AND (me.is_published = true OR me.created_by = auth.uid())
    )
  );

CREATE POLICY "Creator manage own mock exam questions"
  ON public.mock_exam_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.mock_exams me
      WHERE me.id = mock_exam_questions.exam_id
        AND me.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mock_exams me
      WHERE me.id = mock_exam_questions.exam_id
        AND me.created_by = auth.uid()
    )
  );

CREATE POLICY "Admin manage mock exam questions"
  ON public.mock_exam_questions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
