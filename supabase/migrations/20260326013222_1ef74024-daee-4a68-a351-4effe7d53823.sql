
-- Fix mock_exams admin insert policy to use has_role function
DROP POLICY IF EXISTS "Allow admin insert on mock_exams" ON public.mock_exams;
CREATE POLICY "Allow admin insert on mock_exams"
ON public.mock_exams
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix mock_exam_questions admin insert policy to use has_role function
DROP POLICY IF EXISTS "Allow admin insert on mock_exam_questions" ON public.mock_exam_questions;
CREATE POLICY "Allow admin insert on mock_exam_questions"
ON public.mock_exam_questions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
