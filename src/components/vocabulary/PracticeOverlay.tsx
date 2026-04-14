import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowLeft, Keyboard, Brain, Gamepad2, PencilLine, Volume2, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MatchGame } from '@/components/games/MatchGame';
import { MultipleChoiceGame } from '@/components/games/MultipleChoiceGame';
import { WriteGame } from '@/components/games/WriteGame';
import { ListeningGame } from '@/components/games/ListeningGame';
import { TypingGame } from '@/components/games/TypingGame';
import { SpeedGame } from '@/components/games/SpeedGame';
import { PronunciationGame } from '@/components/games/PronunciationGame';
import { FillBlankGame } from '@/components/games/FillBlankGame';
import { KanaRain } from '@/components/games/KanaRain';
import { VocabularyItem } from '@/types/vocabulary';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useXP } from '@/hooks/useXP';
import { toast } from 'sonner';

type GameMode = 'match' | 'quiz' | 'write' | 'listening' | 'speed' | 'typing' | 'pronunciation' | 'fillblank' | 'kanarain';

interface PracticeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  words: VocabularyItem[];
  initialMode?: GameMode | null;
  isDailyReview?: boolean;
}

const GAME_CARDS: { id: GameMode; label: string; icon: React.FC<{ className?: string }>; desc: string; color: string; bg: string; badge?: string }[] = [
  { id: 'speed',       label: 'Speed Quiz',      icon: Zap,         desc: '4 hướng • đếm ngược • Combo',         color: 'text-rose-500',    bg: 'bg-rose-50',    badge: 'HOT' },
  { id: 'kanarain',   label: 'Kana Rain',        icon: Gamepad2,    desc: 'Arcade • Từ rơi • Gõ nghĩa',          color: 'text-cyan-500',    bg: 'bg-cyan-50',    badge: 'NEW' },
  { id: 'fillblank',  label: 'Điền chỗ trống',   icon: PencilLine,  desc: 'Ký tự ẩn • Context • JLPT-style',     color: 'text-violet-500',  bg: 'bg-violet-50',  badge: 'NEW' },
  { id: 'match',       label: 'Ghép cặp',         icon: Brain,       desc: 'Memory mode • 3 chế độ ghép',         color: 'text-blue-500',    bg: 'bg-blue-50' },
  { id: 'typing',      label: 'Gõ từ',            icon: Keyboard,    desc: 'WPM • Combo • Gợi ý 3 cấp',           color: 'text-indigo-500',  bg: 'bg-indigo-50' },
  { id: 'listening',   label: 'Nghe hiểu',        icon: Volume2,     desc: 'Nghe TTS • Nhận diện từ',             color: 'text-orange-500',  bg: 'bg-orange-50' },
  { id: 'quiz',        label: 'Trắc nghiệm',      icon: BarChart3,   desc: '4 lựa chọn • Ôn tập tổng hợp',       color: 'text-green-500',   bg: 'bg-green-50' },
  { id: 'pronunciation', label: 'Phát âm',        icon: Volume2,     desc: 'Luyện nói • AI đánh giá phát âm',    color: 'text-pink-500',    bg: 'bg-pink-50' },
];

// ── Record a mistake for EvoSkill to pick up ──────────────────────────────
async function recordMistake(userId: string, wordId: string, word: VocabularyItem) {
  try {
    await (supabase as any).from('sensei_knowledge').insert({
      user_id: userId,
      source_type: 'mistake',
      content: `Sai từ: ${word.word} (${word.reading ?? ''}) - nghĩa: ${word.meaning}`,
      metadata: { word_id: wordId, word: word.word, meaning: word.meaning, game: 'practice' },
    });
  } catch {
    // Non-blocking — silently ignore
  }
}

export const PracticeOverlay: React.FC<PracticeOverlayProps> = ({
  isOpen, onClose, words, initialMode = null,
}) => {
  const [mode, setMode] = useState<GameMode | null>(initialMode);
  const { user } = useAuth();
  const { awardXP } = useXP();

  if (!isOpen) return null;

  const handleUpdateMastery = useCallback(async (wordId: string, correct: boolean) => {
    if (!correct && user) {
      const word = words.find(w => w.id === wordId);
      if (word) await recordMistake(user.id, wordId, word);
    }
  }, [user, words]);

  const handleComplete = useCallback(async (results?: { correct?: number; total?: number; score?: number }) => {
    const correct = results?.correct ?? 0;
    const total   = results?.total ?? 0;
    const pct = total > 0 ? correct / total : 0;

    // Award XP based on performance
    const baseXP = 10;
    const bonusXP = Math.round(pct * 20); // up to +20 XP for perfect
    const totalXP = baseXP + bonusXP;

    await awardXP('quiz', totalXP, {
      game: mode,
      correct,
      total,
      score: results?.score,
    });

    const label = mode ? GAME_CARDS.find(c => c.id === mode)?.label ?? 'game' : 'game';
    if (pct >= 0.8) {
      toast.success(`🎉 ${label} — ${correct}/${total} đúng! +${totalXP} XP`);
    } else {
      toast.success(`✅ Đã hoàn thành ${label}! +${totalXP} XP`);
    }
    setMode(null);
  }, [mode, awardXP]);

  const renderGame = () => {
    const props = {
      vocabulary: words,
      onComplete: handleComplete,
      onUpdateMastery: handleUpdateMastery,
      onBack: () => setMode(null),
    };

    switch (mode) {
      case 'match':         return <MatchGame vocabulary={words} onUpdateMastery={handleUpdateMastery} onBack={() => setMode(null)} />;
      case 'quiz':          return <MultipleChoiceGame {...props} />;
      case 'write':         return <WriteGame {...props} />;
      case 'listening':     return <ListeningGame {...props} />;
      case 'typing':        return <TypingGame {...props} />;
      case 'speed':         return <SpeedGame {...props} />;
      case 'fillblank':     return <FillBlankGame {...props} />;
      case 'kanarain':      return <KanaRain {...props} />;
      case 'pronunciation': return <PronunciationGame words={words} onFinish={() => handleComplete()} />;
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
        {/* Nav bar */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={mode ? () => setMode(null) : onClose} className="gap-2 text-slate-500">
            {mode ? <ArrowLeft className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {mode ? 'Quay lại' : 'Đóng'}
          </Button>
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-sakura" />
            <span className="font-bold text-slate-700">
              {mode ? GAME_CARDS.find(c => c.id === mode)?.label : 'Thực hành'}
            </span>
          </div>
          <div className="w-20 text-right text-xs text-slate-300 font-medium">{words.length} từ</div>
        </div>

        <div className="flex-1 flex flex-col justify-center overflow-y-auto">
          {mode ? (
            renderGame()
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-display font-black text-slate-800">Chọn chế độ luyện tập</h2>
                <p className="text-sm text-slate-400 font-medium">{words.length} từ trong bộ sưu tập</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {GAME_CARDS.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setMode(card.id)}
                    className="group relative p-5 rounded-[2rem] bg-white border border-slate-100 hover:border-slate-200 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.06)] transition-all text-left space-y-3"
                  >
                    {card.badge && (
                      <span className={`absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 rounded-full ${card.badge === 'NEW' ? 'bg-violet-100 text-violet-600' : 'bg-rose-100 text-rose-600'}`}>
                        {card.badge}
                      </span>
                    )}
                    <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm group-hover:text-slate-900">{card.label}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-relaxed">{card.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
