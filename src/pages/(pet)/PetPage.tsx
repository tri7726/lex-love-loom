import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Heart,
  Sparkles,
  ArrowLeft,
  Loader2,
  Hand,
  Edit3,
  Zap,
  Trophy,
  Star,
  MessageCircle,
  Check,
  Info,
  ChevronRight,
  Utensils,
  ShoppingCart,
  Gamepad2,
  Bath,
  Footprints,
  Moon,
  BatteryFull,
  Apple,
  ChefHat,
  Shirt,
  Shield,
  Compass,
  Dna,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePet } from '@/hooks/usePet';
import { usePetShop } from '@/hooks/usePetShop';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useAchievements } from '@/hooks/useAchievements';
import { SectionErrorBoundary } from '@/components/error/SectionErrorBoundary';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SakuraBurst } from '@/components/effects/SakuraBurst';
import { PET_TYPE_LIST, PET_ID_TO_CONFIG, FOOD_MAP, getRandomMessage, getPetMood } from '@/data/pet-config';
import { PET_RECIPES } from '@/data/pet-recipes';
import { PetEgg } from '@/components/pet/PetEgg';
import { PetChatPanel } from '@/components/pet/PetChatPanel';
import { FoodShop } from '@/components/pet/FoodShop';
import { PetCrafting } from '@/components/pet/PetCrafting';
import { PetTicklingGame } from '@/components/pet/PetTicklingGame';
import AdvancedPetRenderer, { PetState as VisualState } from '@/components/pet/AdvancedPetRenderer';
import { PetWardrobe } from '@/components/pet/PetWardrobe';
import { PetEnvironment, BiomeType } from '@/components/pet/PetEnvironment';
import { PetAdventureHub } from '@/components/pet/PetAdventureHub';
import { usePetAdventure } from '@/hooks/usePetAdventure';
import { usePetCodex } from '@/hooks/usePetCodex';
import { PetCodex } from '@/components/pet/PetCodex';
import type { ChatMessage, Suggestion } from '@/components/pet/PetChatPanel';

const PET_EGG_MESSAGE = '🥚 Ấp trứng... hãy nhấn vào để xem có gì bên trong!';

const SUGGESTIONS: Suggestion[] = [
  { id: 'greeting', label: 'Chào', icon: '👋' },
  { id: 'study', label: 'Học tập', icon: '📚' },
  { id: 'mood', label: 'Hỏi thăm', icon: '💖' },
  { id: 'story', label: 'Kể chuyện', icon: '📖' },
  { id: 'bye', label: 'Tạm biệt', icon: '👋' },
];

const PetPage = () => {
  const {
    pet,
    loading,
    error,
    evolutionStages,
    createPet,
    feedPet,
    petInteract,
    renamePet,
    playWithPet,
    bathePet,
    walkPet,
    petSleep,
    tickleGame,
    equipItem,
    getCurrentEvolutionStage,
    getNextEvolutionStage,
    getXpProgress,
    spendAttributePoint,
    refetch,
  } = usePet();
  const { profile } = useProfile();
  const { user } = useAuth();
  const {
    inventory,
    buyFoodItem,
    useFoodItem,
    craftItem,
    getQuantity,
    fetchInventory: refreshInventory,
  } = usePetShop();
  const { refetch: refetchAchievements, checkUnlockedAchievements } = useAchievements();

  // ── Existing state ──
  const [feeding, setFeeding] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [showBurst, setShowBurst] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showCraft, setShowCraft] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [materials, setMaterials] = useState<Record<string, number>>({});

  // Fetch materials
  useEffect(() => {
    if (!user) return;
    const fetchMaterials = async () => {
      const { data } = await supabase.from('user_pet_materials').select('*');
      if (data) {
        const matMap: any = {};
        (data as any[]).forEach(m => matMap[m.material_id] = m.quantity);
        setMaterials(matMap);
      }
    };
    fetchMaterials();
  }, [user]);
  const [visualState, setVisualState] = useState<VisualState>('idle');
  const [searchParams] = useSearchParams();

  // Auto-open shop if navigated from FloatingPet
  useEffect(() => {
    if (searchParams.get('shop') === 'open') {
      setShowShop(true);
    }
  }, [searchParams]);

  // Action loading states
  const [playing, setPlaying] = useState(false);
  const [bathing, setBathing] = useState(false);
  const [walking, setWalking] = useState(false);
  const [sleeping, setSleeping] = useState(false);

  // Auto-sync visual state with pet status
  useEffect(() => {
    if (sleeping) setVisualState('sleeping');
    else if (pet?.status_effect === 'hurt') setVisualState('hurt');
    else if (pet?.stamina && pet.stamina < 10) setVisualState('exhausted');
    else setVisualState('idle');
  }, [sleeping, pet?.status_effect, pet?.stamina]);

  const triggerAnimation = (state: VisualState, duration = 1000) => {
    setVisualState(state);
    setTimeout(() => {
      setVisualState(sleeping ? 'sleeping' : 'idle');
    }, duration);
  };

  // ── New chat state ──
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showEvolution, setShowEvolution] = useState(false);
  const [showAdventure, setShowAdventure] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const { activeExpedition } = usePetAdventure();
  const { archivePetToHistory } = usePetCodex(pet?.pet_type);

  // Helper to map pet type to biome
  const getBiome = (type: string): BiomeType => {
    switch (type) {
      case 'kitune': return 'sakura';
      case 'ryu': return 'volcano';
      case 'kappa': return 'ocean';
      case 'karasu': return 'space';
      case 'maneki_neko': return 'forest';
      case 'usagi': return 'forest';
      default: return 'forest';
    }
  };

  const isNight = new Date().getHours() >= 18 || new Date().getHours() <= 6;

  // ── Egg/Hatch state ──
  const [hatchStep, setHatchStep] = useState<'egg' | 'hatching' | 'name'>('egg');
  const [randomPetType, setRandomPetType] = useState('');
  const [petName, setPetName] = useState('');
  const [creatingPet, setCreatingPet] = useState(false);

  const lastActivityRef = useRef(Date.now());
  const welcomeShownRef = useRef(false);
  let msgCounter = useRef(0);
  const nextId = () => `msg_${++msgCounter.current}`;

  const config = pet ? PET_ID_TO_CONFIG[pet.pet_type] : null;
  const hatchConfig = hatchStep !== 'egg' && randomPetType ? PET_ID_TO_CONFIG[randomPetType] : null;

  const flashMessage = (msg: string) => {
    setLastMessage(msg);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };

  // ── Chat helpers ──

  const addMessage = useCallback((sender: ChatMessage['sender'], text: string, type?: ChatMessage['type']) => {
    lastActivityRef.current = Date.now();
    setChatMessages((prev) => [...prev, { id: nextId(), sender, text, type }]);
  }, []);

  const addPetMessage = useCallback(
    (text: string, type?: ChatMessage['type']) => addMessage('pet', text, type),
    [addMessage],
  );

  const addUserMessage = useCallback((text: string) => addMessage('user', text), [addMessage]);

  const addSystemMessage = useCallback((text: string) => addMessage('pet', text, 'system'), [addMessage]);

  // ── Suggestion / text chat ──

  const suggestionResponses: Record<string, keyof (typeof config)['messages']['conversation']> = {
    greeting: 'greeting',
    study: 'study',
    mood: 'mood',
    story: 'story',
    bye: 'bye',
  };

  const handleSuggestion = useCallback(
    (id: string) => {
      if (!config) return;
      const userLabels: Record<string, string> = {
        greeting: 'Chào cậu!',
        study: 'Cậu đang học gì thế?',
        mood: 'Cậu khỏe không?',
        story: 'Kể chuyện gì đi!',
        bye: 'Tạm biệt nhé!',
      };
      addUserMessage(userLabels[id] || id);
      const cat = suggestionResponses[id];
      const responses = cat ? config.messages.conversation[cat] : config.messages.conversation.free;
      const petText = responses?.[Math.floor(Math.random() * (responses?.length || 1))] || 'Hihi ^^';
      setTimeout(() => addPetMessage(petText), 600);
    },
    [config, addUserMessage, addPetMessage],
  );

  const handleUserText = useCallback(
    (text: string) => {
      if (!config) return;
      addUserMessage(text);
      const responses = config.messages.conversation.free;
      const petText = responses[Math.floor(Math.random() * responses.length)];
      setTimeout(() => addPetMessage(petText), 600);
    },
    [config, addUserMessage, addPetMessage],
  );

  // ── Idle pet messages ──

  useEffect(() => {
    if (!config || !pet) return;
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > 15000) {
        addPetMessage(getRandomMessage(config.messages.idle));
      }
    }, 35000);
    return () => clearInterval(interval);
  }, [config, pet, addPetMessage]);

  // ── Welcome messages ──

  useEffect(() => {
    if (pet && config && !welcomeShownRef.current) {
      welcomeShownRef.current = true;
      const t1 = setTimeout(() => addPetMessage(getRandomMessage(config.messages.happy)), 600);
      const t2 = setTimeout(() => addPetMessage(`Chào cậu! Mình cùng học tiếng Nhật nhé!`), 1400);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [pet, config, addPetMessage]);

  // ── Evolution ceremony ──

  const prevEvoRef = useRef(pet?.evolution_level);
  useEffect(() => {
    if (!pet || !config) return;
    if (prevEvoRef.current !== null && pet.evolution_level > prevEvoRef.current) {
      setShowEvolution(true);
      setShowBurst(true);
      addPetMessage(getRandomMessage(config.messages.evolution), 'evolution');
    }
    prevEvoRef.current = pet.evolution_level;
  }, [pet?.evolution_level, config, addPetMessage]);

  // ── Egg/Hatch flow ──

  const handleEggHatch = useCallback(() => {
    const chosen = PET_TYPE_LIST[Math.floor(Math.random() * PET_TYPE_LIST.length)].id;
    setRandomPetType(chosen);
    setHatchStep('hatching');
    setTimeout(() => setHatchStep('name'), 2000);
  }, []);

  const confirmCreatePet = useCallback(async () => {
    setCreatingPet(true);
    // Archive current pet to history before replacing
    if (pet) {
      await archivePetToHistory(pet);
    }
    const ok = await createPet(randomPetType);
    if (ok) {
      if (petName.trim()) {
        await renamePet(petName.trim());
      }
      setShowBurst(true);
      setHatchStep('egg');
    }
    setCreatingPet(false);
  }, [randomPetType, petName, createPet, renamePet, pet, archivePetToHistory]);

  // ── Action handlers ──

  const handleFeed = useCallback(async () => {
    if (!config) return;
    setFeeding(true);
    const ok = await feedPet();
    setFeeding(false);
    if (ok) {
      addSystemMessage(`🍖 Đã cho ${config.name} ăn! +15 Hạnh phúc, +20 Pet XP`);
      setTimeout(() => addPetMessage(getRandomMessage(config.messages.feed), 'action'), 400);
      refetchAchievements();
      checkUnlockedAchievements();
    }
  }, [config, feedPet, addSystemMessage, addPetMessage, refetchAchievements, checkUnlockedAchievements]);

  const handlePet = useCallback(async () => {
    if (!config) return;
    setInteracting(true);
    const ok = await petInteract();
    setInteracting(false);
    if (ok) {
      addSystemMessage(`👋 Đã vuốt ve ${config.name}! +5 Hạnh phúc`);
      setTimeout(() => addPetMessage(getRandomMessage(config.messages.pet), 'action'), 400);
      refetchAchievements();
      checkUnlockedAchievements();
    }
  }, [config, petInteract, addSystemMessage, addPetMessage, refetchAchievements, checkUnlockedAchievements]);

  const handlePlay = useCallback(async () => {
    if (!config) return;
    setPlaying(true);
    const ok = await playWithPet();
    setPlaying(false);
    if (ok) {
      addSystemMessage(`🎮 Chơi cùng ${config.name}! Cậu ấy rất vui!`);
      setTimeout(() => addPetMessage('Chơi vui quá! Chơi tiếp đi!', 'action'), 400);
      refetchAchievements();
      checkUnlockedAchievements();
    }
  }, [config, playWithPet, addSystemMessage, addPetMessage, refetchAchievements, checkUnlockedAchievements]);

  const handleBathe = useCallback(async () => {
    if (!config) return;
    setBathing(true);
    const ok = await bathePet();
    setBathing(false);
    if (ok) {
      addSystemMessage(`🛁 Đã tắm cho ${config.name}! Sạch sẽ và mát mẻ!`);
      setTimeout(() => addPetMessage('Ồ, tắm xong sảng khoái quá!', 'action'), 400);
      refetchAchievements();
      checkUnlockedAchievements();
    }
  }, [config, bathePet, addSystemMessage, addPetMessage, refetchAchievements, checkUnlockedAchievements]);

  const handleWalk = useCallback(async () => {
    if (!config) return;
    setWalking(true);
    const ok = await walkPet();
    setWalking(false);
    if (ok) {
      addSystemMessage(`🚶 Đã dẫn ${config.name} đi dạo! Cậu ấy khám phá được nhiều thứ!`);
      setTimeout(() => addPetMessage('Đi dạo vui quá! Có nhiều điều thú vị!', 'action'), 400);
      refetchAchievements();
      checkUnlockedAchievements();
    }
  }, [config, walkPet, addSystemMessage, addPetMessage, refetchAchievements, checkUnlockedAchievements]);

  const handleSleep = useCallback(async () => {
    if (!config) return;
    setSleeping(true);
    const ok = await petSleep();
    setSleeping(false);
    if (ok) {
      addSystemMessage(`😴 ${config.name} đang ngủ... +30 Năng lượng, -3 Hạnh phúc`);
      setTimeout(() => addPetMessage('Zzz... ngủ ngon quá...', 'action'), 400);
      refetchAchievements();
      checkUnlockedAchievements();
    }
  }, [config, petSleep, addSystemMessage, addPetMessage, refetchAchievements, checkUnlockedAchievements]);

  // ── Computed values ──

  const currentStage = pet ? getCurrentEvolutionStage() : null;
  const nextStage = pet ? getNextEvolutionStage() : null;
  const xpProgress = pet ? getXpProgress() : { current: 0, required: 0, percentage: 0 };

  // ── Loading ──

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sakura" />
          <p className="text-sm text-muted-foreground animate-pulse">{PET_EGG_MESSAGE}</p>
        </div>
      </div>
    );
  }

  // ── Error ──

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-sm rounded-2xl">
          <CardContent className="p-8 text-center space-y-4">
            <span className="text-4xl">😵</span>
            <p className="text-sm text-muted-foreground">Không thể tải thú cưng</p>
            <Button onClick={refetch} className="rounded-xl" variant="outline">
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── No pet — egg / hatch flow ──

  if (!pet) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <SakuraBurst active={showBurst} onComplete={() => setShowBurst(false)} petalCount={25} />
        <div className="container max-w-lg px-4">
          <PetEgg onHatch={handleEggHatch} hatching={hatchStep === 'hatching'} currentEmoji={hatchConfig?.emoji} />

          {/* Name dialog after hatching */}
          <Dialog open={hatchStep === 'name'} onOpenChange={(open) => !open && setHatchStep('egg')}>
            <DialogContent className="rounded-2xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-center">🥳 Chào mừng bé mới nở!</DialogTitle>
                <DialogDescription className="text-center">
                  Một bé {hatchConfig?.name || 'thú cưng'} vừa chào đời! Hãy đặt cho bạn ấy một cái tên thật đẹp nhé!
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <motion.span
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 10 }}
                  className="text-6xl"
                >
                  {hatchConfig?.emoji || '🐣'}
                </motion.span>
                <p className="text-lg font-bold text-center">
                  {hatchConfig?.name || 'Bé bí ẩn'}
                </p>
                <Input
                  placeholder={`Đặt tên cho ${hatchConfig?.name || 'bé'}...`}
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  className="text-center rounded-xl"
                  maxLength={30}
                  autoFocus
                />
                <Button
                  onClick={confirmCreatePet}
                  disabled={creatingPet}
                  className={cn(
                    'w-full rounded-xl gap-2',
                    hatchConfig?.gradient ? `bg-gradient-to-r ${hatchConfig.gradient} text-white` : '',
                  )}
                >
                  {creatingPet ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Xác nhận
                </Button>
              </div>
              <div className="flex justify-center gap-1.5 flex-wrap">
                {hatchConfig?.personality.map((trait) => (
                  <Badge
                    key={trait}
                    className={cn(
                      'text-[10px] font-bold rounded-full border-0',
                      hatchConfig?.bgColor,
                      hatchConfig?.color,
                    )}
                  >
                    {trait}
                  </Badge>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  MAIN LAYOUT — Pet Chat Hub
  // ═══════════════════════════════════════════════════

  const xp = profile?.total_xp || 0;
  const canFeed = xp >= 50;
  const canPlay = xp >= 30;
  const canBathe = xp >= 40;
  const canWalk = xp >= 20;
  const filteredStages = pet ? (evolutionStages.filter((s) => s.pet_type === pet.pet_type).length > 0
    ? evolutionStages.filter((s) => s.pet_type === pet.pet_type)
    : evolutionStages) : [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <SakuraBurst active={showBurst} onComplete={() => setShowBurst(false)} petalCount={25} />

      <main className="w-full max-w-[1600px] mx-auto py-4 px-4 lg:px-8 h-[calc(100vh-4rem)] flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-[11px] font-bold">
              <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
            </Button>
          </Link>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-[11px] font-black border-2 border-primary/20 hover:border-primary/50 bg-white shadow-sm"
              onClick={() => setShowCodex(true)}
            >
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              Codex
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-[11px] font-black border-2 border-primary/20 hover:border-primary/50 bg-white shadow-sm"
              onClick={() => setShowAdventure(true)}
            >
              <Compass className={cn("h-3.5 w-3.5", activeExpedition ? "text-primary animate-pulse" : "text-muted-foreground")} /> 
              {activeExpedition ? 'Đang thám hiểm...' : 'Viễn chinh'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEvolution(true)}
              className="text-xs font-bold gap-1 h-8 rounded-lg"
            >
              <Star className="h-3.5 w-3.5 text-gold" /> Tiến hóa
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(true)}
              className="text-xs font-bold gap-1 h-8 rounded-lg"
            >
              <Info className="h-3.5 w-3.5 text-sakura" /> Thông tin
            </Button>
            <Badge
              className={cn(
                'font-black text-[10px] rounded-full px-3 h-6 border-0 text-white',
                `bg-gradient-to-r ${config?.gradient || 'from-sakura to-primary'}`,
              )}
            >
              {config?.emoji || '🦊'} {pet.pet_name || 'Thú cưng'}
            </Badge>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          {/* ============================================= */}
          {/* CHAT PANEL — left on desktop, bottom on mobile */}
          {/* ============================================= */}
          <div className="flex-1 order-2 lg:order-1 flex flex-col min-h-0">
            <div className="flex-1 border rounded-2xl bg-card overflow-hidden flex flex-col">
              <PetChatPanel
                messages={chatMessages}
                petEmoji={config?.emoji || '🦊'}
                petName={pet.pet_name || 'Thú cưng'}
                suggestions={SUGGESTIONS}
                onSuggestion={handleSuggestion}
                onSendText={handleUserText}
              />
            </div>
          </div>

          {/* ============================================= */}
          {/* PET PANEL — right on desktop, top on mobile   */}
          {/* ============================================= */}
          <div className="lg:w-72 xl:w-80 order-1 lg:order-2 shrink-0">
            <div className="border rounded-2xl bg-card flex flex-col h-full max-h-[calc(100vh-10rem)]">
              {/* Pet Display with Environment */}
              <div className="h-[300px] shrink-0 relative overflow-hidden rounded-t-2xl">
                {/* Adventure Hub Overlay */}
                <AnimatePresence>
                  {showCodex && (
                    <motion.div
                      initial={{ opacity: 0, x: 300 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 300 }}
                      className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-[100] border-l flex flex-col"
                    >
                      <SectionErrorBoundary name="PetCodex">
                        <PetCodex currentPetType={pet?.pet_type} onClose={() => setShowCodex(false)} />
                      </SectionErrorBoundary>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showAdventure && (
                    <motion.div
                      initial={{ opacity: 0, x: 300 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 300 }}
                      className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-[100] border-l"
                    >
                      <SectionErrorBoundary name="PetAdventureHub">
                        <PetAdventureHub pet={pet} onClose={() => setShowAdventure(false)} />
                      </SectionErrorBoundary>
                    </motion.div>
                  )}
                </AnimatePresence>
                <SectionErrorBoundary name="PetEnvironment">
                <PetEnvironment
                  biome={getBiome(pet.pet_type)} 
                  timeOfDay={isNight ? 'night' : 'day'}
                >
                  <div className="w-full h-full flex flex-col items-center justify-center pt-8">
                    {/* Level badge */}
                    <Badge className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm text-amber-600 font-black text-xs rounded-full border border-amber-100 shadow-sm z-10 px-3 py-1">
                      Lv.{pet.evolution_level}
                    </Badge>

                    <div className="relative z-20 transform -translate-y-2">
                      {activeExpedition && !visualState.startsWith('attack') ? (
                        <div className="relative">
                          <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                          <motion.div 
                            animate={{ 
                              scale: [1, 1.1, 1],
                              opacity: [0.5, 0.8, 0.5]
                            }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="text-8xl grayscale opacity-40 drop-shadow-lg"
                          >
                            <Compass className="h-24 w-24 text-white" />
                          </motion.div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-4xl">🏃</span>
                          </div>
                        </div>
                      ) : (
                        <AdvancedPetRenderer 
                          baseImage={currentStage?.image_url}
                          emoji={config?.moodEmojis?.[getPetMood(pet.happiness, pet.hunger, pet.energy)] || currentStage?.emoji}
                          state={visualState}
                          equippedItems={pet.equipped_items}
                          size={180}
                          className="drop-shadow-2xl"
                          onClick={() => triggerAnimation('happy')}
                        />
                      )}
                    </div>

                    {/* Name & form at bottom of environment */}
                    <div className="absolute bottom-4 left-0 right-0 text-center px-4 bg-gradient-to-t from-black/20 to-transparent pt-4">
                      <p className="text-xl font-black font-display tracking-tight text-white drop-shadow-md">{pet.pet_name || 'Thú cưng'}</p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                        {currentStage?.form_name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </PetEnvironment>
                </SectionErrorBoundary>
              </div>

              {/* Scrollable stats + actions */}
              <div className="overflow-y-auto flex-1">
                {/* Stats row */}
                {/* RPG Stats (HP & Stamina) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500 shrink-0" />
                    <div className="flex-1 h-3 bg-red-100/50 rounded-full overflow-hidden border border-red-200/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(pet.hp / pet.max_hp) * 100}%` }}
                        className="h-full bg-gradient-to-r from-red-500 to-rose-600 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                      />
                    </div>
                    <span className="text-xs font-black text-red-600 w-12 text-right">{pet.hp}/{pet.max_hp}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500 shrink-0" />
                    <div className="flex-1 h-3 bg-blue-100/50 rounded-full overflow-hidden border border-blue-200/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(pet.stamina / pet.max_stamina) * 100}%` }}
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                      />
                    </div>
                    <span className="text-xs font-black text-blue-600 w-12 text-right">{pet.stamina}/{pet.max_stamina}</span>
                  </div>
                </div>

                {/* Secondary Stats row */}
                <div className="px-1 py-1 grid grid-cols-2 gap-4 opacity-70">
                  {/* Hunger bar */}
                  <div className="flex items-center gap-1.5">
                    <Apple className="h-3 w-3 text-orange-400 shrink-0" />
                    <Progress value={pet.hunger} className="h-1 flex-1" />
                    <span className="text-[8px] w-4">{pet.hunger}%</span>
                  </div>

                  {/* Happiness row */}
                  <div className="flex items-center gap-1.5">
                    <Heart className="h-3 w-3 text-pink-400 shrink-0" />
                    <Progress value={pet.happiness} className="h-1 flex-1" />
                    <span className="text-[8px] w-4">{pet.happiness}%</span>
                  </div>
                </div>

                {/* XP Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-500" /> XP
                    </span>
                    <span className="text-muted-foreground">{pet.pet_xp} XP</span>
                  </div>
                    <>
                      <Progress value={xpProgress.percentage} className="h-2" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>
                          {Math.floor(xpProgress.current)}/{Math.floor(xpProgress.required)}
                        </span>
                        <span>
                          {nextStage ? `${nextStage.emoji} ${nextStage.form_name}` : 'Tiến hóa tiếp...'}
                        </span>
                      </div>
                    </>
                </div>

                {/* Speech bubble */}
                {showMessage && lastMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-center"
                  >
                    <div className="max-w-full px-3 py-2 rounded-2xl rounded-tl-sm bg-white border shadow-sm flex items-start gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5 text-sakura shrink-0 mt-0.5" />
                      <p className="text-[11px] text-foreground/80">{lastMessage}</p>
                    </div>
                  </motion.div>
                )}

              {/* Quick action buttons */}
              <div className="px-4 pb-2 grid grid-cols-2 gap-2">
                <Button
                  onClick={handleFeed}
                  disabled={feeding || !canFeed}
                  className={cn(
                    'h-auto py-2 rounded-xl flex-col gap-0.5 font-bold shadow-sm text-[11px]',
                    canFeed
                      ? 'bg-gradient-to-br from-orange-400 to-rose-500 hover:from-orange-500 hover:to-rose-600 text-white'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {feeding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Utensils className="h-3.5 w-3.5" />
                  )}
                  <span>Cho ăn</span>
                  <span className="text-[8px] opacity-80">-50 XP</span>
                </Button>

                <Button
                  onClick={handlePet}
                  disabled={interacting}
                  className="h-auto py-2 rounded-xl flex-col gap-0.5 font-bold shadow-sm bg-gradient-to-br from-pink-400 to-sakura hover:from-pink-500 hover:to-sakura/90 text-white text-[11px]"
                >
                  {interacting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Hand className="h-3.5 w-3.5" />
                  )}
                  <span>Vuốt ve</span>
                  <span className="text-[8px] opacity-80">Miễn phí</span>
                </Button>

                <Button
                  onClick={handlePlay}
                  disabled={playing || !canPlay}
                  className={cn(
                    'h-auto py-2 rounded-xl flex-col gap-0.5 font-bold shadow-sm text-[11px]',
                    canPlay
                      ? 'bg-gradient-to-br from-green-400 to-emerald-600 hover:from-green-500 hover:to-emerald-700 text-white'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {playing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gamepad2 className="h-3.5 w-3.5" />}
                  <span>Chơi</span>
                  <span className="text-[8px] opacity-80">-30 XP</span>
                </Button>

                <Button
                  onClick={handleBathe}
                  disabled={bathing || !canBathe}
                  className={cn(
                    'h-auto py-2 rounded-xl flex-col gap-0.5 font-bold shadow-sm text-[11px]',
                    canBathe
                      ? 'bg-gradient-to-br from-sky-400 to-blue-600 hover:from-sky-500 hover:to-blue-700 text-white'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {bathing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bath className="h-3.5 w-3.5" />}
                  <span>Tắm</span>
                  <span className="text-[8px] opacity-80">-40 XP</span>
                </Button>

                <Button
                  onClick={handleWalk}
                  disabled={walking || !canWalk}
                  className={cn(
                    'h-auto py-2 rounded-xl flex-col gap-0.5 font-bold shadow-sm text-[11px]',
                    canWalk
                      ? 'bg-gradient-to-br from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-white'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {walking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Footprints className="h-3.5 w-3.5" />}
                  <span>Dạo</span>
                  <span className="text-[8px] opacity-80">-20 XP</span>
                </Button>

                <Button
                  onClick={handleSleep}
                  disabled={sleeping}
                  className="h-auto py-2 rounded-xl flex-col gap-0.5 font-bold shadow-sm bg-gradient-to-br from-indigo-400 to-purple-600 hover:from-indigo-500 hover:to-purple-700 text-white text-[11px]"
                >
                  {sleeping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Moon className="h-3.5 w-3.5" />}
                  <span>Ngủ</span>
                  <span className="text-[8px] opacity-80">Miễn phí</span>
                </Button>
              </div>

              {/* Shop + Craft + Game buttons */}
              <div className="px-4 pb-2 flex gap-2">
                <Button
                  onClick={() => setShowShop(true)}
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-bold gap-1.5 h-9"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Cửa hàng
                </Button>
                <Button
                  onClick={() => setShowCraft(true)}
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-bold gap-1.5 h-9"
                >
                  <ChefHat className="h-4 w-4 text-amber-500" />
                  Nấu ăn
                </Button>
                <Button
                  onClick={() => setShowGame(true)}
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-bold gap-1.5 h-9"
                >
                  <Gamepad2 className="h-4 w-4 text-green-500" />
                  Game
                </Button>
                <Button
                  onClick={() => setShowStats(true)}
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-bold gap-1.5 h-9"
                >
                  <Dna className="h-4 w-4 text-indigo-500" />
                  Chỉ số
                </Button>
                <Button
                  onClick={() => setShowWardrobe(true)}
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-bold gap-1.5 h-9"
                >
                  <Shirt className="h-4 w-4 text-purple-500" />
                  Tủ đồ
                </Button>
              </div>

              {/* Skill / Combat Demo row */}
              <div className="px-4 pb-2 flex gap-2">
                <Button
                  onClick={() => triggerAnimation('attack')}
                  variant="ghost"
                  className="flex-1 rounded-xl text-[10px] font-bold h-8 border border-red-100 hover:bg-red-50 text-red-600"
                >
                  <Zap className="h-3 w-3 mr-1" /> Tấn công
                </Button>
                <Button
                  onClick={() => triggerAnimation('defend')}
                  variant="ghost"
                  className="flex-1 rounded-xl text-[10px] font-bold h-8 border border-blue-100 hover:bg-blue-50 text-blue-600"
                >
                  <Shield className="h-3 w-3 mr-1" /> Phòng thủ
                </Button>
              </div>

              {/* Personality tags */}
              {config && (
                <div className="px-4 pb-4 flex justify-center gap-1.5 flex-wrap">
                  {config.personality.map((trait) => (
                    <Badge
                      key={trait}
                      className={cn(
                        'text-[9px] font-bold rounded-full border-0 px-2 py-0',
                        config.bgColor,
                        config.color,
                      )}
                    >
                      {trait}
                    </Badge>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ════════════════════════════════════ */}
      {/* RENAME DIALOG                       */}
      {/* ════════════════════════════════════ */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Đổi tên thú cưng</DialogTitle>
            <DialogDescription>Đặt một cái tên mới cho bạn đồng hành của bạn</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentStage?.emoji || '🥚'}</span>
              <Input
                placeholder="Tên mới..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={30}
                className="rounded-xl"
                autoFocus
              />
            </div>
            <Button
              onClick={async () => {
                if (newName.trim()) {
                  await renamePet(newName.trim());
                  setNewName('');
                  setRenameDialogOpen(false);
                  flashMessage(getRandomMessage(config?.messages.happy || ['Cảm ơn cậu!']));
                }
              }}
              className="w-full rounded-xl"
              disabled={!newName.trim()}
            >
              <Check className="h-4 w-4 mr-1" /> Lưu
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════ */}
      {/* EVOLUTION POPUP                     */}
      {/* ════════════════════════════════════ */}
      <Dialog open={showEvolution} onOpenChange={setShowEvolution}>
        <DialogContent className={cn('rounded-2xl max-w-lg', config?.borderColor || 'border-sakura/10')}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-gold" /> Tiến hóa
            </DialogTitle>
            <DialogDescription>
              Hành trình tiến hóa của {pet.pet_name || config?.name || 'thú cưng'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between gap-2">
              {filteredStages.map((stage, i, arr) => (
                <div key={stage.evolution_level} className="flex items-center gap-2 flex-1">
                  <div
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all flex-1',
                      stage.evolution_level < pet.evolution_level && 'opacity-40',
                      stage.evolution_level === pet.evolution_level &&
                        cn(
                          'ring-2 scale-105 shadow-sm',
                          config?.ringColor || 'ring-sakura/30',
                          config?.bgColor || 'bg-sakura/10',
                        ),
                      stage.evolution_level > pet.evolution_level && 'opacity-30',
                    )}
                  >
                    <motion.span
                      animate={stage.evolution_level === pet.evolution_level ? { y: [0, -3, 0] } : {}}
                      transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                      className="text-3xl"
                    >
                      {stage.emoji}
                    </motion.span>
                    <span className="text-[10px] font-bold text-center leading-tight">{stage.form_name}</span>
                    <span className="text-[8px] text-muted-foreground">{stage.xp_required} XP</span>
                  </div>
                  {i < arr.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════ */}
      {/* STATS POPUP                         */}
      {/* ════════════════════════════════════ */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className={cn('rounded-2xl max-w-md', config?.borderColor || 'border-sakura/10')}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-sakura" /> Thông tin
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Loại</p>
                <p className="font-medium flex items-center gap-1.5">
                  {config?.emoji} {config?.name || pet.pet_type}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Dạng</p>
                <p className="font-medium">{currentStage?.form_name || 'Unknown'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Cấp tiến hóa</p>
                <p className="font-medium">{pet.evolution_level}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Hạnh phúc</p>
                <p className="font-medium">{pet.happiness}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pet XP</p>
                <p className="font-medium">{pet.pet_xp}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Ngày tạo</p>
                <p className="font-medium text-xs">
                  {new Date(pet.created_at).toLocaleDateString('vi-VN')}
                </p>
              </div>
              {pet.last_fed_at && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    Lần cho ăn cuối
                  </p>
                  <p className="font-medium text-xs">
                    {new Date(pet.last_fed_at).toLocaleDateString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
              {pet.last_interaction_at && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    Lần tương tác cuối
                  </p>
                  <p className="font-medium text-xs">
                    {new Date(pet.last_interaction_at).toLocaleDateString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════ */}
      {/* FOOD SHOP                           */}
      {/* ════════════════════════════════════ */}
      <SectionErrorBoundary name="FoodShop">
      <FoodShop
        open={showShop}
        onOpenChange={setShowShop}
        userXp={profile?.total_xp || 0}
        getItemQuantity={getQuantity}
        onBuy={async (itemId) => {
          const ok = await buyFoodItem(itemId);
          if (ok) {
            const food = FOOD_MAP[itemId];
            addSystemMessage(`🛒 Đã mua ${food?.emoji || itemId}!`);
          }
          return ok;
        }}
        onUse={async (itemId) => {
          const ok = await useFoodItem(itemId);
          if (ok) {
            const food = FOOD_MAP[itemId];
            if (config) {
              addSystemMessage(`🍽️ Đã dùng ${food?.emoji || itemId} cho ${config.name}!`);
              setTimeout(
                () => addPetMessage(getRandomMessage(config.messages.feed), 'action'),
                400,
              );
            }
            refetchAchievements();
            checkUnlockedAchievements();
          }
          return ok;
        }}
      />
      </SectionErrorBoundary>

      {/* ════════════════════════════════════ */}
      {/* CRAFTING                            */}
      {/* ════════════════════════════════════ */}
      <SectionErrorBoundary name="PetCrafting">
      <PetCrafting
        open={showCraft}
        onOpenChange={setShowCraft}
        userCoins={(profile as any)?.pet_coins || 0}
        getMaterialQuantity={(id) => materials[id] || 0}
        onCraft={async (recipeId) => {
          const { data, error } = await (supabase as any).rpc('craft_pet_gear', { p_recipe_id: recipeId });
          if (error) {
            toast.error(error.message);
            return false;
          }
          const recipe = PET_RECIPES.find(r => r.id === recipeId);
          addSystemMessage(`⚒️ Đã rèn thành công ${recipe?.name || recipeId}!`);
          
          // Refresh materials
          const { data: mats } = await supabase.from('user_pet_materials').select('*');
          if (mats) {
            const matMap: any = {};
            (mats as any[]).forEach(m => matMap[m.material_id] = m.quantity);
            setMaterials(matMap);
          }
          return true;
        }}
      />
      </SectionErrorBoundary>

      {/* ════════════════════════════════════ */}
      {/* TICKLING GAME                       */}
      {/* ════════════════════════════════════ */}
      <SectionErrorBoundary name="PetTicklingGame">
      <PetTicklingGame
        open={showGame}
        onOpenChange={setShowGame}
        petEmoji={config?.moodEmojis?.[getPetMood(pet.happiness, pet.hunger, pet.energy)] || currentStage?.emoji || '🥚'}
        petName={pet.pet_name || 'thú cưng'}
        onComplete={async (score) => {
          const ok = await tickleGame(score);
          if (ok && config) {
            const happinessGain = Math.min(score, 20);
            addSystemMessage(`🎮 Chơi cù léc ${config.name}! ${score} lần! +${happinessGain} Hạnh phúc`);
            if (score >= 20) {
              setTimeout(() => addPetMessage(getRandomMessage(config.messages.happy), 'action'), 400);
            }
            refetchAchievements();
            checkUnlockedAchievements();
          }
        }}
      />
      </SectionErrorBoundary>

      <SectionErrorBoundary name="PetWardrobe">
      <PetWardrobe
        open={showWardrobe}
        onOpenChange={setShowWardrobe}
        equippedItems={pet.equipped_items}
        onEquip={equipItem}
      />
      </SectionErrorBoundary>

      {/* Stats Dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-white">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <Dna className="h-6 w-6" /> CHỈ SỐ TIỀM NĂNG
            </h2>
            <p className="text-white/70 text-xs mt-1">Nâng cấp sức mạnh cho Pet của bạn</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="font-black text-slate-500 text-sm uppercase tracking-wider">Điểm còn lại</span>
              <span className="text-3xl font-black text-indigo-600">{pet.attribute_points || 0}</span>
            </div>

            <div className="space-y-4">
              {[
                { id: 'str', name: 'Sức mạnh (STR)', val: pet.str, color: 'bg-red-500', desc: 'Tăng sát thương chiến đấu' },
                { id: 'int', name: 'Trí tuệ (INT)', val: pet.int, color: 'bg-blue-500', desc: 'Tăng sức mạnh tuyệt chiêu' },
                { id: 'luk', name: 'May mắn (LUK)', val: pet.luk, color: 'bg-amber-500', desc: 'Tăng tỷ lệ rơi đồ hiếm' },
              ].map((attr) => (
                <div key={attr.id} className="flex items-center gap-4 p-4 border rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg", attr.color)}>
                    {attr.val}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm text-slate-800">{attr.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{attr.desc}</p>
                  </div>
                  <Button 
                    size="sm" 
                    className="rounded-full w-10 h-10 p-0 font-black text-lg shadow-md"
                    disabled={!pet.attribute_points || pet.attribute_points <= 0}
                    onClick={() => spendAttributePoint(attr.id as any)}
                  >
                    +
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PetPage;
