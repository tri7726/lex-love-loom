
-- Create lesson types enum
DO $$ BEGIN
    CREATE TYPE lesson_type AS ENUM ('presentation', 'assessment', 'video', 'paragraph');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create lesson status enum
DO $$ BEGIN
    CREATE TYPE lesson_status AS ENUM ('draft', 'published');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type lesson_type DEFAULT 'presentation',
    status lesson_status DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist if table was created previously without them
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS type lesson_type DEFAULT 'presentation';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS status lesson_status DEFAULT 'draft';

-- Create Lesson Slides table
CREATE TABLE IF NOT EXISTS public.lesson_slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    slide_type TEXT DEFAULT 'content', -- match PresentationViewer.tsx
    title TEXT,
    body TEXT,         -- match PresentationViewer.tsx
    image_url TEXT,    -- match PresentationViewer.tsx
    image_caption TEXT, -- match PresentationViewer.tsx
    question_text TEXT,
    options TEXT[],    -- array of strings
    correct_index INTEGER,
    explanation TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist if table was created previously without them
ALTER TABLE public.lesson_slides ADD COLUMN IF NOT EXISTS slide_type TEXT DEFAULT 'content';
ALTER TABLE public.lesson_slides ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.lesson_slides ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE public.lesson_slides ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.lesson_slides ADD COLUMN IF NOT EXISTS image_caption TEXT;
ALTER TABLE public.lesson_slides ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE public.lesson_slides ADD COLUMN IF NOT EXISTS options TEXT[];
ALTER TABLE public.lesson_slides ADD COLUMN IF NOT EXISTS correct_index INTEGER;
ALTER TABLE public.lesson_slides ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE public.lesson_slides ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Create Lesson Progress table (for students)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_slide_index INTEGER DEFAULT 0,
    answers JSONB DEFAULT '{}',
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(lesson_id, user_id)
);

-- Enable RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Policies for lessons
CREATE POLICY "Teachers can manage their own lessons"
ON public.lessons
FOR ALL
USING (auth.uid() = teacher_id);

CREATE POLICY "Everyone can view published lessons"
ON public.lessons
FOR SELECT
USING (status = 'published');

-- Policies for lesson_slides
CREATE POLICY "Teachers can manage slides of their lessons"
ON public.lesson_slides
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.lessons
    WHERE id = lesson_slides.lesson_id AND teacher_id = auth.uid()
));

CREATE POLICY "Everyone can view slides of published lessons"
ON public.lesson_slides
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.lessons
    WHERE id = lesson_slides.lesson_id AND status = 'published'
));

-- Policies for lesson_progress
CREATE POLICY "Users can manage their own progress"
ON public.lesson_progress
FOR ALL
USING (auth.uid() = user_id);

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_handle_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER trigger_handle_progress_updated_at
BEFORE UPDATE ON public.lesson_progress
FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
