import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Volume2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Flashcard } from './Flashcard';
import { ReviewPanel } from './ReviewPanel';
import { getLevelGradient, getLevelAccent } from './utils';
import { TextbookSeries, JLPTLevel, Lesson, GameMode } from './types';
import { VocabularyItem } from '@/types/vocabulary';
import { VocabWord } from '@/hooks/useFlashcardFolders';
import { MultipleChoiceGame } from '@/components/games/MultipleChoiceGame';
import { SpeedGame } from '@/components/games/SpeedGame';
import { ListeningGame } from '@/components/games/ListeningGame';
import { WriteGame } from '@/components/games/WriteGame';
import { PronunciationGame } from '@/components/games/PronunciationGame';
import { MatchGame } from '@/components/games/MatchGame';
import { JapaneseText } from '@/components/JapaneseText';

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
}

export const DetailView: React.FC<DetailViewProps> = ({
  selectedSeries, selectedLevel, selectedLesson, displayWords, isWordSaved, toggleSaved, goBack, navigateToDetail,
  flashcardIndex, setFlashcardIndex, isFlipped, setIsFlipped, autoSpeak, setAutoSpeak, reversedCard, setReversedCard, shuffled, setShuffled, speak,
  activeGame, setActiveGame, showReviewPanel, setShowReviewPanel,
}) => {
  const words = displayWords.length ? displayWords : selectedLesson.words;
  const currentWord = words[flashcardIndex];
  const lessonIndex = selectedLevel.lessons.indexOf(selectedLesson);
  const hasNext = lessonIndex >= 0 && lessonIndex < selectedLevel.lessons.length - 1;
  const grad = getLevelGradient(selectedSeries.id, selectedLevel.level);
  const accent = getLevelAccent(selectedSeries.id, selectedLevel.level);

  if (activeGame) {
    return (
      <motion.div key="game" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Quay lại bài học
        </Button>
        {activeGame === 'classic' && <MultipleChoiceGame vocabulary={words as VocabularyItem[]} onComplete={() => setActiveGame(null)} onUpdateMastery={() => {}} onBack={() => setActiveGame(null)} />}
        {activeGame === 'speed' && <SpeedGame vocabulary={words as VocabularyItem[]} onComplete={() => setActiveGame(null)} onUpdateMastery={() => {}} onBack={() => setActiveGame(null)} />}
        {activeGame === 'listening' && <ListeningGame vocabulary={words as VocabularyItem[]} onComplete={() => setActiveGame(null)} onUpdateMastery={() => {}} onBack={() => setActiveGame(null)} />}
        {activeGame === 'writing' && <WriteGame vocabulary={words as VocabularyItem[]} onComplete={() => setActiveGame(null)} onUpdateMastery={() => {}} onBack={() => setActiveGame(null)} />}
        {activeGame === 'match' && <MatchGame vocabulary={words as VocabularyItem[]} onUpdateMastery={() => {}} onBack={() => setActiveGame(null)} />}
        {activeGame === 'pronunciation' && <PronunciationGame words={words as VocabularyItem[]} onFinish={() => setActiveGame(null)} />}
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
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>
        <div className="flex items-center gap-2">
          <Badge className={cn('font-bold', accent.badge)}>{selectedLevel.level}</Badge>
          <span className="font-bold">{selectedSeries.name} – {selectedLesson.name}</span>
        </div>
        {hasNext ? (
          <Button
            variant="ghost" size="sm" className="gap-1 text-muted-foreground"
            onClick={() => navigateToDetail(selectedLevel.lessons[lessonIndex + 1])}
          >
            Tiếp <ArrowRight className="h-4 w-4" />
          </Button>
        ) : <div className="w-20" />}
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
        onSelectGame={(mode) => { setActiveGame(mode); setShowReviewPanel(false); }}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Thuật ngữ trong bài ({words.length})</h3>
          <Badge variant="outline" className="text-xs">
            {words.filter(w => isWordSaved(w.word)).length} đã lưu
          </Badge>
        </div>
        <div className="space-y-2">
          {words.map((word, idx) => (
            <motion.div key={word.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.015 }}>
              <Card
                className={cn(
                  'notranslate group transition-all duration-200 hover:shadow-md cursor-pointer border',
                  flashcardIndex === idx && 'ring-2 ring-primary/30 border-primary/40',
                  idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                )}
                translate="no"
                onClick={() => { setFlashcardIndex(idx); setIsFlipped(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-[120px] shrink-0">
                    <JapaneseText 
                      text={word.word} 
                      furigana={word.reading} 
                      level={selectedLevel.level}
                      size="md"
                      className="font-bold"
                    />
                  </div>
                  <div className="border-l pl-4 flex-1 min-w-0 space-y-0.5">
                    {word.hanviet && <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">{word.hanviet}</p>}
                    <p className="text-sm">{word.meaning}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
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
                        <Star className={cn('h-4 w-4 transition-colors', isWordSaved(word.word) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
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
