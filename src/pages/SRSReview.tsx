import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  Volume2, 
  ArrowRight,
  Trophy,
  Loader2,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFSRS, FSRSRating } from '@/hooks/useFSRS';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { offlineSync } from '@/lib/offlineSync';

export const SRSReview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { reviewCard, flushSyncQueue } = useFSRS();

  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [reviewsDone, setReviewsDone] = useState(0);

  const fetchDueCards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (navigator.onLine) {
        const { data, error } = await (supabase as any)
          .from('flashcards')
          .select('*')
          .eq('user_id', user.id)
          .lte('next_review_date', new Date().toISOString())
          .order('next_review_date', { ascending: true });
        
        if (error) throw error;
        setCards(data || []);
        // Cache for offline
        if (data) await offlineSync.cacheDueCards(data);
      } else {
        // Load from IDB
        const offlineCards = await offlineSync.getOfflineCards();
        setCards(offlineCards || []);
        if (offlineCards.length > 0) {
          toast.info("📱 Đang ở chế độ ngoại tuyến");
        }
      }
    } catch (e) {
      console.error('Error fetching cards:', e);
      toast.error('Lỗi khi tải thẻ ôn tập');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Sync listener
  useEffect(() => {
    const handleOnline = async () => {
      const count = await flushSyncQueue();
      if (count > 0) {
        toast.success(`✨ Đã đồng bộ ${count} tiến trình học ngoại tuyến!`);
        // Optionally refresh due cards after sync
        fetchDueCards();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [flushSyncQueue, fetchDueCards]);

  useEffect(() => {
    fetchDueCards();
  }, [fetchDueCards]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      speechSynthesis.speak(u);
    }
  };

  const handleRating = async (rating: FSRSRating) => {
    const card = cards[currentIndex];
    if (!card) return;

    try {
      await reviewCard(card.id, rating, card);
      setReviewsDone(prev => prev + 1);

      if (currentIndex + 1 < cards.length) {
        setIsFlipped(false);
        setCurrentIndex(prev => prev + 1);
      } else {
        setSessionDone(true);
      }
    } catch (e) {
      console.error('Rating error:', e);
      toast.error('Lỗi khi cập nhật thẻ');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-sakura mx-auto" />
          <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Đang chuẩn bị bộ thẻ...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-24 h-24 bg-sakura/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="h-12 w-12 text-sakura" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-800">Tuyệt vời!</h1>
            <p className="text-slate-500 font-medium leading-relaxed">Bạn không còn thẻ nào tới hạn ôn tập lúc này. Hãy quay lại sau nhé!</p>
          </div>
          <Button onClick={() => navigate('/')} className="w-full rounded-[2rem] bg-sakura hover:bg-sakura/90 h-14 font-black shadow-lg shadow-sakura/20">
            Quay về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  if (sessionDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-sakura-light/10 p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full space-y-8 text-center"
        >
          <div className="space-y-4">
            <Trophy className="h-16 w-16 text-gold mx-auto drop-shadow-lg" />
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-slate-800">Hoàn tất ôn tập!</h1>
              <p className="text-slate-500 font-medium">Bạn đã hoàn thành {reviewsDone} thẻ hôm nay.</p>
            </div>
          </div>

          <Card className="border-2 border-sakura/20 bg-white/80 backdrop-blur shadow-soft p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-sakura/5 rounded-2xl border border-sakura/10">
                <p className="text-2xl font-black text-sakura">{reviewsDone}</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Thẻ đã ôn</p>
              </div>
              <div className="p-4 bg-gold/5 rounded-2xl border border-gold/10">
                <p className="text-2xl font-black text-gold">+{reviewsDone * 5}</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">XP nhận được</p>
              </div>
            </div>
          </Card>

          <Button 
            onClick={() => navigate('/')} 
            className="w-full rounded-[2.5rem] bg-slate-900 hover:bg-black h-16 font-black text-lg shadow-xl"
          >
            Về Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col p-4 md:p-8">
      {/* Header */}
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-2xl text-slate-400 hover:text-sakura">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="text-center space-y-1">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Ôn tập định kỳ</h2>
          <div className="flex items-center gap-2 justify-center">
            <Badge variant="outline" className="bg-white border-sakura/20 text-sakura font-black text-[10px]">
              THẺ {currentIndex + 1} / {cards.length}
            </Badge>
          </div>
        </div>
        <div className="w-10" />
      </header>

      {/* Main Review Area */}
      <main className="max-w-2xl w-full mx-auto flex-1 flex flex-col items-center justify-center gap-12">
        
        {/* Flashcard */}
        <div className="w-full relative aspect-[4/5] md:aspect-[1.618/1] perspective-1000 group">
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
            className="w-full h-full relative preserve-3d cursor-pointer"
            onClick={() => !isFlipped && setIsFlipped(true)}
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden bg-white rounded-[3rem] border-2 border-slate-100 shadow-2xl flex flex-col items-center justify-center p-8 text-center space-y-6">
              <Badge variant="outline" className="bg-sakura/5 text-sakura text-[10px] border-none font-black uppercase tracking-widest px-4 py-1">Tiếng Nhật</Badge>
              <div className="space-y-2">
                <h3 className="text-6xl md:text-7xl font-jp font-black text-slate-800 leading-tight tracking-tight">{currentCard.word}</h3>
                {currentCard.reading && <p className="text-xl font-jp text-sakura/60 font-medium">{currentCard.reading}</p>}
              </div>
              <div className="pt-8">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] animate-pulse">Chạm để xem nghĩa</p>
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden bg-white rounded-[3rem] border-2 border-sakura/30 shadow-2xl flex flex-col items-center justify-center p-8 text-center space-y-8 rotate-y-180">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 text-[10px] border-none font-black uppercase tracking-widest px-4 py-1">Ý nghĩa</Badge>
              <div className="space-y-4">
                <h3 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight">{currentCard.meaning}</h3>
                {currentCard.hanviet && <p className="text-lg text-sakura-dark/70 font-jp font-bold">Hán Việt: {currentCard.hanviet}</p>}
                
                <button 
                  onClick={(e) => { e.stopPropagation(); speak(currentCard.word); }}
                  className="mx-auto flex items-center gap-2 text-sakura font-black text-xs hover:scale-105 transition-transform"
                >
                  <Volume2 className="h-5 w-5" /> Phát âm
                </button>
              </div>

              {currentCard.example_sentence && (
                <div className="max-w-xs p-4 rounded-2xl bg-slate-50 border border-slate-100 italic">
                  <p className="text-sm font-jp text-slate-600 mb-1">{currentCard.example_sentence}</p>
                  <p className="text-[10px] text-slate-400">{currentCard.example_translation}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Action Controls */}
        <div className="w-full h-32 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!isFlipped ? (
              <motion.div
                key="flip-hint"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Button 
                  onClick={() => setIsFlipped(true)}
                  className="bg-sakura hover:bg-sakura/90 text-white rounded-full px-12 h-14 font-black shadow-xl shadow-sakura/20 group gap-3 text-lg"
                >
                  Xem đáp án
                  <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="rating-controls"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid grid-cols-4 gap-3 w-full"
              >
                {[
                  { rating: 1, label: 'Lại', sub: '< 1m', color: 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' },
                  { rating: 2, label: 'Khó', sub: '2d', color: 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100' },
                  { rating: 3, label: 'Tốt', sub: '4d', color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' },
                  { rating: 4, label: 'Dễ', sub: '7d', color: 'bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100' },
                ].map((btn) => (
                  <button
                    key={btn.rating}
                    onClick={() => handleRating(btn.rating as any)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-[1.5rem] border-2 transition-all active:scale-95 space-y-1 font-bold",
                      btn.color
                    )}
                  >
                    <span className="text-lg">{btn.label}</span>
                    <span className="text-[10px] opacity-60 font-black uppercase tracking-widest">{btn.sub}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Progress */}
      <footer className="max-w-2xl w-full mx-auto pb-4">
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
            <span>Tiến độ buổi học</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-100 accent-sakura" />
        </div>
      </footer>
    </div>
  );
};

export default SRSReview;
