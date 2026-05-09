import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Upload, FolderOpen, Volume2, PenTool, Trash2, Star, BrainCircuit, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Flashcard } from './Flashcard';
import { ReviewPanel } from './ReviewPanel';
import { GameSessionStats } from './GameSessionStats';
import { GameMode } from './types';
import { CustomFolder } from '@/hooks/useFlashcardFolders';
import { VocabWord } from '@/types/vocabulary';
import { MultipleChoiceGame } from '@/components/games/MultipleChoiceGame';
import { SpeedGame } from '@/components/games/SpeedGame';
import { ListeningGame } from '@/components/games/ListeningGame';
import { WriteGame } from '@/components/games/WriteGame';
import { PronunciationGame } from '@/components/games/PronunciationGame';
import { MatchGame } from '@/components/games/MatchGame';
import { FillBlankGame } from './FillBlankGame';
import { useWritingLab } from '@/contexts/WritingLabContext';
import { BookmarkPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  smartReview?: boolean;
  setSmartReview?: (s: boolean) => void;
  getMastery?: (word: string) => number | null;

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

  // ── Session tracking (cross-game progression) ──
  onGameAnswer?: (wordId: string, wordText: string, correct: boolean) => void;
  onGameComplete?: (gameType: GameMode, correct: number, total: number, words: VocabWord[], score?: number) => void;
  showGameStats?: boolean;
  lastGameResult?: {
    gameType: GameMode;
    correct: number;
    total: number;
    score?: number;
    wrongWords: VocabWord[];
  } | null;
  bestStreak?: number;
  suggestedNextGame?: { game: GameMode; reason: string };
  onRetryWrong?: (words: VocabWord[]) => void;
  onTryNextGame?: (game: GameMode) => void;
  onDismissStats?: () => void;
  retryWords?: VocabWord[] | null;
  customConfig?: { questionCount: number; focus: 'all' | 'weak' | 'random'; timer: boolean; mixMode: boolean };
  setCustomConfig?: (c: { questionCount: number; focus: 'all' | 'weak' | 'random'; timer: boolean; mixMode: boolean }) => void;
  onAddAllToSRS?: (words: VocabWord[]) => void;
  onExportFolder?: (folder: CustomFolder) => void;
}

export const CustomDetailView: React.FC<CustomDetailViewProps> = ({
  selectedCustomFolder, removeWordFromFolder, goBack,
  flashcardIndex, setFlashcardIndex, isFlipped, setIsFlipped, autoSpeak, setAutoSpeak, reversedCard, setReversedCard, shuffled, setShuffled, speak,
  isWordSaved, toggleSaved,
  activeGame, setActiveGame, showReviewPanel, setShowReviewPanel,
  showAddWordForm, setShowAddWordForm, setShowImportDialog, newWord, setNewWord, handleAddWord,
  onGameAnswer, onGameComplete, showGameStats = false, lastGameResult, bestStreak = 0,
  suggestedNextGame, onRetryWrong, onTryNextGame, onDismissStats, retryWords,
  customConfig, setCustomConfig,
  smartReview = false, setSmartReview, getMastery,
  onAddAllToSRS, onExportFolder,
}) => {
  const folder = selectedCustomFolder;
  const words = folder.words;
  const navigate = useNavigate();
  const { openWritingLab } = useWritingLab();
  const { toast } = useToast();
  const [publishing, setPublishing] = React.useState(false);

  const handlePublish = async () => {
    if (words.length === 0) return;
    setPublishing(true);
    try {
      const { data, error } = await (supabase as any).rpc('publish_deck', {
        p_deck_id: folder.id,
        p_title: folder.name,
        p_description: `Bộ thẻ ${folder.name} với ${words.length} từ vựng.`
      });
      if (error) throw error;
      toast({
        title: "Đã công khai bộ thẻ! 🌸",
        description: "Mọi người hiện đã có thể tìm thấy bộ thẻ của bạn trong Thư viện chung."
      });
    } catch (err: any) {
      toast({ title: "Lỗi công khai", description: err.message, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  // Smart Review / shuffle sorting for display
  const sortedWords = React.useMemo(() => {
    let result = [...words];
    if (shuffled) result.sort(() => Math.random() - 0.5);
    if (smartReview && getMastery) {
      result.sort((a, b) => (getMastery(a.word) ?? 0) - (getMastery(b.word) ?? 0));
    }
    return result;
  }, [words, shuffled, smartReview, getMastery]);

  // Reset flashcard index when sorting changes
  React.useEffect(() => {
    setFlashcardIndex(0);
    setIsFlipped(false);
  }, [smartReview, shuffled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply custom config to game vocabulary
  const applyGameConfig = (wordList: VocabWord[]): VocabWord[] => {
    let result = [...wordList];
    if (customConfig?.focus === 'weak') {
      // Sort weak words first (lower mastery = first)
      result.sort((a, b) => (a.mastery_level ?? 0) - (b.mastery_level ?? 0));
    }
    if (customConfig?.focus === 'random') {
      result.sort(() => Math.random() - 0.5);
    }
    if (customConfig && customConfig.questionCount < result.length) {
      result = result.slice(0, customConfig.questionCount);
    }
    return result;
  };

  const rawGameWords = retryWords || sortedWords;
  const gameWords = activeGame ? applyGameConfig(rawGameWords) : rawGameWords;
  const currentWord = sortedWords[flashcardIndex];

  // ── Game event handlers ──
  const handleUpdateMastery = (wordId: string, correct: boolean) => {
    const word = words.find(w => w.id === wordId);
    if (word && onGameAnswer) {
      onGameAnswer(wordId, word.word, correct);
    }
  };

  const handleComplete = (results: { correct: number; total: number; score?: number }) => {
    if (onGameComplete && activeGame) {
      onGameComplete(activeGame, results.correct, results.total, gameWords, results.score);
    }
  };

  const handleMatchComplete = () => {
    if (onGameComplete && activeGame) {
      onGameComplete(activeGame, gameWords.length, gameWords.length, gameWords);
    }
  };

  const handlePronunciationFinish = () => {
    if (onGameComplete && activeGame) {
      onGameComplete(activeGame, 0, gameWords.length, gameWords);
    }
  };

  // Show game session stats overlay (deferred for MatchGame which has its own completion screen)
  if (showGameStats && lastGameResult && onDismissStats && activeGame !== 'match') {
    return (
      <motion.div key="custom-game-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onDismissStats} className="gap-1 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Quay lại
        </Button>
        <GameSessionStats
          gameType={lastGameResult.gameType}
          correct={lastGameResult.correct}
          total={lastGameResult.total}
          score={lastGameResult.score}
          wrongWords={lastGameResult.wrongWords}
          bestStreak={bestStreak}
          suggestedNext={suggestedNextGame || { game: 'classic', reason: 'Tiếp tục ôn tập!' }}
          onLabWord={(w) => openWritingLab(w.word, getMastery)}
          onRetryWrong={() => onRetryWrong?.(lastGameResult.wrongWords)}
          onTryNext={(g) => onTryNextGame?.(g)}
          onContinue={onDismissStats}
          onBack={() => { onDismissStats(); setActiveGame(null); }}
        />
      </motion.div>
    );
  }

  // Active game rendering
  if (activeGame) {
    const gameVocab = gameWords.map((w) => ({
      id: w.id, word: w.word, reading: w.reading || '', meaning: w.meaning, mastery_level: w.mastery_level,
    }));

    return (
      <motion.div key="custom-game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)} className="gap-1 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Quay lại
        </Button>
        {activeGame === 'classic' && <MultipleChoiceGame vocabulary={gameVocab} onComplete={handleComplete} onBack={() => setActiveGame(null)} onUpdateMastery={handleUpdateMastery} />}
        {activeGame === 'speed' && <SpeedGame vocabulary={gameVocab} onComplete={handleComplete} onBack={() => setActiveGame(null)} onUpdateMastery={handleUpdateMastery} />}
        {activeGame === 'listening' && <ListeningGame vocabulary={gameVocab} onComplete={handleComplete} onBack={() => setActiveGame(null)} onUpdateMastery={handleUpdateMastery} />}
        {activeGame === 'writing' && <WriteGame vocabulary={gameVocab} onComplete={handleComplete} onBack={() => setActiveGame(null)} onUpdateMastery={handleUpdateMastery} />}
        {activeGame === 'match' && <MatchGame vocabulary={gameVocab} onUpdateMastery={handleUpdateMastery} onBack={() => setActiveGame(null)} onComplete={handleMatchComplete} />}
        {activeGame === 'pronunciation' && <PronunciationGame words={gameVocab} onFinish={handlePronunciationFinish} />}
        {activeGame === 'fillblank' && (
          <FillBlankGame
            vocabulary={gameVocab}
            onComplete={handleComplete}
            onUpdateMastery={handleUpdateMastery}
            onBack={() => setActiveGame(null)}
          />
        )}
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
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 border-gold/30 text-gold hover:bg-gold/10" 
              onClick={handlePublish}
              disabled={publishing || words.length === 0}
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              Công khai
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
      {sortedWords.length > 0 && currentWord ? (
        <>
          <Flashcard
            words={sortedWords}
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
            getMastery={getMastery}
            onPrev={(e) => {
               e?.stopPropagation();
               const prev = Math.max(0, flashcardIndex - 1);
               setFlashcardIndex(prev);
               setIsFlipped(false);
               if (autoSpeak && sortedWords[prev]) speak(sortedWords[prev].word);
            }}
            onNext={(e) => {
               e?.stopPropagation();
               const next = Math.min(sortedWords.length - 1, flashcardIndex + 1);
               setFlashcardIndex(next);
               setIsFlipped(false);
               if (autoSpeak && sortedWords[next]) speak(sortedWords[next].word);
            }}
            onReset={() => { setFlashcardIndex(0); setIsFlipped(false); }}
            isCustom={true}
          />

          <ReviewPanel
            showReviewPanel={showReviewPanel}
            setShowReviewPanel={setShowReviewPanel}
            wordCount={words.length}
            onSelectGame={(mode) => {
              if (mode === 'lab') {
                openWritingLab(sortedWords[0].word, getMastery, {
                  allWords: sortedWords.map((w: { word: string }) => w.word),
                  onWordComplete: (completedWord: string, score: number) => {
                    const obj = sortedWords.find((w: { word: string }) => w.word === completedWord);
                    if (obj) onGameAnswer?.(obj.id, completedWord, score >= 70);
                  }
                });
                setShowReviewPanel(false);
                return;
              }
              if (mode === 'boss') {
                navigate(`/boss-battle/${folder.id}`);
                setShowReviewPanel(false);
                return;
              }
              setActiveGame(mode); setShowReviewPanel(false);
            }}
            isCustom={true}
            customConfig={customConfig}
            setCustomConfig={setCustomConfig}
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
      {sortedWords.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-rose-200/30">
            <h3 className="font-bold text-lg">Danh sách từ ({sortedWords.length})</h3>
            <div className="flex items-center gap-2">
              {sortedWords.length > 0 && onAddAllToSRS && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onAddAllToSRS(sortedWords)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border bg-white text-indigo-600 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" />
                  + SRS
                </motion.button>
              )}
              {onExportFolder && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onExportFolder(folder)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border bg-white text-muted-foreground/60 border-muted-foreground/20 hover:border-emerald-400 hover:text-emerald-500"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Xuất file
                </motion.button>
              )}
              {sortedWords.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openWritingLab(sortedWords[0].word, getMastery, {
                    allWords: sortedWords.map(w => w.word),
                    onWordComplete: (completedWord, score) => {
                      const obj = sortedWords.find(w => w.word === completedWord);
                      if (obj) onGameAnswer?.(obj.id, completedWord, score >= 70);
                    }
                  })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border bg-white text-muted-foreground/60 border-muted-foreground/20 hover:border-rose-400 hover:text-rose-500"
                >
                  <PenTool className="h-3.5 w-3.5" />
                  Luyện viết
                </motion.button>
              )}
              {setSmartReview && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSmartReview(!smartReview)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border',
                    smartReview
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm'
                      : 'bg-white text-muted-foreground/60 border-muted-foreground/20 hover:border-indigo-200'
                  )}
                >
                  <BrainCircuit className="h-3.5 w-3.5" />
                  Smart Review
                </motion.button>
              )}
              <span className="text-[10px] font-bold text-rose-300 tracking-widest uppercase">
                {sortedWords.filter(w => isWordSaved(w.word)).length} bookmark
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {sortedWords.map((word, idx) => (
              <motion.div key={word.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.015 }}>
                <Card className={cn('notranslate group transition-all duration-200 shadow-none hover:shadow-md cursor-pointer rounded-2xl overflow-hidden border',
                  flashcardIndex === idx ? 'ring-2 ring-rose-300/50 border-rose-300 bg-white' : 'bg-white/60 hover:bg-white border-rose-200/30'
                )}
                  translate="no"
                  onClick={() => { setFlashcardIndex(idx); setIsFlipped(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  {/* Mastery bar */}
                  {getMastery && (() => {
                    const m = getMastery(word.word);
                    if (m === null || m === undefined) return null;
                    return (
                      <div className="h-1 w-full bg-muted/30">
                        <div className={cn('h-full transition-all duration-500',
                          m >= 80 ? 'bg-matcha' : m >= 50 ? 'bg-gold' : m >= 20 ? 'bg-orange-400' : 'bg-rose-400'
                        )} style={{ width: `${m}%` }} />
                      </div>
                    );
                  })()}
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
                      {/* Mastery indicator */}
                      {getMastery && (() => {
                        const m = getMastery(word.word);
                        if (m === null || m === undefined) return null;
                        return (
                          <div className="hidden sm:flex items-center gap-1.5 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className={cn('h-2 w-2 rounded-full',
                              m >= 80 ? 'bg-matcha' : m >= 50 ? 'bg-gold' : 'bg-rose-400'
                            )} />
                            <span className={cn('text-[9px] font-bold',
                              m >= 80 ? 'text-matcha' : m >= 50 ? 'text-amber-600' : 'text-rose-500'
                            )}>
                              {m >= 80 ? 'Tốt' : m >= 50 ? 'Đang học' : 'Mới'}
                            </span>
                          </div>
                        );
                      })()}
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); speak(word.word); }}>
                        <Volume2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/70 hover:text-sakura" onClick={(e) => { e.stopPropagation(); openWritingLab(word.word, getMastery); }}>
                        <PenTool className="h-3.5 w-3.5" />
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
                        removeWordFromFolder(folder.id, word.id);
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
