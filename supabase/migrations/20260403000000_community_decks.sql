-- 1. Alter vocabulary_folders table
ALTER TABLE public.vocabulary_folders ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.vocabulary_folders ADD COLUMN IF NOT EXISTS clone_count INT DEFAULT 0;

-- 2. Update RLS for vocabulary_folders so anyone can SELECT if is_public = true
CREATE POLICY "Anyone can view public folders"
  ON public.vocabulary_folders FOR SELECT
  USING (is_public = true);

CREATE POLICY "Anyone can view public folder items"
  ON public.vocabulary_folder_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vocabulary_folders
      WHERE id = folder_id AND is_public = true
    )
  );

-- 3. RPC to fetch public community decks with counts and owners
CREATE OR REPLACE FUNCTION public.get_community_decks()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  clone_count INT,
  owner_name TEXT,
  card_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.name,
    f.description,
    f.clone_count,
    p.display_name AS owner_name,
    COUNT(i.flashcard_id) AS card_count,
    f.created_at
  FROM public.vocabulary_folders f
  LEFT JOIN public.profiles p ON p.id = f.user_id
  LEFT JOIN public.vocabulary_folder_items i ON i.folder_id = f.id
  WHERE f.is_public = true
  GROUP BY f.id, f.name, f.description, f.clone_count, p.display_name, f.created_at
  ORDER BY f.clone_count DESC, f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. RPC to clone a public deck
CREATE OR REPLACE FUNCTION public.clone_public_deck(p_folder_id UUID)
RETURNS UUID AS $$
DECLARE
  v_new_folder_id UUID;
  v_source_is_public BOOLEAN;
  v_source_name TEXT;
  v_uid UUID;
  v_new_flashcard_id UUID;
  rec RECORD;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify source folder is public
  SELECT is_public, name INTO v_source_is_public, v_source_name
  FROM public.vocabulary_folders
  WHERE id = p_folder_id;

  IF NOT FOUND OR v_source_is_public = false THEN
    RAISE EXCEPTION 'Folder not found or not public';
  END IF;

  -- Create new folder for caller
  INSERT INTO public.vocabulary_folders (user_id, name, is_public)
  VALUES (v_uid, v_source_name || ' (Bản sao)', false)
  RETURNING id INTO v_new_folder_id;

  -- Increment clone count on source
  UPDATE public.vocabulary_folders
  SET clone_count = COALESCE(public.vocabulary_folders.clone_count, 0) + 1
  WHERE id = p_folder_id;

  -- Clone flashcards
  -- Find all flashcards linked to the source folder
  FOR rec IN 
    SELECT f.*
    FROM public.flashcards f
    JOIN public.vocabulary_folder_items i ON i.flashcard_id = f.id
    WHERE i.folder_id = p_folder_id
  LOOP
    -- Insert cloned flashcard for the new user, resetting SRS fields
    INSERT INTO public.flashcards (
      user_id, word, reading, hanviet, meaning, example_sentence, 
      example_translation, audio_url, image_url, notes, jlpt_level, word_type, tags,
      ease_factor, interval, repetitions, next_review_date
    ) VALUES (
      v_uid, rec.word, rec.reading, rec.hanviet, rec.meaning, rec.example_sentence,
      rec.example_translation, rec.audio_url, rec.image_url, rec.notes, rec.jlpt_level, rec.word_type, rec.tags,
      2.5, 0, 0, NOW()
    ) RETURNING id INTO v_new_flashcard_id;

    -- Link the new flashcard to the new folder
    INSERT INTO public.vocabulary_folder_items (folder_id, flashcard_id)
    VALUES (v_new_folder_id, v_new_flashcard_id);
  END LOOP;

  RETURN v_new_folder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
