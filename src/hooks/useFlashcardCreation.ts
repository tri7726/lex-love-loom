import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SuggestedFlashcard {
  word: string;
  reading: string;
  hanviet?: string;
  meaning: string;
  example_sentence: string;
  example_translation: string;
  jlpt_level?: string;
  word_type?: string;
  notes?: string;
}

export function useFlashcardCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const createFlashcard = async (
    flashcard: SuggestedFlashcard,
    folderId: string
  ): Promise<boolean> => {
    setIsCreating(true);
    
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      // Check for duplicate
      const { data: existing } = await supabase
        .from('flashcards')
        .select('id, word')
        .eq('user_id', user.id)
        .eq('word', flashcard.word)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Already exists",
          description: `"${flashcard.word}" is already in your deck`,
          variant: "default",
        });
        return false;
      }

      // Insert flashcard
      const { data: newFlashcard, error: flashcardError } = await supabase
        .from('flashcards')
        .insert({
          user_id: user.id,
          word: flashcard.word,
          reading: flashcard.reading,
          hanviet: flashcard.hanviet,
          meaning: flashcard.meaning,
          example_sentence: flashcard.example_sentence,
          example_translation: flashcard.example_translation,
          notes: flashcard.notes,
          jlpt_level: flashcard.jlpt_level,
          word_type: flashcard.word_type,
          // SRS initialization
          ease_factor: 2.5,
          interval: 0,
          repetitions: 0,
          next_review: new Date().toISOString(),
        })
        .select()
        .single();

      if (flashcardError) throw flashcardError;

      // Link to folder
      const { error: linkError } = await supabase
        .from('vocabulary_folder_items')
        .insert({
          folder_id: folderId,
          flashcard_id: newFlashcard.id,
        });

      if (linkError) throw linkError;

      toast({
        title: "✅ Added to Deck",
        description: `"${flashcard.word}" saved to your flashcards`,
      });

      return true;
    } catch (error) {
      console.error('Failed to create flashcard:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Failed to add flashcard",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const createFlashcards = async (
    flashcards: SuggestedFlashcard[],
    folderId: string
  ): Promise<number> => {
    setIsCreating(true);
    let successCount = 0;
    let duplicateCount = 0;

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      // Get existing flashcards for duplicate check
      const existingWords = new Set(
        (await supabase
          .from('flashcards')
          .select('word')
          .eq('user_id', user.id)
        ).data?.map(f => f.word) || []
      );

      for (const flashcard of flashcards) {
        try {
          // Skip duplicates
          if (existingWords.has(flashcard.word)) {
            duplicateCount++;
            continue;
          }

          // Insert flashcard
          const { data: newFlashcard, error: flashcardError } = await supabase
            .from('flashcards')
            .insert({
              user_id: user.id,
              word: flashcard.word,
              reading: flashcard.reading,
              hanviet: flashcard.hanviet,
              meaning: flashcard.meaning,
              example_sentence: flashcard.example_sentence,
              example_translation: flashcard.example_translation,
              notes: flashcard.notes,
              jlpt_level: flashcard.jlpt_level,
              word_type: flashcard.word_type,
              ease_factor: 2.5,
              interval: 0,
              repetitions: 0,
              next_review: new Date().toISOString(),
            })
            .select()
            .single();

          if (flashcardError) throw flashcardError;

          // Link to folder
          await supabase
            .from('vocabulary_folder_items')
            .insert({
              folder_id: folderId,
              flashcard_id: newFlashcard.id,
            });

          successCount++;
          existingWords.add(flashcard.word); // Add to set to avoid duplicates within batch
        } catch (err) {
          console.error(`Failed to add ${flashcard.word}:`, err);
        }
      }

      // Show result toast
      if (successCount > 0) {
        toast({
          title: `✅ Added ${successCount} Flashcard${successCount > 1 ? 's' : ''}`,
          description: duplicateCount > 0 
            ? `${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''} skipped`
            : 'Successfully saved to your deck',
        });
      } else if (duplicateCount > 0) {
        toast({
          title: "All flashcards already exist",
          description: `${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''} found`,
          variant: "default",
        });
      }

      return successCount;
    } catch (error) {
      console.error('Bulk flashcard creation failed:', error);
      toast({
        title: "❌ Error",
        description: successCount > 0 
          ? `Partially completed: ${successCount} added`
          : "Failed to add flashcards",
        variant: "destructive",
      });
      return successCount;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createFlashcard,
    createFlashcards,
    isCreating,
  };
}
