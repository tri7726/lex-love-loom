-- ═══════════════════════════════════════════════════════════════
-- DOMAIN: CLASSROOM & LESSONS
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'teacher') THEN
    ALTER TYPE public.app_role ADD VALUE 'teacher';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.classrooms (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name          text NOT NULL,
    description   text,
    jlpt_level    text DEFAULT 'N5',
    invite_code   text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    is_active     boolean DEFAULT true,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON public.classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_invite_code ON public.classrooms(invite_code);

CREATE TABLE IF NOT EXISTS public.class_members (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at   timestamptz DEFAULT now(),
    UNIQUE(class_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_class_members_class ON public.class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_user  ON public.class_members(user_id);

CREATE TABLE IF NOT EXISTS public.class_assignments (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id      uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title         text NOT NULL,
    description   text,
    assignment_type  text NOT NULL DEFAULT 'exam',
    exam_id       uuid REFERENCES public.mock_exams(id) ON DELETE SET NULL,
    vocab_config  jsonb DEFAULT '{}',
    deadline      timestamptz,
    is_active     boolean DEFAULT true,
    created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_class_assignments_class ON public.class_assignments(class_id);

CREATE TABLE IF NOT EXISTS public.class_assignment_progress (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id   uuid NOT NULL REFERENCES public.class_assignments(id) ON DELETE CASCADE,
    class_id        uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_result_id  uuid REFERENCES public.mock_exam_results(id) ON DELETE SET NULL,
    score           integer,
    max_score       integer,
    is_completed    boolean DEFAULT false,
    completed_at    timestamptz,
    UNIQUE(assignment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cap_assignment ON public.class_assignment_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_cap_user       ON public.class_assignment_progress(user_id);

CREATE TABLE IF NOT EXISTS public.lessons (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id         uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title            text NOT NULL,
    description      text,
    cover_image_url  text,
    is_published     boolean DEFAULT false,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher ON public.lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_class   ON public.lessons(class_id);

CREATE TABLE IF NOT EXISTS public.lesson_slides (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id      uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    order_index    integer NOT NULL DEFAULT 0,
    slide_type     text NOT NULL DEFAULT 'content' CHECK (slide_type IN ('content', 'question')),
    title          text,
    body           text,
    image_url      text,
    image_caption  text,
    question_text  text,
    options        jsonb DEFAULT '[]',
    correct_index  integer,
    explanation    text,
    created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lesson_slides_lesson ON public.lesson_slides(lesson_id);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
    lesson_id         uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_slide_index  integer DEFAULT 0,
    answers           jsonb DEFAULT '{}',
    completed_at      timestamptz,
    updated_at        timestamptz DEFAULT now(),
    PRIMARY KEY (lesson_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);

CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token  text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    status        text DEFAULT 'pending',
    created_at    timestamptz DEFAULT now(),
    UNIQUE(parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.live_sessions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id      uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title         text NOT NULL,
    description   text,
    start_time    timestamptz NOT NULL,
    end_time      timestamptz,
    meeting_link  text NOT NULL,
    platform      text DEFAULT 'Google Meet',
    is_active     boolean DEFAULT true,
    created_at    timestamptz DEFAULT now()
);

-- Ensure unique constraint for ON CONFLICT in trigger
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_skill_metrics_uk ON public.user_skill_metrics(user_id, category);

-- RLS
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_assignment_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher manages own classrooms" ON public.classrooms FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Members can view their classrooms" ON public.classrooms FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.class_members WHERE class_id = classrooms.id AND user_id = auth.uid()));
CREATE POLICY "Admin full access classrooms" ON public.classrooms FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teacher views class members" ON public.class_members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.classrooms WHERE id = class_members.class_id AND teacher_id = auth.uid()));
CREATE POLICY "Teacher deletes class members" ON public.class_members FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.classrooms WHERE id = class_members.class_id AND teacher_id = auth.uid()));
CREATE POLICY "Student views own membership" ON public.class_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Student leaves class" ON public.class_members FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin full access class_members" ON public.class_members FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teacher manages assignments" ON public.class_assignments FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Student views class assignments" ON public.class_assignments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.class_members WHERE class_id = class_assignments.class_id AND user_id = auth.uid()));

CREATE POLICY "Student views own progress" ON public.class_assignment_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Teacher views all progress" ON public.class_assignment_progress FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.classrooms WHERE id = class_assignment_progress.class_id AND teacher_id = auth.uid()));
CREATE POLICY "System upsert progress" ON public.class_assignment_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teacher manages own lessons" ON public.lessons FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Class members view published lessons" ON public.lessons FOR SELECT TO authenticated USING (is_published = true AND (class_id IS NULL OR EXISTS (SELECT 1 FROM public.class_members WHERE class_id = lessons.class_id AND user_id = auth.uid())));
CREATE POLICY "Admin full access lessons" ON public.lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teacher manages own slides" ON public.lesson_slides FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.lessons WHERE id = lesson_slides.lesson_id AND teacher_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.lessons WHERE id = lesson_slides.lesson_id AND teacher_id = auth.uid()));
CREATE POLICY "Members view slides of published lessons" ON public.lesson_slides FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_slides.lesson_id AND l.is_published = true AND (l.class_id IS NULL OR EXISTS (SELECT 1 FROM public.class_members cm WHERE cm.class_id = l.class_id AND cm.user_id = auth.uid()))));

CREATE POLICY "Student manages own progress" ON public.lesson_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Teacher views class progress" ON public.lesson_progress FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_progress.lesson_id AND l.teacher_id = auth.uid()));

CREATE POLICY "Parent manages own links" ON public.parent_student_links FOR ALL TO authenticated USING (parent_id = auth.uid()) WITH CHECK (parent_id = auth.uid());
CREATE POLICY "Student views own links" ON public.parent_student_links FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Teacher manages live sessions" ON public.live_sessions FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Members view live sessions" ON public.live_sessions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.class_members WHERE class_id = live_sessions.class_id AND user_id = auth.uid()));

-- Triggers & RPCs
CREATE OR REPLACE FUNCTION public.process_exam_skill_metrics()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_q RECORD;
    v_user_answer INT;
    v_cat TEXT;
    v_is_correct BOOLEAN;
    v_metrics JSONB := '{}'::jsonb;
BEGIN
    FOR v_q IN SELECT * FROM public.exam_questions WHERE exam_id = NEW.exam_id LOOP
        v_user_answer := (NEW.answers->>v_q.id::text)::int;
        v_cat := COALESCE(v_q.category, 'General');
        IF v_user_answer IS NOT NULL THEN
            v_is_correct := (v_user_answer = v_q.correct_index);
            v_metrics := v_metrics || jsonb_build_object(
                v_cat,
                jsonb_build_object(
                    'correct', COALESCE((v_metrics->v_cat->>'correct')::int, 0) + (CASE WHEN v_is_correct THEN 1 ELSE 0 END),
                    'total', COALESCE((v_metrics->v_cat->>'total')::int, 0) + 1
                )
            );
            INSERT INTO public.user_skill_metrics (user_id, category, total_correct, total_questions, last_updated)
            VALUES (NEW.user_id, v_cat, (CASE WHEN v_is_correct THEN 1 ELSE 0 END), 1, NOW())
            ON CONFLICT (user_id, category) DO UPDATE SET
                total_correct = user_skill_metrics.total_correct + EXCLUDED.total_correct,
                total_questions = user_skill_metrics.total_questions + EXCLUDED.total_questions,
                last_updated = NOW();
        END IF;
    END LOOP;
    UPDATE public.mock_exam_results SET category_scores = v_metrics WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_exam_metrics ON public.mock_exam_results;
CREATE TRIGGER trg_process_exam_metrics AFTER INSERT ON public.mock_exam_results FOR EACH ROW EXECUTE FUNCTION public.process_exam_skill_metrics();

CREATE OR REPLACE FUNCTION public.get_class_skill_analytics(p_class_id UUID)
RETURNS TABLE (user_id UUID, display_name TEXT, skills JSONB)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.user_id,
        p.display_name,
        jsonb_object_agg(usm.category, jsonb_build_object(
            'correct', usm.total_correct,
            'total', usm.total_questions,
            'percent', CASE WHEN usm.total_questions > 0 THEN (usm.total_correct::float / usm.total_questions * 100) ELSE 0 END
        )) as skills
    FROM public.class_members cm
    JOIN public.profiles p ON cm.user_id = p.user_id
    LEFT JOIN public.user_skill_metrics usm ON cm.user_id = usm.user_id
    WHERE cm.class_id = p_class_id
    GROUP BY p.user_id, p.display_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_class_by_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id uuid; v_class public.classrooms%ROWTYPE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
    SELECT * INTO v_class FROM public.classrooms WHERE invite_code = upper(trim(p_code)) AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Mã lớp không hợp lệ hoặc lớp đã đóng'; END IF;
    IF EXISTS (SELECT 1 FROM public.class_members WHERE class_id = v_class.id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'Bạn đã là thành viên của lớp này';
    END IF;
    IF v_class.teacher_id = v_user_id THEN RAISE EXCEPTION 'Bạn là giáo viên của lớp này'; END IF;
    INSERT INTO public.class_members (class_id, user_id) VALUES (v_class.id, v_user_id);
    INSERT INTO public.class_assignment_progress (assignment_id, class_id, user_id)
    SELECT id, v_class.id, v_user_id FROM public.class_assignments WHERE class_id = v_class.id AND is_active = true
    ON CONFLICT (assignment_id, user_id) DO NOTHING;
    RETURN jsonb_build_object('success', true, 'class_id', v_class.id, 'class_name', v_class.name);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_class_student_progress(p_class_id uuid)
RETURNS TABLE (
    user_id uuid, display_name text, avatar_url text, total_xp integer, current_streak integer, weekly_xp integer, exams_done bigint, avg_score numeric
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_teacher_id uuid;
BEGIN
    SELECT teacher_id INTO v_teacher_id FROM public.classrooms WHERE id = p_class_id;
    IF v_teacher_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Access denied'; END IF;
    RETURN QUERY
    SELECT
        p.user_id, p.display_name, p.avatar_url, COALESCE(p.total_xp, 0), COALESCE(p.current_streak, 0),
        COALESCE(p.weekly_xp, 0)::integer,
        COALESCE((SELECT COUNT(*) FROM public.mock_exam_results mer JOIN public.class_assignments ca ON ca.exam_id = mer.exam_id WHERE mer.user_id = p.user_id AND ca.class_id = p_class_id), 0)::bigint,
        COALESCE((SELECT AVG(score) FROM public.mock_exam_results mer JOIN public.class_assignments ca ON ca.exam_id = mer.exam_id WHERE mer.user_id = p.user_id AND ca.class_id = p_class_id), 0.0)::numeric
    FROM public.class_members cm
    JOIN public.profiles p ON p.user_id = cm.user_id
    WHERE cm.class_id = p_class_id ORDER BY total_xp DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_progress_for_new_assignment() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.class_assignment_progress (assignment_id, class_id, user_id)
    SELECT NEW.id, NEW.class_id, cm.user_id FROM public.class_members cm WHERE cm.class_id = NEW.class_id
    ON CONFLICT (assignment_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_assignment_progress ON public.class_assignments;
CREATE TRIGGER trg_new_assignment_progress AFTER INSERT ON public.class_assignments FOR EACH ROW EXECUTE FUNCTION public.create_progress_for_new_assignment();

CREATE OR REPLACE FUNCTION public.sync_exam_result_to_assignment() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.class_assignment_progress cap
    SET exam_result_id = NEW.id, score = NEW.score, max_score = NEW.max_score, is_completed = true, completed_at = NOW()
    FROM public.class_assignments ca
    WHERE ca.exam_id = NEW.exam_id AND cap.assignment_id = ca.id AND cap.user_id = NEW.user_id AND cap.is_completed = false;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_exam_to_assignment ON public.mock_exam_results;
CREATE TRIGGER trg_sync_exam_to_assignment AFTER INSERT ON public.mock_exam_results FOR EACH ROW EXECUTE FUNCTION public.sync_exam_result_to_assignment();