
-- Create study_squads table
CREATE TABLE public.study_squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create squad_members table
CREATE TABLE public.squad_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.study_squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(squad_id, user_id)
);

-- Enable RLS
ALTER TABLE public.study_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

-- RLS for study_squads
CREATE POLICY "Anyone can view squads" ON public.study_squads FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can create squads" ON public.study_squads FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their squads" ON public.study_squads FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their squads" ON public.study_squads FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- RLS for squad_members
CREATE POLICY "Anyone can view squad members" ON public.squad_members FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can join squads" ON public.squad_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave squads" ON public.squad_members FOR DELETE TO authenticated USING (auth.uid() = user_id);
