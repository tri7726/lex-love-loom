import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Heart, ChevronRight, Sparkles, Loader2, Gift, Hand, MessageCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePet } from '@/hooks/usePet';
import { cn } from '@/lib/utils';
import { PET_ID_TO_CONFIG, getRandomMessage, PET_TYPE_LIST } from '@/data/pet-config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PetWidgetInner = () => {
  const {
    pet,
    loading,
    error,
    createPet,
    feedPet,
    petInteract,
    getCurrentEvolutionStage,
    getNextEvolutionStage,
    getXpProgress,
  } = usePet();
  const [creating, setCreating] = useState(false);
  const [creatingType, setCreatingType] = useState<string | null>(null);
  const [speech, setSpeech] = useState('');
  const [speechVisible, setSpeechVisible] = useState(false);
  const [showQuickInteract, setShowQuickInteract] = useState(false);
  const [feeding, setFeeding] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pet type config
  const config = pet ? PET_ID_TO_CONFIG[pet.pet_type] : null;

  // Speech bubble system
  const showMessage = useCallback((messages: string[]) => {
    setSpeech(getRandomMessage(messages));
    setSpeechVisible(true);
    setTimeout(() => setSpeechVisible(false), 4000);
  }, []);

  // Cycle through idle messages
  useEffect(() => {
    if (!pet || !config) return;
    // Show first message after 3s
    const firstTimer = setTimeout(() => showMessage(config.messages.idle), 3000);
    // Then cycle every 12s
    intervalRef.current = setInterval(() => {
      showMessage(config.messages.idle);
    }, 12000);

    return () => {
      clearTimeout(firstTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pet?.pet_type, pet?.evolution_level, config]); // re-run when pet type or evolution changes

  const handleCreatePetFromWidget = async (typeId: string) => {
    setCreatingType(typeId);
    setCreating(true);
    await createPet(typeId);
    setCreating(false);
    setCreatingType(null);
  };

  const handleQuickFeed = async () => {
    setFeeding(true);
    const ok = await feedPet();
    setFeeding(false);
    if (ok && config) showMessage(config.messages.feed);
  };

  const handleQuickPet = async () => {
    setInteracting(true);
    const ok = await petInteract();
    setInteracting(false);
    if (ok && config) showMessage(config.messages.pet);
  };

  // Loading state
  if (loading) {
    return (
      <Card className="shadow-card border-sakura/10 overflow-hidden">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-sakura" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !pet) {
    return (
      <Card className="shadow-card border-rose-200 overflow-hidden">
        <CardContent className="p-6 text-center space-y-3">
          <p className="text-xs text-muted-foreground">Không thể tải thú cưng</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="rounded-xl text-xs">
            Thử lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Empty state — no pet yet, show pet selection grid ────────────────────
  if (!pet) {
    return (
      <Card className="shadow-card border-sakura/10 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sakura" />
            Thú cưng học tập
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[11px] text-muted-foreground">Chọn một bạn đồng hành để cùng học nhé!</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PET_TYPE_LIST.map((pt) => (
              <motion.button
                key={pt.id}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCreatePetFromWidget(pt.id)}
                disabled={creating}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all',
                  creatingType === pt.id
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border hover:border-sakura/40 hover:bg-sakura/5'
                )}
              >
                <span className="text-3xl">{pt.emoji}</span>
                <span className="text-[9px] font-bold text-center leading-tight">{pt.name}</span>
                {creatingType === pt.id && creating && (
                  <Loader2 className="h-3 w-3 animate-spin text-sakura mt-1" />
                )}
              </motion.button>
            ))}
          </div>
          {creating && !creatingType && <Loader2 className="h-5 w-5 animate-spin mx-auto text-sakura" />}
        </CardContent>
      </Card>
    );
  }

  // ── Normal state ─────────────────────────────────────────────────────────
  const currentStage = getCurrentEvolutionStage();
  const nextStage = getNextEvolutionStage();
  const xpProgress = getXpProgress();
  const isMaxLevel = !nextStage;

  const happinessHearts = Math.ceil(pet.happiness / 25);
  const isHappy = pet.happiness >= 50;

  const gradientFrom = config?.gradient?.split(' ')[0]?.replace('from-', '') || 'sakura';
  const gradClass = config?.gradient ? `from-${gradientFrom}` : 'from-sakura';

  return (
    <>
      <Card className={cn(
        "shadow-card overflow-hidden group hover:shadow-lg transition-all cursor-pointer relative",
        config?.borderColor || 'border-sakura/10'
      )}>
        {/* Link wraps the whole card to /pet */}
        <Link to="/pet">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-lg">{config?.emoji || '🦊'}</span>
                Thú cưng
              </CardTitle>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>
          </CardHeader>
        </Link>

        <CardContent className="space-y-3 relative">
          {/* Speech bubble */}
          <AnimatedSpeechBubble
            message={speech}
            visible={speechVisible}
            color={`bg-${gradientFrom}/10`}
          />

          {/* Pet display */}
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className={cn(
                "text-4xl w-16 h-16 flex items-center justify-center rounded-2xl",
                config?.bgColor || 'bg-sakura/10'
              )}
            >
              {currentStage?.emoji || '🥚'}
            </motion.div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm truncate">{pet.pet_name || 'Thú cưng'}</h4>
              <p className="text-[10px] text-muted-foreground">{currentStage?.form_name || 'Unknown'}</p>
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Heart
                    key={i}
                    className={cn(
                      'h-3 w-3 transition-all',
                      i < happinessHearts
                        ? isHappy ? 'fill-red-400 text-red-400' : 'fill-pink-300 text-pink-300'
                        : 'text-muted-foreground/20'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Quick interact buttons */}
            <div className="flex flex-col gap-1.5 shrink-0" onClick={(e) => e.preventDefault()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-500"
                onClick={handleQuickFeed}
                disabled={feeding}
                title="Cho ăn (-50 XP)"
              >
                {feeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-500"
                onClick={handleQuickPet}
                disabled={interacting}
                title="Vuốt ve"
              >
                {interacting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hand className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* XP progress */}
          {!isMaxLevel && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Lv.{pet.evolution_level}</span>
                <span>{xpProgress.current} / {xpProgress.required} XP</span>
              </div>
              <Progress value={xpProgress.percentage} className="h-1.5" />
              <p className="text-[9px] text-muted-foreground text-right">
                {nextStage?.emoji} {nextStage?.form_name}
              </p>
            </div>
          )}
          {isMaxLevel && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold">
              <Sparkles className="h-3 w-3" />
              Tối đa!
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

// ── Animated Speech Bubble ───────────────────────────────────────────────────
const AnimatedSpeechBubble = ({
  message,
  visible,
  color,
}: {
  message: string;
  visible: boolean;
  color: string;
}) => {
  if (!visible || !message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "absolute -top-2 right-12 z-10 max-w-[200px] px-3 py-2 rounded-2xl rounded-tr-sm shadow-sm border",
        "bg-white border-border",
      )}
    >
      <p className="text-[10px] leading-snug text-foreground/80">
        <MessageCircle className="h-3 w-3 inline mr-1 text-sakura -mt-0.5" />
        {message}
      </p>
      <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-white border-r border-b border-border rotate-45" />
    </motion.div>
  );
};

export const PetWidget = memo(function PetWidget() {
  return <PetWidgetInner />;
});
