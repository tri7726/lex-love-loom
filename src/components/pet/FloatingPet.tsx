import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Utensils, Zap, MessageCircle, X, ChevronRight,
  Gamepad2, Bath, Footprints, Moon, ShoppingCart, Hand, Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePet } from '@/hooks/usePet';
import { PET_ID_TO_CONFIG, getRandomMessage, getPetMood } from '@/data/pet-config';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import AdvancedPetRenderer from './AdvancedPetRenderer';
import { usePetLearningReactions } from '@/hooks/usePetLearningReactions';

export const FloatingPet = () => {
  const {
    pet,
    loading,
    getCurrentEvolutionStage,
    feedPet,
    petInteract,
    playWithPet,
    bathePet,
    walkPet,
    petSleep,
    getXpProgress,
  } = usePet();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [speech, setSpeech] = useState('');
  const [showSpeech, setShowSpeech] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const currentStage = getCurrentEvolutionStage();
  const config = pet ? PET_ID_TO_CONFIG[pet.pet_type] : null;

  // Show random idle messages occasionally
  useEffect(() => {
    if (!pet || !config || isOpen) return;

    const timer = setInterval(() => {
      if (Math.random() > 0.7) {
        setSpeech(getRandomMessage(config.messages.idle));
        setShowSpeech(true);
        setTimeout(() => setShowSpeech(false), 5000);
      }
    }, 20000);

    return () => clearInterval(timer);
  }, [pet, config, isOpen]);

  const speak = useCallback((msg: string, durationMs = 3000) => {
    setSpeech(msg);
    setShowSpeech(true);
    setTimeout(() => setShowSpeech(false), durationMs);
  }, []);

  // Phản ứng theo hành vi học của user (vui khi đạt mục tiêu, buồn khi mất streak, ...)
  usePetLearningReactions(useCallback((event) => {
    if (!event) return;
    speak(`${event.emoji} ${event.message}`, 6000);
  }, [speak]));

  const handleAction = async (action: string, fn: () => Promise<boolean>, msgKey: keyof typeof config.messages) => {
    if (!config) return;
    setActionLoading(action);
    const ok = await fn();
    setActionLoading(null);
    if (ok) {
      const msgs = config.messages[msgKey];
      if (msgs && Array.isArray(msgs)) speak(getRandomMessage(msgs));
      else speak(getRandomMessage(config.messages.happy));
    }
  };

  if (loading) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[45] flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="pointer-events-auto"
          >
            <div className="bg-white/90 backdrop-blur-xl border-2 border-sakura/20 shadow-elevated rounded-3xl p-4 w-72 mb-2 overflow-hidden relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                <div className="relative">
                  <AdvancedPetRenderer 
                    baseImage={currentStage?.image_url}
                    emoji={config?.moodEmojis?.[getPetMood(pet.happiness, pet.hunger, pet.energy)] || currentStage?.emoji}
                    state={pet.status_effect as any}
                    size={48}
                  />
                </div>
                  <div>
                    <h4 className="font-black text-xs text-foreground truncate max-w-[120px]">
                      {pet.pet_name || 'Thú cưng'}
                    </h4>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">
                      Lv.{pet.evolution_level} • {currentStage?.form_name}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full hover:bg-sakura/10"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <div className="space-y-3">
                {/* Stats */}
                {/* RPG Stats (HP & Stamina) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-bold text-red-500 uppercase">
                      <span className="flex items-center gap-1"><Heart className="h-2.5 w-2.5" /> HP</span>
                      <span>{pet.hp}/{pet.max_hp}</span>
                    </div>
                    <Progress value={(pet.hp / pet.max_hp) * 100} className="h-1.5 bg-red-50" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-bold text-blue-500 uppercase">
                      <span className="flex items-center gap-1"><Zap className="h-2.5 w-2.5" /> Thể lực</span>
                      <span>{pet.stamina}/{pet.max_stamina}</span>
                    </div>
                    <Progress value={(pet.stamina / pet.max_stamina) * 100} className="h-1.5 bg-blue-50" />
                  </div>
                </div>

                {/* Legacy Stats (Happiness & Hunger) */}
                <div className="grid grid-cols-2 gap-2 opacity-80">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[8px] font-bold text-muted-foreground uppercase">
                      <span>No</span>
                      <span>{pet.hunger}%</span>
                    </div>
                    <Progress value={pet.hunger} className="h-1 bg-orange-100" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[8px] font-bold text-muted-foreground uppercase">
                      <span>Vui</span>
                      <span>{pet.happiness}%</span>
                    </div>
                    <Progress value={pet.happiness} className="h-1 bg-pink-100" />
                  </div>
                </div>

                {/* XP Progress bar */}
                <div className="space-y-1 bg-sakura/5 p-2 rounded-xl border border-sakura/10">
                  <div className="flex justify-between items-center text-[9px] font-bold text-sakura uppercase">
                    <span className="flex items-center gap-1">Kinh nghiệm</span>
                    <span>{getXpProgress().percentage.toFixed(0)}%</span>
                  </div>
                  <Progress value={getXpProgress().percentage} className="h-1.5 bg-sakura/10" />
                  <p className="text-[8px] text-center text-muted-foreground font-medium mt-1">
                    {Math.floor(getXpProgress().current)} / {Math.floor(getXpProgress().required)} XP để lên cấp
                  </p>
                </div>

                {/* Action buttons grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  <ActionButton
                    icon={actionLoading === 'feed' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Utensils className="h-3 w-3" />}
                    label="Cho ăn"
                    sub="-50 XP"
                    onClick={() => handleAction('feed', feedPet, 'feed')}
                    loading={actionLoading === 'feed'}
                    color="orange"
                  />
                  <ActionButton
                    icon={actionLoading === 'pet' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Hand className="h-3 w-3" />}
                    label="Vuốt ve"
                    sub="Miễn phí"
                    onClick={() => handleAction('pet', petInteract, 'pet')}
                    loading={actionLoading === 'pet'}
                    color="pink"
                  />
                  <ActionButton
                    icon={actionLoading === 'play' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gamepad2 className="h-3 w-3" />}
                    label="Chơi"
                    sub="-30 XP"
                    onClick={() => handleAction('play', playWithPet, 'happy')}
                    loading={actionLoading === 'play'}
                    color="green"
                  />
                  <ActionButton
                    icon={actionLoading === 'bathe' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bath className="h-3 w-3" />}
                    label="Tắm"
                    sub="-40 XP"
                    onClick={() => handleAction('bathe', bathePet, 'happy')}
                    loading={actionLoading === 'bathe'}
                    color="sky"
                  />
                  <ActionButton
                    icon={actionLoading === 'walk' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Footprints className="h-3 w-3" />}
                    label="Dạo"
                    sub="-20 XP"
                    onClick={() => handleAction('walk', walkPet, 'happy')}
                    loading={actionLoading === 'walk'}
                    color="amber"
                  />
                  <ActionButton
                    icon={actionLoading === 'sleep' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Moon className="h-3 w-3" />}
                    label="Ngủ"
                    sub="Miễn phí"
                    onClick={() => handleAction('sleep', petSleep, 'idle')}
                    loading={actionLoading === 'sleep'}
                    color="indigo"
                  />
                </div>

                {/* Shop + Detail */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-[10px] font-bold rounded-xl border-sakura/30 hover:bg-sakura/5 text-sakura"
                    onClick={() => { setIsOpen(false); navigate('/pet?shop=open'); }}
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" /> Cửa hàng
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 h-8 text-[10px] font-bold text-muted-foreground hover:text-sakura group"
                    onClick={() => { setIsOpen(false); navigate('/pet'); }}
                  >
                    Chi tiết <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative pointer-events-auto">
        <AnimatePresence>
          {showSpeech && speech && !isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
              className="absolute bottom-full right-0 mb-4 bg-white border-2 border-sakura/20 shadow-soft px-3 py-2 rounded-2xl rounded-br-sm max-w-[180px] z-50"
            >
              <p className="text-[10px] leading-snug font-medium text-foreground/80">
                <MessageCircle className="h-3 w-3 inline mr-1 text-sakura -mt-0.5" />
                {speech}
              </p>
              <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-white border-r-2 border-b-2 border-sakura/20 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => pet ? setIsOpen(!isOpen) : navigate('/pet')}
          className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center shadow-elevated border-4 border-white transition-all relative overflow-hidden",
            config?.gradient ? `bg-gradient-to-br ${config.gradient}` : "bg-gradient-to-br from-sakura to-primary"
          )}
        >
          <AdvancedPetRenderer 
            baseImage={currentStage?.image_url}
            emoji={config && pet ? (config.moodEmojis[getPetMood(pet.happiness, pet.hunger, pet.energy)] || currentStage?.emoji || '🥚') : (currentStage?.emoji || '🥚')}
            state={pet?.status_effect as any}
            size={40}
          />

          {/* Status indicators */}
          {pet && (pet.hunger < 30 || pet.energy < 30) && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">!</span>
              </span>
            </span>
          )}
        </motion.button>
      </div>
    </div>
  );
};

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
  loading: boolean;
  color: string;
}

const ActionButton = ({ icon, label, sub, onClick, loading, color }: ActionButtonProps) => {
  const colorMap: Record<string, { border: string; hover: string; text: string }> = {
    orange: { border: 'border-orange-200', hover: 'hover:bg-orange-50', text: 'text-orange-600' },
    pink: { border: 'border-pink-200', hover: 'hover:bg-pink-50', text: 'text-pink-600' },
    green: { border: 'border-green-200', hover: 'hover:bg-green-50', text: 'text-green-600' },
    sky: { border: 'border-sky-200', hover: 'hover:bg-sky-50', text: 'text-sky-600' },
    amber: { border: 'border-amber-200', hover: 'hover:bg-amber-50', text: 'text-amber-600' },
    indigo: { border: 'border-indigo-200', hover: 'hover:bg-indigo-50', text: 'text-indigo-600' },
  };
  const c = colorMap[color] || colorMap.orange;

  return (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        'h-7 text-[9px] font-bold rounded-lg px-1.5 border flex items-center justify-center gap-1',
        c.border, c.hover, c.text,
      )}
      onClick={onClick}
      disabled={loading}
    >
      {icon}
      <span>{label}</span>
      <span className="opacity-70">({sub})</span>
    </Button>
  );
};
