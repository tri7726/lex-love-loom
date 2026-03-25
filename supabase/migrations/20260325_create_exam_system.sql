-- Bảng đề thi
CREATE TABLE IF NOT EXISTS public.mock_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'N5', -- N5, N4, N3, N2, N1
  duration INTEGER NOT NULL DEFAULT 120, -- phút
  difficulty TEXT DEFAULT 'Cơ bản',
  description TEXT,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng câu hỏi
CREATE TABLE IF NOT EXISTS public.exam_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT 'Kiến thức ngôn ngữ',
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]', -- ["A","B","C","D"]
  correct_index INTEGER NOT NULL DEFAULT 0, -- 0-3
  explanation TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

-- Ai cũng đọc được đề đã publish
CREATE POLICY "Anyone can read published exams" ON public.mock_exams
  FOR SELECT USING (is_published = true);

-- Admin có thể làm mọi thứ
CREATE POLICY "Admin full access exams" ON public.mock_exams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Anyone can read questions" ON public.exam_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.mock_exams WHERE id = exam_id AND is_published = true)
  );

CREATE POLICY "Admin full access questions" ON public.exam_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON public.exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_order ON public.exam_questions(exam_id, order_index);
CREATE INDEX IF NOT EXISTS idx_mock_exams_level ON public.mock_exams(level);
