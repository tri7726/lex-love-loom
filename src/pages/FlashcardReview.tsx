import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import FlashcardSRS from '@/components/FlashcardSRS';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isDue } from '@/lib/srs';
import { Sparkles, FolderOpen } from 'lucide-react';

interface Flashcard {
  id: string;
  word: string;
  reading: string | null;
  hanviet: string | null;
  meaning: string;
  example_sentence: string | null;
  example_translation: string | null;
  jlpt_level: string | null;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  last_reviewed_at: string | null;
}

interface Folder {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const FlashcardReview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const folderId = searchParams.get('folder');

  const [folders, setFolders] = useState<Folder[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [dueFlashcards, setDueFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string>(folderId || '');

  useEffect(() => {
    if (user) {
      fetchFolders();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedFolder) {
      fetchFlashcards(selectedFolder);
    }
  }, [user, selectedFolder]);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('vocabulary_folders')
        .select('id, name, icon, color')
        .eq('user_id', user!.id)
        .order('name');

      if (error) throw error;
      setFolders(data || []);

      // Auto-select first folder if none selected
      if (!selectedFolder && data && data.length > 0) {
        setSelectedFolder(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách folder',
        variant: 'destructive',
      });
    }
  };

  const fetchFlashcards = async (folderId: string) => {
    setLoading(true);
    try {
      // Fetch flashcards in this folder
      const { data: folderItems, error: itemsError } = await supabase
        .from('vocabulary_folder_items')
        .select('flashcard_id')
        .eq('folder_id', folderId);

      if (itemsError) throw itemsError;

      if (!folderItems || folderItems.length === 0) {
        setFlashcards([]);
        setDueFlashcards([]);
        setLoading(false);
        return;
      }

      const flashcardIds = folderItems.map(item => item.flashcard_id);

      const { data: flashcardsData, error: flashcardsError } = await supabase
        .from('flashcards')
        .select('*')
        .in('id', flashcardIds)
        .eq('user_id', user!.id);

      if (flashcardsError) throw flashcardsError;

      const allCards = flashcardsData || [];
      setFlashcards(allCards);

      // Filter due cards
      const due = allCards.filter(card => isDue(card.next_review_date));
      setDueFlashcards(due);
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải flashcards',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFlashcard = async (id: string, updates: Partial<Flashcard>) => {
    try {
      const { error } = await supabase
        .from('flashcards')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Remove from due list after review
      setDueFlashcards(prev => prev.filter(card => card.id !== id));
      
      // Update in main list
      setFlashcards(prev => 
        prev.map(card => card.id === id ? { ...card, ...updates } : card)
      );
    } catch (error) {
      console.error('Error updating flashcard:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật flashcard',
        variant: 'destructive',
      });
    }
  };

  const handleComplete = () => {
    toast({
      title: 'Hoàn thành!',
      description: 'Bạn đã hoàn thành tất cả flashcards cần ôn tập.',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navigation />
        <main className="container py-6">
          <Card>
            <CardContent className="py-8 text-center">
              <p>Vui lòng đăng nhập để ôn tập flashcards</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <main className="container py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-display font-bold">Flashcard Review</h1>
            <p className="text-muted-foreground">
              Ôn tập từ vựng theo phương pháp SRS (Spaced Repetition System)
            </p>
          </div>

          {/* Folder Selector */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
                <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Chọn folder..." />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map(folder => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center gap-2">
                          <span>{folder.icon}</span>
                          <span>{folder.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground">
                  {dueFlashcards.length} / {flashcards.length} due
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review Area */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : dueFlashcards.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {flashcards.length === 0 ? 'No Flashcards' : 'All Done!'}
                </h3>
                <p className="text-muted-foreground">
                  {flashcards.length === 0
                    ? 'This folder has no flashcards yet.'
                    : 'No flashcards due for review right now. Great work!'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <FlashcardSRS
              flashcards={dueFlashcards}
              onUpdateFlashcard={handleUpdateFlashcard}
              onComplete={handleComplete}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default FlashcardReview;
