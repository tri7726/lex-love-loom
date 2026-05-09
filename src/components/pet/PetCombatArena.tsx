import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Shield, Zap, Heart, Trophy, XCircle, Brain, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import AdvancedPetRenderer, { PetState } from '@/components/pet/AdvancedPetRenderer';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Monster {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attackPower: number;
}

interface Question {
  text: string;
  options: string[];
  answer: string;
}

const SAMPLE_QUESTIONS: Question[] = [
  { text: 'Chữ "私" đọc là gì?', options: ['Watashi', 'Boku', 'Ore', 'Kimi'], answer: 'Watashi' },
  { text: 'Ý nghĩa của "先生" là gì?', options: ['Học sinh', 'Giáo viên', 'Bác sĩ', 'Kỹ sư'], answer: 'Giáo viên' },
  { text: 'Chữ "猫" nghĩa là gì?', options: ['Chó', 'Mèo', 'Chim', 'Cá'], answer: 'Mèo' },
  { text: 'Đâu là cách chào buổi sáng?', options: ['Konbanwa', 'Konnichiwa', 'Ohayou', 'Oyasumi'], answer: 'Ohayou' },
];

interface PetCombatArenaProps {
  pet: any;
  monster: Monster;
  onWin: (rewards: any) => void;
  onLose: () => void;
  onClose: () => void;
}

export const PetCombatArena: React.FC<PetCombatArenaProps> = ({ 
  pet, 
  monster: initialMonster, 
  onWin, 
  onLose, 
  onClose 
}) => {
  const [petHp, setPetHp] = useState(pet.hp);
  const [monsterHp, setMonsterHp] = useState(initialMonster.hp);
  const [petState, setPetState] = useState<PetState>('idle');
  const [monsterState, setMonsterState] = useState<'idle' | 'hurt' | 'attack'>('idle');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [combatStatus, setCombatStatus] = useState<'intro' | 'fighting' | 'won' | 'lost'>('intro');
  const [turn, setTurn] = useState(0);
  const [rage, setRage] = useState(0);
  const [isUltimateReady, setIsUltimateReady] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  const startCombat = () => {
    setCombatStatus('fighting');
    nextTurn();
  };

  const nextTurn = () => {
    setTurn(t => t + 1);
    const q = SAMPLE_QUESTIONS[Math.floor(Math.random() * SAMPLE_QUESTIONS.length)];
    setCurrentQuestion(q);
  };

  const handleAnswer = (option: string) => {
    if (!currentQuestion) return;

    if (option === currentQuestion.answer) {
      // Pet Attacks
      setPetState('attack');
      setTimeout(() => {
        setMonsterState('hurt');
        const hasPowerBuff = (pet.active_buffs || []).some((b: any) => b.type === 'power');
        let dmg = 25 + Math.floor(pet.evolution_level * 2);
        if (hasPowerBuff) dmg = Math.floor(dmg * 1.5);
        
        setMonsterHp(prev => Math.max(0, prev - dmg));
        setRage(prev => {
          const newRage = Math.min(100, prev + 25);
          if (newRage >= 100) setIsUltimateReady(true);
          return newRage;
        });
        if (monsterHp - dmg <= 0) {
          setCombatStatus('won');
          onWin(initialMonster);
        } else {
          setTimeout(() => {
            setPetState('idle');
            setMonsterState('idle');
            nextTurn();
          }, 1000);
        }
      }, 500);
    } else {
      // Monster Attacks
      setMonsterState('attack');
      toast.error('Sai rồi! Quái vật tấn công!');
      setTimeout(() => {
        setPetState('hurt');
        const dmg = initialMonster.attackPower;
        setPetHp(prev => Math.max(0, prev - dmg));
        if (petHp - dmg <= 0) {
          setCombatStatus('lost');
          onLose();
        } else {
          setTimeout(() => {
            setPetState('idle');
            setMonsterState('idle');
            nextTurn();
          }, 1000);
        }
      }, 500);
    }
  };

  const handleUltimate = () => {
    if (!isUltimateReady || combatStatus !== 'fighting') return;

    setIsUltimateReady(false);
    setRage(0);
    setPetState('attack');
    setIsShaking(true);
    setIsFlashing(true);
    
    // Skill Effects based on pet type
    let ultimateDmg = 100 + (pet.evolution_level * 10);
    const petType = pet.pet_type;

    toast.success(`TUYỆT CHIÊU: ${petType === 'kitune' ? 'CỬU VĨ HỎA' : 'SIÊU CẤP TẤN CÔNG'}!`);

    setTimeout(() => setIsFlashing(false), 200);
    setTimeout(() => setIsShaking(false), 500);

    setTimeout(() => {
      setMonsterState('hurt');
      setMonsterHp(prev => Math.max(0, prev - ultimateDmg));
      
      if (monsterHp - ultimateDmg <= 0) {
        setCombatStatus('won');
        onWin(initialMonster);
      } else {
        setTimeout(() => {
          setPetState('idle');
          setMonsterState('idle');
        }, 1000);
      }
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
      <motion.div 
        animate={isShaking ? {
          x: [0, -10, 10, -10, 10, 0],
          y: [0, 5, -5, 5, -5, 0],
        } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-4xl aspect-video bg-gradient-to-b from-slate-900 to-black rounded-3xl border-4 border-white/10 overflow-hidden relative shadow-2xl flex flex-col"
      >
        {/* Flash Overlay */}
        <AnimatePresence>
          {isFlashing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white z-[300] pointer-events-none"
            />
          )}
        </AnimatePresence>
        
        {/* Top Header */}
        <div className="p-4 flex justify-between items-center bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-primary animate-pulse" />
            <h2 className="text-xl font-black text-white tracking-widest uppercase">Trận chiến Tri thức</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={onClose}>Thoát</Button>
        </div>

        {/* Battle Arena */}
        <div className="flex-1 relative flex items-center justify-around px-8 overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-primary rounded-full blur-[120px] -translate-y-1/2" />
            <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-red-500 rounded-full blur-[120px] -translate-y-1/2" />
          </div>

          {/* Pet Side */}
          <div className="flex flex-col items-center gap-4 z-10 w-1/3">
            <div className="w-full space-y-1">
              <div className="flex justify-between text-[10px] font-black text-white uppercase tracking-wider">
                <span>{pet.pet_name}</span>
                <span>{petHp} HP</span>
              </div>
              <Progress value={(petHp / pet.hp) * 100} className="h-2 bg-white/10 border border-white/20" color="bg-green-500" />
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[8px] font-bold text-amber-400 uppercase">Rage</span>
                <Progress value={rage} className="h-1 flex-1 bg-white/5" color="bg-amber-500" />
              </div>
            </div>
            <div className="h-48 w-48 relative">
              <AdvancedPetRenderer 
                baseImage={pet.image_url} 
                emoji={pet.emoji} 
                state={petState} 
                size={180} 
                equippedItems={pet.equipped_items}
              />
              {/* Buff Indicators */}
              <div className="absolute -top-2 -left-2 flex flex-col gap-1">
                {(pet.active_buffs || []).map((buff: any, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="p-1 bg-amber-400 rounded-full shadow-lg border border-white"
                    title={buff.type}
                  >
                    {buff.type === 'power' && <Sword className="h-3 w-3 text-white" />}
                    {buff.type === 'xp_boost' && <Zap className="h-3 w-3 text-white" />}
                    {buff.type === 'lucky' && <Star className="h-3 w-3 text-white" />}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* VS */}
          <div className="text-4xl font-black text-white/20 italic z-10">VS</div>

          {/* Monster Side */}
          <div className="flex flex-col items-center gap-4 z-10 w-1/3 text-right">
            <div className="w-full space-y-1">
              <div className="flex justify-between text-[10px] font-black text-white uppercase tracking-wider">
                <span>{monsterHp} HP</span>
                <span>{initialMonster.name}</span>
              </div>
              <Progress value={(monsterHp / initialMonster.hp) * 100} className="h-2 bg-white/10 border border-white/20" color="bg-red-500" />
            </div>
            <motion.div 
              animate={monsterState}
              variants={{
                idle: { y: [0, -10, 0], scale: 1 },
                hurt: { x: [0, 10, -10, 0], filter: 'brightness(2) contrast(2)', scale: 0.9 },
                attack: { x: [0, -100, 0], scale: 1.2 }
              }}
              transition={{ repeat: monsterState === 'idle' ? Infinity : 0, duration: 0.5 }}
              className="h-48 w-48 flex items-center justify-center text-8xl drop-shadow-[0_0_30px_rgba(239,68,68,0.3)]"
            >
              {initialMonster.emoji}
            </motion.div>
          </div>
        </div>

        {/* Interaction Area */}
        <div className="h-48 bg-white/5 border-t border-white/10 p-6 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {combatStatus === 'intro' ? (
              <motion.div
                key="intro"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="text-center"
              >
                <h3 className="text-2xl font-black text-white mb-4 italic">Sẵn sàng học chưa?</h3>
                <Button 
                  size="lg" 
                  className="px-12 py-6 text-xl font-black rounded-full bg-primary hover:bg-primary/80 shadow-lg shadow-primary/20"
                  onClick={startCombat}
                >
                  BẮT ĐẦU CHIẾN ĐẤU!
                </Button>
              </motion.div>
            ) : combatStatus === 'fighting' && currentQuestion ? (
              <motion.div
                key="fighting"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl"
              >
                <div className="text-center mb-6 relative">
                  <span className="text-xs font-bold text-primary/80 uppercase tracking-widest block mb-1">CÂU HỎI {turn}</span>
                  <p className="text-2xl font-black text-white">{currentQuestion.text}</p>
                  
                  {/* Ultimate Button */}
                  <AnimatePresence>
                    {isUltimateReady && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="absolute -top-24 left-1/2 -translate-x-1/2 z-50"
                      >
                        <Button
                          onClick={handleUltimate}
                          className="h-16 w-16 rounded-full bg-gradient-to-t from-orange-600 to-yellow-400 border-4 border-white shadow-[0_0_20px_rgba(251,146,60,0.5)] animate-bounce p-0 overflow-hidden"
                        >
                          <Zap className="h-8 w-8 text-white animate-pulse" />
                        </Button>
                        <p className="text-[10px] font-black text-amber-400 mt-2 text-center uppercase tracking-tighter">ULTIMATE READY!</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {currentQuestion.options.map((opt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="py-6 text-lg font-bold border-2 border-white/10 bg-white/5 hover:bg-white/10 text-white"
                      onClick={() => handleAnswer(opt)}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              </motion.div>
            ) : combatStatus === 'won' ? (
              <motion.div key="won" className="text-center">
                <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-2 animate-bounce" />
                <h3 className="text-3xl font-black text-yellow-400 uppercase italic">CHIẾN THẮNG!</h3>
                <p className="text-white/60 mb-4">Bạn đã đánh bại {initialMonster.name}!</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={onClose} variant="secondary">Tiếp tục</Button>
                </div>
              </motion.div>
            ) : combatStatus === 'lost' && (
              <motion.div key="lost" className="text-center">
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-2" />
                <h3 className="text-3xl font-black text-red-500 uppercase italic">THẤT BẠI...</h3>
                <p className="text-white/60 mb-4">Bạn cần ôn luyện thêm kiến thức này.</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => window.location.href = '/review'} variant="default" className="bg-primary">Đi Ôn Tập</Button>
                  <Button onClick={onClose} variant="secondary">Quay lại</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
