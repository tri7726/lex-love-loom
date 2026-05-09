import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Trophy, Loader2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFSRS, FSRSRating } from '@/hooks/useFSRS';
import { useXP } from '@/hooks/useXP';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { offlineSync } from '@/lib/offlineSync';
import { trackEvent } from '@/lib/analytics';
import { ModeSelector, ReviewMode } from '@/components/review/ModeSelector';
import { FlipMode } from '@/components/review/FlipMode';
import { MultipleChoiceMode } from '@/components/review/MultipleChoiceMode';
import { SpeedRoundMode } from '@/components/review/SpeedRoundMode';
import { TypeAnswerMode } from '@/components/review/TypeAnswerMode';

// ── Mode labels for display ───────────────────────────────────────────────────
const MODE_LABEL: Record<ReviewMode, string> = {
  flip:   'Lật thẻ',
  choice: 'Trắc nghiệm',
  speed:  'Speed Round',
  type:   'Gõ nghĩa',
};

// ── Session complete screen ───────────────────────────────────────────────────
interface SessionCompleteProps {
  reviewsDone: number;
  mode: ReviewMode;
  onRetry: () => void;
  onHome: () => void;
}

const SessionComplete: React.FC<SessionCompleteProps> = ({ reviewsDone, mode, onRetry, onHome }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-sakura-light/10 p-6">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full space-y-8 text-center"
    >
      <div className="space-y-4">
        <Trophy className="h-16 w-16 text-gold mx-auto drop-shadow-lg" />
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-foreground">Hoàn tất ôn tập!</h1>
          <p className="text-muted-foreground font-medium">
            Bạn vừa ôn <span className="font-black text-foreground">{reviewsDone}</span> thẻ theo chế độ{' '}
            <span className="font-black text-sakura">{MODE_LABEL[mode]}</span>.
          </p>
        </div>
      </div>

      <Card className="border-2 border-sakura/20 bg-white/80 backdrop-blur shadow-soft p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-sakura/5 rounded-2xl border border-sakura/10">
            <p className="text-2xl font-black text-sakura">{reviewsDone}</p>
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/70">Thẻ đã ôn</p>
          </div>
          <div className="p-4 bg-gold/5 rounded-2xl border border-gold/10">
            <p className="text-2xl font-black text-gold">+{reviewsDone * 5}</p>
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/70">XP nhận được</p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <Button
          onClick={onRetry}
          variant="outline"
          className="w-full rounded-2xl h-12 font-black border-sakura/30 text-sakura hover:bg-sakura/5"
        >
          🔄 Ôn lại với chế độ khác
        </Button>
        <Button
          onClick={onHome}
          className="w-full rounded-[2.5rem] bg-sakura hover:bg-sakura/90 h-14 font-black text-base shadow-lg shadow-sakura/20"
        >
          Về Dashboard
        </Button>
      </div>
    </motion.div>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
export const SRSReview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { reviewCard, flushSyncQueue } = useFSRS();
  const { awardXP } = useXP();

  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ReviewMode | null>(null); // null = mode selector
  const [sessionDone, setSessionDone] = useState(false);
  const [reviewsDone, setReviewsDone] = useState(0);
  const [doneMode, setDoneMode] = useState<ReviewMode>('flip');
  const [adaptive, setAdaptive] = useState<boolean>(() => {
    try { return localStorage.getItem('srs_adaptive') === '1'; } catch { return false; }
  });

  // ── Fetch due cards ─────────────────────────────────────────────────────────
  const fetchDueCards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (navigator.onLine) {
        if (adaptive) {
          // Adaptive queue: 70% due + 30% AI-injected weakness items
          const { data: queue, error: qErr } = await (supabase as any).rpc(
            'get_adaptive_review_queue',
            { _limit: 30 },
          );
          if (qErr) throw qErr;
          const ids = Array.from(new Set((queue ?? []).map((r: any) => r.item_id)));
          if (ids.length === 0) {
            setCards([]);
          } else {
            const { data: full, error: fErr } = await (supabase as any)
              .from('flashcards')
              .select('*')
              .in('id', ids);
            if (fErr) throw fErr;
            const annotMap = new Map<string, { reason: string; key: string }>();
            for (const r of (queue ?? [])) {
              if (r.source === 'weakness' && r.injected_reason) {
                annotMap.set(r.item_id, { reason: r.injected_reason, key: r.pattern_key });
              }
            }
            // Preserve queue order
            const byId = new Map((full ?? []).map((c: any) => [c.id, c]));
            const ordered = ids
              .map((id) => byId.get(id))
              .filter(Boolean)
              .map((c: any) => {
                const a = annotMap.get(c.id);
                return a ? { ...c, _injected_reason: a.reason, _pattern_key: a.key } : c;
              });
            setCards(ordered);
          }
        } else {
          const { data, error } = await (supabase as any)
            .from('flashcards')
            .select('*')
            .eq('user_id', user.id)
            .lte('next_review_date', new Date().toISOString())
            .order('next_review_date', { ascending: true });
          if (error) throw error;
          setCards(data || []);
          if (data) await offlineSync.cacheDueCards(data);
        }
      } else {
        const offline = await offlineSync.getOfflineCards();
        setCards(offline || []);
        if (offline?.length > 0) toast.info('📱 Đang ở chế độ ngoại tuyến');
      }
    } catch (e) {
      console.error('fetchDueCards error:', e);
      toast.error('Lỗi khi tải thẻ ôn tập');
    } finally {
      setLoading(false);
    }
  }, [user, adaptive]);

  // Online sync listener
  useEffect(() => {
    const handleOnline = async () => {
      const count = await flushSyncQueue();
      if (count > 0) {
        toast.success(`✨ Đã đồng bộ ${count} tiến trình học ngoại tuyến!`);
        fetchDueCards();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [flushSyncQueue, fetchDueCards]);

  useEffect(() => {
    fetchDueCards();
    trackEvent('srs_review_page_open');
  }, [fetchDueCards]);

  // ── Central FSRS rating handler (shared across all modes) ──────────────────
  const handleRate = useCallback(async (cardId: string, rating: FSRSRating) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    try {
      await reviewCard(cardId, rating, card);
      // Decay weakness score when user answers correctly on an injected card
      if (card._pattern_key && (rating === 3 || rating === 4)) {
        try {
          await (supabase as any).rpc('decay_weakness_score', {
            _pattern_key: card._pattern_key,
            _delta: rating === 4 ? 0.4 : 0.2,
          });
        } catch { /* non-blocking */ }
      }
    } catch (e) {
      console.error('Rate error:', e);
    }
  }, [cards, reviewCard]);

  // ── Session complete (called by each mode) ──────────────────────────────────
  const handleSessionComplete = useCallback(async (done: number, selectedMode: ReviewMode) => {
    const xpEarned = done * 5;
    try {
      await awardXP('flashcard', xpEarned, { cards_reviewed: done });
    } catch { /* non-blocking */ }
    trackEvent('srs_session_complete', { cards_reviewed: done, xp_earned: xpEarned, mode: selectedMode });
    toast.success(`⚡ +${xpEarned} XP từ buổi ôn tập!`, { duration: 2500 });
    setReviewsDone(done);
    setDoneMode(selectedMode);
    setSessionDone(true);
  }, [awardXP]);

  // ── Mode selection ──────────────────────────────────────────────────────────
  const handleSelectMode = (m: ReviewMode) => {
    trackEvent('srs_mode_selected', { mode: m, card_count: cards.length });
    setMode(m);
    setSessionDone(false);
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-sakura mx-auto" />
          <p className="font-black text-muted-foreground/70 uppercase tracking-widest text-xs">Đang chuẩn bị bộ thẻ...</p>
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (cards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-24 h-24 bg-sakura/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="h-12 w-12 text-sakura" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-foreground">Tuyệt vời!</h1>
            <p className="text-muted-foreground font-medium leading-relaxed">Bạn không còn thẻ nào tới hạn ôn tập lúc này.</p>
          </div>
          <Button onClick={() => navigate('/?session=done')} className="w-full rounded-[2rem] bg-sakura hover:bg-sakura/90 h-14 font-black shadow-lg shadow-sakura/20">
            Quay về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  // ── Session complete ────────────────────────────────────────────────────────
  if (sessionDone) {
    return (
      <SessionComplete
        reviewsDone={reviewsDone}
        mode={doneMode}
        onRetry={() => { setMode(null); setSessionDone(false); }}
        onHome={() => navigate('/?session=done')}
      />
    );
  }

  // ── Mode selector ───────────────────────────────────────────────────────────
  if (mode === null) {
    return (
      <div className="space-y-4">
        <div className="max-w-2xl mx-auto pt-4 px-4">
          <button
            onClick={() => {
              const next = !adaptive;
              setAdaptive(next);
              try { localStorage.setItem('srs_adaptive', next ? '1' : '0'); } catch {}
            }}
            className={`w-full rounded-2xl px-4 py-3 text-sm font-black border-2 transition ${
              adaptive
                ? 'bg-amber-50 border-amber-400 text-amber-800'
                : 'bg-white border-border text-muted-foreground hover:border-sakura/40'
            }`}
          >
            🎯 Adaptive AI {adaptive ? 'ON' : 'OFF'} ·{' '}
            <span className="font-medium">
              {adaptive
                ? 'Đang chèn câu nhắm điểm yếu vào phiên ôn'
                : 'Bật để AI chèn 30% câu hỏi nhắm điểm yếu của bạn'}
            </span>
          </button>
        </div>
        <ModeSelector
          dueCount={cards.length}
          onSelectMode={handleSelectMode}
          onBack={() => navigate('/')}
        />
      </div>
    );
  }

  // ── Active review session ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background relative">
      {/* Header */}
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between mb-8">
        <Button
          variant="ghost" size="icon"
          onClick={() => setMode(null)}
          className="rounded-2xl text-muted-foreground/70 hover:text-sakura"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="text-center space-y-1">
          <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Ôn tập định kỳ</h2>
          <Badge variant="outline" className="bg-white border-sakura/20 text-sakura font-black text-[10px]">
            {MODE_LABEL[mode]} · {cards.length} thẻ
          </Badge>
        </div>
        <div className="w-10" />
      </header>

      {/* Mode content */}
      <main className="max-w-2xl w-full mx-auto flex-1 flex flex-col">
        {mode === 'flip' && (
          <FlipMode
            cards={cards}
            onRate={handleRate}
            onComplete={done => handleSessionComplete(done, 'flip')}
          />
        )}
        {mode === 'choice' && (
          <MultipleChoiceMode
            cards={cards}
            onRate={handleRate}
            onComplete={done => handleSessionComplete(done, 'choice')}
          />
        )}
        {mode === 'speed' && (
          <SpeedRoundMode
            cards={cards}
            onRate={handleRate}
            onComplete={done => handleSessionComplete(done, 'speed')}
          />
        )}
        {mode === 'type' && (
          <TypeAnswerMode
            cards={cards}
            onRate={handleRate}
            onComplete={done => handleSessionComplete(done, 'type')}
          />
        )}
      </main>
    </div>
  );
};

export default SRSReview;
