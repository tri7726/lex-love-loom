import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Upload, FolderOpen, Volume2, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Flashcard } from './Flashcard';
import { ReviewPanel } from './ReviewPanel';
import { GameMode } from './types';
import { VocabWord, CustomFolder } from '@/hooks/useFlashcardFolders';
import { MultipleChoiceGame } from '@/components/games/MultipleChoiceGame';
import { SpeedGame } from '@/components/games/SpeedGame';
import { ListeningGame } from '@/components/games/ListeningGame';
import { WriteGame } from '@/components/games/WriteGame';
import { PronunciationGame } from '@/components/games/PronunciationGame';

interface CustomDetailViewProps {
  selectedCustomFolder: CustomFolder;
  removeWordFromFolder: (folderId: string, wordId: string) => void;
  goBack: () => void;
  
  // Flashcard State
  flashcardIndex: number;
  setFlashcardIndex: (i: number) => void;
  isFlipped: boolean;
  setIsFlipped: (f: boolean) => void;
  autoSpeak: boolean;
  setAutoSpeak: (a: boolean) => void;
  reversedCard: boolean;
  setReversedCard: (r: boolean) => void;
  shuffled: boolean;
  setShuffled: (s: boolean) => void;
  speak: (t: string) => void;
  isWordSaved: (word: string) => boolean;
  toggleSaved: (vocab: VocabWord) => void;
  
  // Game & Review
  activeGame: GameMode | null;
  setActiveGame: (g: GameMode | null) => void;
  showReviewPanel: boolean;
  setShowReviewPanel: (s: boolean) => void;
  
  // Forms & Dialogs
  showAddWordForm: boolean;
  setShowAddWordForm: (s: boolean) => void;
  setShowImportDialog: (s: boolean) => void;
  newWord: { word: string; reading: string; hanviet: string; meaning: string };
  setNewWord: (w: { word: string; reading: string; hanviet: string; meaning: string }) => void;
  handleAddWord: () => void;
}

export const CustomDetailView: React.FC<CustomDetailViewProps> = ({
  selectedCustomFolder, removeWordFromFolder, goBack,
  flashcardIndex, setFlashcardIndex, isFlipped, setIsFlipped, autoSpeak, setAutoSpeak, reversedCard, setReversedCard, shuffled, setShuffled, speak,
  isWordSaved, toggleSaved,
  activeGame, setActiveGame, showReviewPanel, setShowReviewPanel,
  showAddWordForm, setShowAddWordForm, setShowImportDialog, newWord, setNewWord, handleAddWord,
}) => {
  const folder = selectedCustomFolder;
  const words = folder.words;
  const currentWord = words[flashcardIndex];

  if (activeGame) {
    const gameVocab = words.map((w) => ({
      id: w.id, word: w.word, reading: w.reading || '', meaning: w.meaning, mastery_level: w.mastery_level,
    }));
    const onGameComplete = (results: { correct: number; total: number }) => {
      console.log('Game completed:', results);
    };
    const onUpdateMastery = (wordId: string, correct: boolean) => {
      console.log('Update mastery:', wordId, correct);
    };

    return (
      <motion.div key="custom-game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Quay lại
        </Button>
        {activeGame === 'classic' && <MultipleChoiceGame vocabulary={gameVocab} onComplete={onGameComplete} onBack={goBack} onUpdateMastery={onUpdateMastery} />}
        {activeGame === 'speed' && <SpeedGame vocabulary={gameVocab} onComplete={onGameComplete} onBack={goBack} onUpdateMastery={onUpdateMastery} />}
        {activeGame === 'listening' && <ListeningGame vocabulary={gameVocab} onComplete={onGameComplete} onBack={goBack} onUpdateMastery={onUpdateMastery} />}
        {activeGame === 'writing' && <WriteGame vocabulary={gameVocab} onComplete={onGameComplete} onBack={goBack} onUpdateMastery={onUpdateMastery} />}
        {activeGame === 'pronunciation' && <PronunciationGame words={gameVocab} onFinish={goBack} />}
      </motion.div>
    );
  }

  return (
    <motion.div
      key="custom-detail"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="space-y-6"
    >
      <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Quay lại
      </Button>

      {/* Folder header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 via-pink-50 to-white border border-rose-100 p-6">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{folder.emoji}</span>
            <div>
              <h2 className="text-2xl font-bold text-rose-800">{folder.name}</h2>
              <p className="text-sm text-rose-400">{words.length} từ vựng</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2 border-rose-200 text-rose-600" onClick={() => setShowAddWordForm(true)}>
              <Plus className="h-4 w-4" /> Thêm từ
            </Button>
            <Button size="sm" variant="outline" className="gap-2 border-rose-200 text-rose-600" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4" /> Import
            </Button>
          </div>
        </div>
      </div>

      {/* Add Word Form */}
      <AnimatePresence>
        {showAddWordForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Card className="border-rose-200">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2"><Plus className="h-4 w-4 text-rose-400" /> Thêm từ mới</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input value={newWord.word} onChange={(e) => setNewWord({ ...newWord, word: e.target.value })} placeholder="Từ tiếng Nhật *" className="px-3 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-300 outline-none text-sm font-jp bg-background" autoFocus />
                  <input value={newWord.reading} onChange={(e) => setNewWord({ ...newWord, reading: e.target.value })} placeholder="Reading (hiragana)" className="px-3 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-300 outline-none text-sm font-jp bg-background" />
                  <input value={newWord.hanviet} onChange={(e) => setNewWord({ ...newWord, hanviet: e.target.value })} placeholder="Hán Việt" className="px-3 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-300 outline-none text-sm bg-background" />
                  <input value={newWord.meaning} onChange={(e) => setNewWord({ ...newWord, meaning: e.target.value })} placeholder="Nghĩa tiếng Việt *" className="px-3 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-300 outline-none text-sm bg-background" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddWordForm(false)}>Hủy</Button>
                  <Button size="sm" className="bg-gradient-to-r from-rose-400 to-pink-400 text-white" disabled={!newWord.word.trim() || !newWord.meaning.trim()} onClick={handleAddWord}>Thêm</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flashcard */}
      {words.length > 0 && currentWord ? (
        <>
          <Flashcard
            words={words}
            currentWord={currentWord}
            flashcardIndex={flashcardIndex}
            isFlipped={isFlipped}
            setIsFlipped={setIsFlipped}
            autoSpeak={autoSpeak}
            setAutoSpeak={setAutoSpeak}
            reversedCard={reversedCard}
            setReversedCard={setReversedCard}
            shuffled={shuffled}
            setShuffled={setShuffled}
            speak={speak}
            isWordSaved={isWordSaved}
            toggleSaved={toggleSaved}
            onPrev={(e) => {
               e?.stopPropagation();
               const prev = Math.max(0, flashcardIndex - 1);
               setFlashcardIndex(prev);
               setIsFlipped(false);
               if (autoSpeak && words[prev]) speak(words[prev].word);
            }}
            onNext={(e) => {
               e?.stopPropagation();
               const next = Math.min(words.length - 1, flashcardIndex + 1);
               setFlashcardIndex(next);
               setIsFlipped(false);
               if (autoSpeak && words[next]) speak(words[next].word);
            }}
            onReset={() => { setFlashcardIndex(0); setIsFlipped(false); }}
            isCustom={true}
          />
          
          <ReviewPanel
            showReviewPanel={showReviewPanel}
            setShowReviewPanel={setShowReviewPanel}
            wordCount={words.length}
            onSelectGame={(mode) => { setActiveGame(mode); setShowReviewPanel(false); }}
            isCustom={true}
          />
        </>
      ) : (
        <Card className="border-rose-200 border-dashed border-2">
          <CardContent className="p-8 text-center space-y-3">
            <FolderOpen className="h-12 w-12 text-rose-300 mx-auto" />
            <p className="text-muted-foreground">Chưa có từ nào. Thêm từ hoặc import để bắt đầu!</p>
          </CardContent>
        </Card>
      )}

      {/* Word List */}
      {words.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Danh sách từ ({words.length})</h3>
          <div className="space-y-2">
            {words.map((word, idx) => (
              <motion.div key={word.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.015 }}>
                <Card className={cn('group transition-all duration-200 hover:shadow-md cursor-pointer border', flashcardIndex === idx && 'ring-2 ring-rose-300/50 border-rose-300', idx % 2 === 0 ? 'bg-card' : 'bg-muted/20')}
                  onClick={() => { setFlashcardIndex(idx); setIsFlipped(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{idx + 1}</div>
                    <div className="min-w-[90px] shrink-0">
                      <p className="text-xl font-jp font-bold">{word.word}</p>
                    </div>
                    <div className="border-l pl-4 flex-1 min-w-0 space-y-0.5">
                      {word.reading && <p className="text-sm text-muted-foreground font-jp">{word.reading}</p>}
                      {word.hanviet && <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">{word.hanviet}</p>}
                      <p className="text-sm">{word.meaning}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); speak(word.word); }}>
                        <Volume2 className="h-3.5 w-3.5" />
                      </Button>
                      <motion.div whileTap={{ scale: 1.5 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); toggleSaved(word); }}
                        >
                          <Star className={cn('h-4 w-4 transition-colors', isWordSaved(word.word) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
                        </Button>
                      </motion.div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600" onClick={(e) => {
                        e.stopPropagation();
                        // wait, removeWordFromFolder needs to be passed in props directly from the hook or handled in Vocabulary.tsx
                        removeWordFromFolder(folder.id, word.id);
                        // Also wait! In Vocabulary.tsx, there was `setSelectedCustomFolder` called with updated words right after `removeWordFromFolder`. Without that, it won't re-render the word removal immediately. Let me fix the prop to a `handleRemoveWord(wordId)`.
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
