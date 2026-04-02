-- Function to find recommended reading passages based on user's flashcards
CREATE OR REPLACE FUNCTION public.get_recommended_reading(p_user_id UUID, p_limit INT DEFAULT 3)
RETURNS TABLE (
  passage_id UUID,
  title TEXT,
  level TEXT,
  category TEXT,
  match_percentage FLOAT,
  learning_count INT,
  mastered_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_vocab AS (
    SELECT word, repetitions
    FROM public.flashcards
    WHERE user_id = p_user_id
  ),
  passage_vocab AS (
    SELECT 
      id AS p_id,
      title AS p_title,
      level AS p_level,
      category AS p_category,
      jsonb_array_length(vocabulary_list) AS total_words,
      v->>'word' AS passage_word
    FROM public.reading_passages,
    jsonb_array_elements(vocabulary_list) AS v
    WHERE vocabulary_list IS NOT NULL
  ),
  passage_matches AS (
    SELECT 
      pv.p_id,
      pv.p_title,
      pv.p_level,
      pv.p_category,
      MAX(pv.total_words) as total_words,
      COUNT(uv.word) AS matched_words,
      SUM(CASE WHEN uv.repetitions < 4 THEN 1 ELSE 0 END) AS learning_count,
      SUM(CASE WHEN uv.repetitions >= 4 THEN 1 ELSE 0 END) AS mastered_count
    FROM passage_vocab pv
    LEFT JOIN user_vocab uv ON pv.passage_word = uv.word
    GROUP BY pv.p_id, pv.p_title, pv.p_level, pv.p_category
  )
  SELECT 
    p_id, 
    p_title, 
    p_level, 
    p_category, 
    COALESCE(CAST(matched_words AS FLOAT) / NULLIF(total_words, 0) * 100, 0) AS match_percentage,
    CAST(COALESCE(learning_count, 0) AS INT) AS learning_count,
    CAST(COALESCE(mastered_count, 0) AS INT) AS mastered_count
  FROM passage_matches
  WHERE matched_words > 0
  ORDER BY 
    match_percentage DESC,
    learning_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
