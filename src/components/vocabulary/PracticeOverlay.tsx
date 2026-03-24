import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Trophy, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MatchGame } from '@/components/games/MatchGame';
import { MultipleChoiceGame } from '@/components/games/MultipleChoiceGame';
import { WriteGame } from '@/components/games/WriteGame';
import { ListeningGame } from '@/components/games/ListeningGame';
import { TypingGame } from '@/components/games/TypingGame';
import { SpeedGame } from '@/components/games/SpeedGame';
import { PronunciationGame } from '@/components/games/PronunciationGame';
import { VocabularyItem } from '@/types/vocabulary';
import { useVocabulary } from '@/hooks/useVocabulary';
import { toast } from 'sonner';

type GameMode = 'match' | 'quiz' | 'write' | 'listening' | 'speed' | 'typing' | 'pronunciation';

interface PracticeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  words: VocabularyItem[];
  initialMode?: GameMode | null;
  isDailyReview?: boolean;
}

export const PracticeOverlay: React.FC<PracticeOverlayProps> = ({
  isOpen,
  onClose,
  words,
  initialMode = null,
  isDailyReview = false,
}) => {
  const [mode, setMode] = useState<GameMode | null>(initialMode);
  const { handleSRSReview, updateWord } = useVocabulary();

  if (!isOpen) return null;

  const handleUpdateMastery = async (wordId: string, correct: boolean) => {
    const word = words.find(w => w.id === wordId);
    if (!word) return;

    if (isDailyReview) {
      await handleSRSReview(
        wordId, 
        word.srs_stage || 0, 
        word.easiness_factor || 2.5, 
        word.interval_days || 0, 
        correct
      );
    } else {
      const currentLevel = word.mastery_level || 0;
      const newLevel = correct 
        ? Math.min(currentLevel + 1, 5) 
        : Math.max(currentLevel - 1, 0);
      
      await updateWord({
        id: wordId,
        updates: { mastery_level: newLevel }
      });
    }
  };

  const handleComplete = (results: { correct: number; total: number }) => {
    toast.success(`Hoàn thành! Bạn đã trả lời đúng ${results.correct}/${results.total} câu!`);
    setMode(null);
  };

  const renderGame = () => {
    const props = {
      vocabulary: words,
      onComplete: handleComplete,
      onUpdateMastery: handleUpdateMastery,
      onBack: () => setMode(null),
    };

    switch (mode) {
      case 'match': return <MatchGame {...props} />;
      case 'quiz': return <MultipleChoiceGame {...props} />;
      case 'write': return <WriteGame {...props} />;
      case 'listening': return <ListeningGame {...props} />;
      case 'typing': return <TypingGame {...props} />;
      case 'speed': return <SpeedGame {...props} />;
      case 'pronunciation': return (
        <PronunciationGame 
          words={words} 
          onFinish={handleComplete} 
          onBack={() => setMode(null)} 
        />
      );
      default: return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col pt-16 md:pt-0"
    >
      <div className="container max-w-4xl mx-auto py-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={mode ? () => setMode(null) : onClose} className="gap-2">
            {mode ? <ArrowLeft className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {mode ? 'Quay lại' : 'Đóng'}
          </Button>
          <div className="flex items-center gap-2">
            {isDailyReview && <Zap className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
            <span className="font-bold">{isDailyReview ? 'Ôn tập hàng ngày' : 'Thực hành'}</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        <div className="flex-1 flex flex-col justify-center overflow-y-auto">
          {mode ? (
            renderGame()
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               {[
                { id: 'match', label: 'Ghép cặp', icon: Zap, color: 'text-blue-500' },
                { id: 'quiz', label: 'Trắc nghiệm', icon: Trophy, color: 'text-green-500' },
                { id: 'listening', label: 'Nghe hiểu', icon: Star, color: 'text-orange-500' },
                { id: 'write', label: 'Gõ đáp án', icon: Star, color: 'text-purple-500' },
                { id: 'speed', label: 'Tốc độ', icon: Zap, color: 'text-red-500' },
                { id: 'pronunciation', label: 'Phát âm', icon: Star, color: 'text-pink-500' },
               ].map((m) => (
                 <Card 
                   key={m.id}
                   className="cursor-pointer hover:border-primary/50 transition-all border-2"
                   onClick={() => setMode(m.id as GameMode)}
                 >
                   <CardContent className="p-6 flex flex-col items-center gap-3">
                     <m.icon className={`h-8 w-8 ${m.color}`} />
                     <span className="font-bold text-sm text-center">{m.label}</span>
                   </CardContent>
                 </Card>
               ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
