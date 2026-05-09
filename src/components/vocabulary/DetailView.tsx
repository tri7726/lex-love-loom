import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Volume2, Star, PenTool, BrainCircuit } from 'lucide-react';
import { useWritingLab } from '@/contexts/WritingLabContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Flashcard } from './Flashcard';
import { ReviewPanel } from './ReviewPanel';
import { GameSessionStats } from './GameSessionStats';
import { getLevelGradient, getLevelAccent } from './utils';
import { TextbookSeries, JLPTLevel, Lesson, GameMode } from './types';
import { VocabWord, VocabularyItem } from '@/types/vocabulary';
import { MultipleChoiceGame } from '@/components/games/MultipleChoiceGame';
import { SpeedGame } from '@/components/games/SpeedGame';
import { ListeningGame } from '@/components/games/ListeningGame';
import { WriteGame } from '@/components/games/WriteGame';
import { PronunciationGame } from '@/components/games/PronunciationGame';
import { MatchGame } from '@/components/games/MatchGame';
import { JapaneseText } from '@/components/common/JapaneseText';
import { FillBlankGame } from './FillBlankGame';
import { BookmarkPlus } from 'lucide-react';

interface DetailViewProps {
  selectedSeries: TextbookSeries;
  selectedLevel: JLPTLevel;
  selectedLesson: Lesson;
  displayWords: VocabWord[];
  isWordSaved: (word: string) => boolean;
  toggleSaved: (vocab: VocabWord) => void;
  goBack: () => void;
  navigateToDetail: (lesson: Lesson) => void;

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

  // Game & Review
  activeGame: GameMode | null;
  setActiveGame: (g: GameMode | null) => void;
  showReviewPanel: boolean;
  setShowReviewPanel: (s: boolean) => void;

  // Smart Review
  smartReview?: boolean;
  setSmartReview?: (s: boolean) => void;
  getMastery?: (word: string) => number | null;

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
}

export const DetailView: React.FC<DetailViewProps> = ({
  selectedSeries, selectedLevel, selectedLesson, displayWords, isWordSaved, toggleSaved, goBack, navigateToDetail,
  flashcardIndex, setFlashcardIndex, isFlipped, setIsFlipped, autoSpeak, setAutoSpeak, reversedCard, setReversedCard, shuffled, setShuffled, speak,
  activeGame, setActiveGame, showReviewPanel, setShowReviewPanel,
  smartReview = false, setSmartReview, getMastery,
  onGameAnswer, onGameComplete, showGameStats = false, lastGameResult, bestStreak = 0,
  suggestedNextGame, onRetryWrong, onTryNextGame, onDismissStats, retryWords,
  customConfig, setCustomConfig, onAddAllToSRS,
}) => {
  const { openWritingLab } = useWritingLab();
  const navigate = useNavigate();
  const words = displayWords.length ? displayWords : selectedLesson.words;

  // Apply custom config to game vocabulary
  const applyGameConfig = (wordList: VocabWord[]): VocabWord[] => {
    let result = [...wordList];
    if (customConfig?.focus === 'weak' && getMastery) {
      result.sort((a, b) => (getMastery(a.word) ?? 0) - (getMastery(b.word) ?? 0));
    }
    if (customConfig?.focus === 'random') {
      result.sort(() => Math.random() - 0.5);
    }
    if (customConfig && customConfig.questionCount < result.length) {
      result = result.slice(0, customConfig.questionCount);
    }
    return result;
  };

  const rawGameWords = retryWords || words;
  const gameWords = activeGame ? applyGameConfig(rawGameWords) : rawGameWords;
  const currentWord = words[flashcardIndex];
  const lessonIndex = selectedLevel.lessons.indexOf(selectedLesson);
  const hasNext = lessonIndex >= 0 && lessonIndex < selectedLevel.lessons.length - 1;
  const grad = getLevelGradient(selectedSeries.id, selectedLevel.level);
  const accent = getLevelAccent(selectedSeries.id, selectedLevel.level);

  // ── Game event handlers ──
  const handleUpdateMastery = (wordId: string, correct: boolean) => {
    const word = words.find(w => w.id === wordId);
    if (word && onGameAnswer) {
      onGameAnswer(wordId, word.word, correct);
    }
  };

  const handleComplete = (results: { correct: number; total: number; score?: number }) => {
    if (onGameComplete) {
      onGameComplete(activeGame!, results.correct, results.total, gameWords, results.score);
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
      <motion.div key="game-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Button variant="ghost" size="sm" onClick={onDismissStats} className="gap-1 text-muted-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Quay lại bài học
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
    return (
      <motion.div key="game" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Quay lại bài học
        </Button>
        {activeGame === 'classic' && (
          <MultipleChoiceGame
            vocabulary={gameWords as VocabularyItem[]}
            onComplete={handleComplete}
            onUpdateMastery={handleUpdateMastery}
            onBack={() => setActiveGame(null)}
          />
        )}
        {activeGame === 'speed' && (
          <SpeedGame
            vocabulary={gameWords as VocabularyItem[]}
            onComplete={handleComplete}
            onUpdateMastery={handleUpdateMastery}
            onBack={() => setActiveGame(null)}
          />
        )}
        {activeGame === 'listening' && (
          <ListeningGame
            vocabulary={gameWords as VocabularyItem[]}
            onComplete={handleComplete}
            onUpdateMastery={handleUpdateMastery}
            onBack={() => setActiveGame(null)}
          />
        )}
        {activeGame === 'writing' && (
          <WriteGame
            vocabulary={gameWords as VocabularyItem[]}
            onComplete={handleComplete}
            onUpdateMastery={handleUpdateMastery}
            onBack={() => setActiveGame(null)}
          />
        )}
        {activeGame === 'match' && (
          <MatchGame
            vocabulary={gameWords as VocabularyItem[]}
            onUpdateMastery={handleUpdateMastery}
            onBack={() => setActiveGame(null)}
            onComplete={handleMatchComplete}
          />
        )}
        {activeGame === 'pronunciation' && (
          <PronunciationGame
            words={gameWords as VocabularyItem[]}
            onFinish={handlePronunciationFinish}
          />
        )}
        {activeGame === 'fillblank' && (
          <FillBlankGame
            vocabulary={gameWords as VocabularyItem[]}
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
      key="detail"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-3 items-center w-full mb-2">
        <div className="flex justify-start">
          <Button variant="ghost" size="sm" onClick={goBack} className="gap-2 text-sakura hover:bg-sakura-light/50 rounded-full font-bold transition-all px-4 h-10">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center gap-0.5 text-center px-4">
          <Badge className={cn('font-black w-fit uppercase text-[10px] tracking-widest', accent.badge)}>{selectedLevel.level}</Badge>
          <h2 className="font-display font-black text-foreground text-lg md:text-xl truncate max-w-full">
            {selectedSeries.name} – {selectedLesson.name}
          </h2>
        </div>

        <div className="flex justify-end">
          {hasNext ? (
            <Button
              variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-sakura rounded-full px-4 h-10 transition-all font-bold"
              onClick={() => navigateToDetail(selectedLevel.lessons[lessonIndex + 1])}
            >
              Tiếp <ArrowRight className="h-4 w-4" />
            </Button>
          ) : <div className="w-24" />}
        </div>
      </div>

      {currentWord && (
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
          getMastery={getMastery}
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
          grad={grad}
        />
      )}

      <ReviewPanel
        showReviewPanel={showReviewPanel}
        setShowReviewPanel={setShowReviewPanel}
        wordCount={words.length}
        levelText={selectedLevel.level}
        levelAccentClass={accent.text}
        onSelectGame={(mode) => {
          if (mode === 'lab') {
            openWritingLab(words[0].word, getMastery, {
              allWords: words.map(w => w.word),
              onWordComplete: (completedWord, score) => {
                const obj = words.find(w => w.word === completedWord);
                if (obj) onGameAnswer?.(obj.id, completedWord, score >= 70);
              }
            });
            setShowReviewPanel(false);
            return;
          }
          if (mode === 'boss') {
            navigate(`/boss-battle/${selectedLesson.id}`);
            setShowReviewPanel(false);
            return;
          }
          setActiveGame(mode); setShowReviewPanel(false);
        }}
        customConfig={customConfig}
        setCustomConfig={setCustomConfig}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b-2 border-sakura-light/30">
          <h3 className="font-display font-black text-xl text-sumi">Thuật ngữ trong bài ({words.length})</h3>
          <div className="flex items-center gap-2">
            {words.length > 0 && onAddAllToSRS && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onAddAllToSRS(words)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border bg-white text-indigo-600 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                + SRS
              </motion.button>
            )}
            {words.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => openWritingLab(words[0].word, getMastery, {
                  allWords: words.map(w => w.word),
                  onWordComplete: (completedWord, score) => {
                    const obj = words.find(w => w.word === completedWord);
                    if (obj) onGameAnswer?.(obj.id, completedWord, score >= 70);
                  }
                })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border bg-white text-muted-foreground/60 border-muted-foreground/20 hover:border-sakura hover:text-sakura"
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
            <Badge className="bg-sakura-light text-sakura-dark border-0 font-bold px-3 py-0.5">
              {words.filter(w => isWordSaved(w.word)).length} bookmark
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          {words.map((word, idx) => (
            <motion.div
              key={word.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: Math.min(idx * 0.012, 0.15)
              }}
              className="will-change-transform"
            >
              <Card
                className={cn(
                  'notranslate group transition-all duration-300 cursor-pointer shadow-none hover:shadow-md rounded-2xl overflow-hidden',
                  flashcardIndex === idx
                    ? `border-2 ${accent.ring.replace('ring-', 'border-')} bg-white shadow-soft ring-4 ${accent.ring}`
                    : 'bg-white/60 hover:bg-white border-sakura-light/20 rotate-0'
                )}
                translate="no"
                onClick={() => { setFlashcardIndex(idx); setIsFlipped(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                {/* Mastery bar */}
                {getMastery && (() => {
                  const mastery = getMastery(word.word);
                  if (mastery === null || mastery === undefined) return null;
                  return (
                    <div className="h-1 w-full bg-muted/30">
                      <div
                        className={cn(
                          'h-full transition-all duration-500',
                          mastery >= 80 ? 'bg-matcha' : mastery >= 50 ? 'bg-gold' : mastery >= 20 ? 'bg-orange-400' : 'bg-rose-400'
                        )}
                        style={{ width: `${mastery}%` }}
                      />
                    </div>
                  );
                })()}
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-[90px] shrink-0">
                    <JapaneseText
                      text={word.word}
                      furigana={word.reading}
                      level={selectedLevel.level}
                      size="lg"
                      className="font-bold text-foreground"
                    />
                  </div>
                  <div className="border-l border-border/50 pl-4 flex-1 min-w-0 space-y-0.5">
                    {word.reading && (
                      <p className="text-sm text-muted-foreground font-jp">{word.reading}</p>
                    )}
                    {word.hanviet && (
                      <p className="text-[11px] font-black text-gold-dark uppercase tracking-widest">{word.hanviet}</p>
                    )}
                    <p className="text-sm text-foreground/80 font-medium">{word.meaning}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Mastery indicator */}
                    {getMastery && (() => {
                      const m = getMastery(word.word);
                      if (m === null || m === undefined) return null;
                      return (
                        <div className="hidden sm:flex items-center gap-1.5 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-1">
                            <div className={cn(
                              'h-2 w-2 rounded-full',
                              m >= 80 ? 'bg-matcha' : m >= 50 ? 'bg-gold' : 'bg-rose-400'
                            )} />
                            <span className={cn(
                              'text-[9px] font-bold',
                              m >= 80 ? 'text-matcha' : m >= 50 ? 'text-gold-dark' : 'text-rose-500'
                            )}>
                              {m >= 80 ? 'Tốt' : m >= 50 ? 'Đang học' : 'Mới'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/70 hover:text-sakura"
                      onClick={(e) => { e.stopPropagation(); openWritingLab(word.word, getMastery); }}
                      title="Luyện viết Lab"
                    >
                      <PenTool className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); speak(word.word); }}
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </Button>
                    <motion.div whileTap={{ scale: 1.5 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); toggleSaved(word); }}
                      >
                        <Star className={cn('h-5 w-5 transition-colors', isWordSaved(word.word) ? 'fill-gold text-gold stroke-gold-dark' : 'text-muted-foreground')} />
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
