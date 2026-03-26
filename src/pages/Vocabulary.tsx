import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { KanjiReview } from '@/components/vocabulary/KanjiReview';

// New Refactored Components
import { useVocabulary } from '@/hooks/useVocabulary';
import { SeriesView } from '@/components/vocabulary/SeriesView';
import { LessonListView } from '@/components/vocabulary/LessonListView';
import { DetailView } from '@/components/vocabulary/DetailView';
import { CustomDetailView } from '@/components/vocabulary/CustomDetailView';
import { ImportVocabularyDialog } from '@/components/vocabulary/ImportVocabularyDialog';
import { CreateFolderDialog } from '@/components/vocabulary/CreateFolderDialog';

// Re-export as default if it was used that way
export const Vocabulary = () => {
  const { state, setters, actions } = useVocabulary();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="container py-6 max-w-4xl">
        {state.showKanji ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Button
              variant="outline" size="sm"
              className="gap-2 border-emerald-300 text-emerald-600 hover:bg-emerald-50"
              onClick={() => setters.setShowKanji(false)}
            >
              <RefreshCcw className="h-4 w-4" />
              Chuyển chế độ học Từ vựng
            </Button>
            <KanjiReview onBack={() => setters.setShowKanji(false)} />
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {state.view === 'series' && (
              <SeriesView
                key="series"
                customFolders={state.customFolders}
                savedHistory={state.savedHistory}
                user={state.user}
                setShowKanji={setters.setShowKanji}
                navigateToLessons={actions.navigateToLessons}
                navigateToCustomFolder={actions.navigateToCustomFolder}
                setShowCreateDialog={setters.setShowCreateDialog}
                deleteFolder={actions.deleteFolder}
              />
            )}
            
            {state.view === 'lessons' && state.selectedSeries && state.selectedLevel && (
              <LessonListView
                key="lessons"
                selectedSeries={state.selectedSeries}
                selectedLevel={state.selectedLevel}
                lessonRange={state.lessonRange}
                setLessonRange={setters.setLessonRange}
                handleStudyRange={actions.handleStudyRange}
                navigateToDetail={actions.navigateToDetail}
                goBack={actions.goBack}
              />
            )}
            
            {state.view === 'detail' && state.selectedSeries && state.selectedLevel && state.selectedLesson && (
              <DetailView
                key="detail"
                selectedSeries={state.selectedSeries}
                selectedLevel={state.selectedLevel}
                selectedLesson={state.selectedLesson}
                displayWords={state.displayWords}
                isWordSaved={state.isWordSaved}
                toggleSaved={actions.toggleSaved}
                goBack={actions.goBack}
                navigateToDetail={actions.navigateToDetail}
                flashcardIndex={state.flashcardIndex}
                setFlashcardIndex={setters.setFlashcardIndex}
                isFlipped={state.isFlipped}
                setIsFlipped={setters.setIsFlipped}
                autoSpeak={state.autoSpeak}
                setAutoSpeak={setters.setAutoSpeak}
                reversedCard={state.reversedCard}
                setReversedCard={setters.setReversedCard}
                shuffled={state.shuffled}
                setShuffled={setters.setShuffled}
                speak={actions.speak}
                activeGame={state.activeGame}
                setActiveGame={setters.setActiveGame}
                showReviewPanel={state.showReviewPanel}
                setShowReviewPanel={setters.setShowReviewPanel}
              />
            )}
            
            {state.view === 'custom-detail' && state.selectedCustomFolder && (
              <CustomDetailView
                key="custom-detail"
                selectedCustomFolder={state.selectedCustomFolder}
                isWordSaved={state.isWordSaved}
                toggleSaved={actions.toggleSaved}
                removeWordFromFolder={(folderId, wordId) => {
                  actions.removeWordFromFolder(folderId, wordId);
                  setters.setSelectedCustomFolder(f => f ? { ...f, words: f.words.filter(w => w.id !== wordId) } : f);
                }}
                goBack={actions.goBack}
                flashcardIndex={state.flashcardIndex}
                setFlashcardIndex={setters.setFlashcardIndex}
                isFlipped={state.isFlipped}
                setIsFlipped={setters.setIsFlipped}
                autoSpeak={state.autoSpeak}
                setAutoSpeak={setters.setAutoSpeak}
                reversedCard={state.reversedCard}
                setReversedCard={setters.setReversedCard}
                shuffled={state.shuffled}
                setShuffled={setters.setShuffled}
                speak={actions.speak}
                activeGame={state.activeGame}
                setActiveGame={setters.setActiveGame}
                showReviewPanel={state.showReviewPanel}
                setShowReviewPanel={setters.setShowReviewPanel}
                showAddWordForm={state.showAddWordForm}
                setShowAddWordForm={setters.setShowAddWordForm}
                setShowImportDialog={setters.setShowImportDialog}
                newWord={state.newWord}
                setNewWord={setters.setNewWord}
                handleAddWord={actions.handleAddWord}
              />
            )}
          </AnimatePresence>
        )}
      </main>

      <CreateFolderDialog
        showCreateDialog={state.showCreateDialog}
        setShowCreateDialog={setters.setShowCreateDialog}
        newFolderName={state.newFolderName}
        setNewFolderName={setters.setNewFolderName}
        newFolderEmoji={state.newFolderEmoji}
        setNewFolderEmoji={setters.setNewFolderEmoji}
        handleCreateFolder={actions.handleCreateFolder}
      />
      
      <ImportVocabularyDialog
        showImportDialog={state.showImportDialog}
        setShowImportDialog={setters.setShowImportDialog}
        onImport={actions.handleImportWords}
      />
    </div>
  );
};
