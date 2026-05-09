-- Drop parent dashboard policy on profiles if it exists
DROP POLICY IF EXISTS "Parents can view linked student profiles" ON public.profiles;

-- Drop the parent_student_links table (cascades policies + indexes)
DROP TABLE IF EXISTS public.parent_student_links CASCADE;