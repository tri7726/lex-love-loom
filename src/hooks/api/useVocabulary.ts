import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vocabularyService } from '@/services/vocabularyService';
import { type InsertVocabulary, type UpdateVocabulary } from '@/types/vocabulary';
import { useAuth } from '@/hooks/useAuth';
import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useVocabulary = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for fetching saved vocabulary
  const savedVocabularyQuery = useQuery({
    queryKey: ['saved_vocabulary', user?.id],
    queryFn: () => (user?.id ? vocabularyService.getSavedVocabulary(user.id) : []),
    enabled: !!user?.id,
  });

  // Mutation for adding/upserting a word
  const upsertMutation = useMutation({
    mutationFn: (word: Omit<InsertVocabulary, 'user_id'>) => {
      if (!user?.id) throw new Error('User not logged in');
      return vocabularyService.upsertWord({ ...word, user_id: user.id });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['saved_vocabulary', user?.id] });
      toast({
        title: 'Thành công',
        description: `Đã lưu từ "${data.word}"`,
      });
    },
    onError: (error) => {
      console.error('Error upserting word:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu từ vựng. Vui lòng thử lại.',
        variant: 'destructive',
      });
    },
  });

  // Mutation for deleting a word
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!user?.id) throw new Error('User not logged in');
      return vocabularyService.deleteWord(id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_vocabulary', user?.id] });
      toast({
        title: 'Đã xóa',
        description: 'Đã xóa từ vựng khỏi danh sách',
      });
    },
    onError: (error) => {
      console.error('Error deleting word:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa từ vựng.',
        variant: 'destructive',
      });
    },
  });

  // Mutation for updating a word (e.g. mastery level)
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateVocabulary }) => {
      if (!user?.id) throw new Error('User not logged in');
      return vocabularyService.updateWord(id, user.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_vocabulary', user?.id] });
    },
  });

  return {
    vocabulary: savedVocabularyQuery.data || [],
    isLoading: savedVocabularyQuery.isLoading,
    isError: savedVocabularyQuery.isError,
    error: savedVocabularyQuery.error,
    upsertWord: upsertMutation.mutateAsync,
    deleteWord: deleteMutation.mutateAsync,
    updateWord: updateMutation.mutateAsync,
    isUpserting: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
