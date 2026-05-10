import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  
  CalendarClock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DueCard {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  next_review_date?: string;
}

interface ReviewPreviewProps {
  dueCards: DueCard[];
  dueCount: number;
  loadingDue?: boolean;
  onSessionComplete?: () => void;
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
const CardSkeleton = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-7 bg-muted/40 rounded-xl w-3/5 mx-auto" />
    <div className="h-4 bg-muted/30 rounded-xl w-2/5 mx-auto" />
    <div className="h-3 bg-muted/20 rounded-xl w-4/5 mx-auto" />
  </div>
);

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtDue(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
  } catch {
    return '';
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export const ReviewPreview: React.FC<ReviewPreviewProps> = ({
  dueCards,
  dueCount,
  loadingDue = false,
}) => {
  const navigate = useNavigate();
  const hasDue = dueCount > 0;

  // quick-preview carousel state
  const [previewIdx, setPreviewIdx] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);

  const currentCard = dueCards[previewIdx] ?? null;
  const totalPreview = dueCards.length;

  function goNext() {
    setShowMeaning(false);
    setPreviewIdx((i) => (i + 1) % totalPreview);
  }
  function goPrev() {
    setShowMeaning(false);
    setPreviewIdx((i) => (i - 1 + totalPreview) % totalPreview);
  }

  function handleStartReview() {
    trackEvent('review_widget_start_click', { due_count: dueCount });
    navigate('/review');
  }

  function handleOpenSRS() {
    trackEvent('review_widget_open_srs_click', { due_count: dueCount });
    navigate('/review');
  }

  function handleCardClick() {
    trackEvent('review_card_preview_click', {
      word: currentCard?.word,
      preview_index: previewIdx,
    });
    setShowMeaning((v) => !v);
  }

  function handleGoVocab() {
    trackEvent('review_empty_goto_vocab_click');
    navigate('/vocabulary');
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loadingDue) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="h-6 bg-muted/40 animate-pulse rounded-xl w-44" />
          <div className="h-10 bg-muted/30 animate-pulse rounded-full w-36" />
        </div>
        <Card className="border border-border/50 shadow-card rounded-2xl">
          <CardContent className="p-6">
            <CardSkeleton />
          </CardContent>
        </Card>
      </section>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!hasDue) {
    return (
      <motion.section
        variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
        className="space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-black flex items-center gap-2 text-foreground">
            <Brain className="h-5 w-5 text-sakura" />
            Cần ôn tập ngay
          </h2>
          <Button
            id="srs-open-empty-btn"
            size="sm"
            onClick={handleOpenSRS}
            className="bg-muted text-muted-foreground hover:bg-muted/80 font-black text-xs uppercase tracking-widest gap-1 rounded-full px-5 h-10"
          >
            Mở SRS Review <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Empty card */}
        <Card className="border border-border/40 rounded-2xl shadow-card bg-gradient-to-br from-sakura-light/10 via-background to-background">
          <CardContent className="p-8 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-sakura/10 flex items-center justify-center shadow-inner">
              <span className="text-3xl">🌸</span>
            </div>
            <div className="space-y-1.5">
              <p className="font-black text-foreground text-base">Hoàn hảo! Không có thẻ nào tới hạn</p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Bạn đã hoàn thành tất cả thẻ cần ôn. Hãy học thêm từ mới để tích lũy vốn từ vựng phong phú hơn nhé!
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                id="review-empty-goto-vocab-btn"
                onClick={handleGoVocab}
                className="gap-2 bg-sakura hover:bg-sakura/90 text-white rounded-full px-6 h-10 font-black text-xs uppercase tracking-widest shadow-md shadow-sakura/20"
              >
                <BookOpen className="h-4 w-4" />
                Khám phá Từ vựng
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.section>
    );
  }

  // ── Has due cards ───────────────────────────────────────────────────────────
  return (
    <motion.section
      variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}
      className="space-y-4"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-black flex items-center gap-2 text-foreground">
          <Brain className="h-5 w-5 text-sakura" />
          Cần ôn tập ngay
          <motion.span
            key={dueCount}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1.5 rounded-full bg-sakura text-white text-xs font-black shadow"
          >
            {dueCount}
          </motion.span>
        </h2>

        <Button
          id="srs-start-review-btn"
          size="sm"
          onClick={handleStartReview}
          className="bg-sakura text-white hover:bg-sakura/90 font-black text-xs uppercase tracking-widest gap-1 rounded-full px-5 h-10 shadow-md shadow-sakura/20 transition-transform active:scale-95"
        >
          Bắt đầu Ôn ngay <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Quick Preview Card ── */}
      <Card className="border border-border/50 rounded-2xl shadow-card overflow-hidden">
        <CardHeader className="py-3 px-5 bg-gradient-to-r from-sakura/5 via-background to-background border-b border-border/30 flex-row items-center justify-between gap-2">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
            Xem trước nhanh
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-sakura/5 text-sakura border-sakura/20 text-[10px] font-black px-2.5 h-5">
              {previewIdx + 1} / {totalPreview}
            </Badge>
            {totalPreview > 1 && (
              <div className="flex items-center gap-0.5">
                <button
                  aria-label="Thẻ trước"
                  onClick={goPrev}
                  className="p-1 rounded-lg hover:bg-sakura/10 text-muted-foreground hover:text-sakura transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  aria-label="Thẻ sau"
                  onClick={goNext}
                  className="p-1 rounded-lg hover:bg-sakura/10 text-muted-foreground hover:text-sakura transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {currentCard && (
              <motion.div
                key={currentCard.id + previewIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col items-center text-center gap-3"
              >
                {/* Word */}
                <p className="font-jp text-4xl font-black text-foreground leading-tight tracking-tight">
                  {currentCard.word}
                </p>

                {/* Reading */}
                {currentCard.reading && (
                  <p className="text-sm font-jp text-sakura/70 font-medium">
                    {currentCard.reading}
                  </p>
                )}

                {/* Meaning (toggle) */}
                <AnimatePresence>
                  {showMeaning && (
                    <motion.p
                      key="meaning"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-base font-semibold text-foreground/80 max-w-xs"
                    >
                      {currentCard.meaning}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Due date badge */}
                {currentCard.next_review_date && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
                    <CalendarClock className="h-3 w-3" />
                    Tới hạn {fmtDue(currentCard.next_review_date)}
                  </span>
                )}

                {/* Toggle meaning button */}
                <button
                  onClick={handleCardClick}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-black text-sakura hover:text-sakura/80 transition-colors uppercase tracking-widest"
                >
                  {showMeaning
                    ? <><EyeOff className="h-3.5 w-3.5" /> Ẩn nghĩa</>
                    : <><Eye className="h-3.5 w-3.5" /> Xem nghĩa</>
                  }
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        {/* Mini progress strip */}
        <div className="h-1 bg-muted/20">
          <motion.div
            className="h-full bg-sakura/60 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((previewIdx + 1) / totalPreview) * 100}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>
      </Card>

      {/* ── Thumbnail row ── */}
      {dueCards.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {dueCards.map((card, idx) => (
            <motion.button
              key={card.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setShowMeaning(false);
                setPreviewIdx(idx);
                trackEvent('review_card_thumbnail_click', { word: card.word, index: idx });
              }}
              className={`rounded-xl border-2 p-3 text-center transition-colors ${
                idx === previewIdx
                  ? 'border-sakura/60 bg-sakura/5 shadow-sm'
                  : 'border-border/40 bg-card hover:bg-sakura/5 hover:border-sakura/30'
              }`}
            >
              <p className="font-jp text-base font-bold truncate">{card.word}</p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{card.meaning}</p>
            </motion.button>
          ))}
        </div>
      )}
    </motion.section>
  );
};
