import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sword, 
  Shield, 
  Heart, 
  Zap, 
  ChevronLeft, 
  Target, 
  Sparkles,
  Trophy,
  AlertCircle,
  Skull,
  Gift,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { AISenseiExplain } from '@/components/AI/AISenseiExplain';

// --- Types ---
interface Boss {
  id: string;
  name: string;
  description: string;
  max_hp: number;
  avatar_url: string;
  reward_xp: number;
}

interface Question {
  word: string;
  meaning: string;
  reading: string;
  options: string[];
  type: 'meaning' | 'reading';
}

const BossBattle = () => {
  const { bossId, folderId } = useParams<{ bossId?: string; folderId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [boss, setBoss] = useState<Boss | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [bossHp, setBossHp] = useState(0);
  const [userHp, setUserHp] = useState(100);
  const [gameState, setGameState] = useState<'loading' | 'intro' | 'battling' | 'victory' | 'defeat'>('loading');
  const [isAttacking, setIsAttacking] = useState(false);
  const [lastDamage, setLastDamage] = useState<number | null>(null);

  // --- Data Fetching ---
  useEffect(() => {
    const initBattle = async () => {
      try {
        // Fetch Boss
        let bossData;
        if (bossId) {
          const { data } = await (supabase as any).from('bosses').select('*').eq('id', bossId).single();
          bossData = data;
        } else {
          // Default first boss if no ID
          const { data } = await (supabase as any).from('bosses').select('*').limit(1).single();
          bossData = data;
        }
        
        if (!bossData) throw new Error('Boss not found');
        setBoss(bossData);
        setBossHp(bossData.max_hp);

        // Fetch Questions (either from folder or random from user's learned words)
        let quizQuestions: any[] = [];
        if (folderId) {
          const { data } = await (supabase as any).rpc('get_folder_flashcards', { folder_uuid: folderId });
          quizQuestions = (data || []).slice(0, 10);
        } else {
          quizQuestions = [
            { word: '食べる', meaning: 'Ăn', reading: 'たべる' },
            { word: '飲む', meaning: 'Uống', reading: 'のむ' },
            { word: '行く', meaning: 'Đi', reading: 'いく' },
          ];
        }

        const formattedQuestions: Question[] = quizQuestions.map((f: any, idx: number) => {
          const type = Math.random() > 0.5 ? 'meaning' : 'reading';
          const correctAnswer = type === 'meaning' ? f.meaning : f.reading;
          
          // Get distractors from other words in the pool
          const distractors = quizQuestions
            .filter((_, i) => i !== idx)
            .map(q => type === 'meaning' ? q.meaning : q.reading)
            .filter(val => val !== correctAnswer);
          
          const finalOptions = shuffle([
            correctAnswer,
            ...(shuffle(distractors).slice(0, 3))
          ]);

          // Fill with fallbacks if not enough distractors
          while (finalOptions.length < 4) {
             finalOptions.push(finalOptions.length === 1 ? 'Không rõ' : 'Khác');
          }

          return {
            word: f.word,
            meaning: f.meaning,
            reading: f.reading,
            type,
            options: shuffle(finalOptions)
          };
        });

        setQuestions(formattedQuestions);
        setGameState('intro');
      } catch (err) {
        console.error('Battle init error:', err);
        toast.error('Không thể khởi tạo trận đấu.');
        navigate('/vocabulary');
      }
    };

    initBattle();
  }, [bossId, folderId, navigate]);

  const shuffle = (array: any[]) => [...array].sort(() => Math.random() - 0.5);

  const handleAnswer = async (answer: string) => {
    if (isAttacking || gameState !== 'battling') return;
    
    const question = questions[currentQuestionIndex];
    const isCorrect = question.type === 'meaning' 
      ? answer === question.meaning 
      : answer === question.reading;

    if (isCorrect) {
      // User Attacks
      setLastDamage(1);
      setBossHp(prev => Math.max(0, prev - 1));
      
      // Update DB progress
      if (boss) {
        await (supabase as any).rpc('attack_boss', { 
          p_boss_id: boss.id, 
          p_damage: 1, 
          p_is_correct: true 
        });
      }

      if (bossHp <= 1) {
        setTimeout(() => setGameState('victory'), 1000);
      }
    } else {
      // Boss Attacks
      setUserHp(prev => Math.max(0, prev - 20));
      toast.error('Sai rồi! Boss đã phản công!', { icon: '💥' });
      
      if (userHp <= 20) {
        setTimeout(() => setGameState('defeat'), 1000);
      }
    }

    // Next question
    setTimeout(() => {
      setIsAttacking(false);
      setLastDamage(null);
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else if (bossHp > 0) {
         // Cycle questions if boss still alive
         setCurrentQuestionIndex(0);
      }
    }, 1200);
  };

  if (gameState === 'loading') return null;

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col font-sans overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-950/50 to-slate-950" />
         <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-sakura/5 rounded-full blur-[120px] opacity-20" />
      </div>

      {/* --- Header --- */}
      <header className="h-16 flex items-center justify-between px-6 z-10">
        <Link to="/vocabulary">
          <Button variant="ghost" className="text-slate-400 hover:text-white gap-2">
            <ChevronLeft className="h-4 w-4" /> Rút lui
          </Button>
        </Link>
        <div className="flex items-center gap-2">
           <Badge className="bg-slate-800 text-slate-300 border-slate-700">Chapter Final</Badge>
           <h1 className="font-black tracking-widest uppercase text-xs opacity-50">Boss Battle</h1>
        </div>
        <div className="w-20" /> {/* Spacer */}
      </header>

      {/* --- Battle Arena --- */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10">
        
        <AnimatePresence mode="wait">
          {gameState === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center space-y-8"
            >
               <div className="relative">
                  <div className="absolute -inset-10 bg-sakura/20 rounded-full blur-[60px] animate-pulse" />
                  <div className="text-8xl mb-4 relative">{boss?.avatar_url || '👹'}</div>
               </div>
               <div className="space-y-2">
                  <h2 className="text-4xl font-black tracking-tight text-sakura">{boss?.name}</h2>
                  <p className="text-slate-400 max-w-sm mx-auto">{boss?.description}</p>
               </div>
               <Button 
                 onClick={() => setGameState('battling')}
                 className="h-16 px-12 rounded-2xl bg-sakura hover:bg-sakura-dark text-white text-xl font-black gap-3 shadow-2xl shadow-sakura/20 group"
               >
                 <Sword className="h-6 w-6 group-hover:rotate-12 transition-transform" /> QUYẾT CHIẾN!
               </Button>
            </motion.div>
          )}

          {gameState === 'battling' && (
            <motion.div 
              key="battle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
            >
               {/* Left: Combat Visuals */}
               <div className="space-y-12">
                  {/* Boss Side */}
                  <div className="space-y-4">
                     <div className="flex justify-between items-end">
                        <div>
                           <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 mb-1">BOSS</Badge>
                           <h3 className="text-xl font-black">{boss?.name}</h3>
                        </div>
                        <span className="text-sm font-bold text-rose-400">HP {bossHp}/{boss?.max_hp}</span>
                     </div>
                     <Progress value={(bossHp / (boss?.max_hp || 1)) * 100} className="h-3 bg-slate-800" />
                     
                     <div className="relative h-48 flex items-center justify-center">
                        <motion.div 
                          animate={isAttacking ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                          className="text-9xl filter drop-shadow-[0_0_30px_rgba(244,63,94,0.3)]"
                        >
                          {boss?.avatar_url}
                        </motion.div>
                        {lastDamage && (
                          <motion.div 
                            initial={{ y: 0, opacity: 1, scale: 1 }}
                            animate={{ y: -100, opacity: 0, scale: 2 }}
                            className="absolute font-black text-rose-500 text-6xl italic"
                          >
                            -{lastDamage}
                          </motion.div>
                        )}
                     </div>
                  </div>

                  {/* User Side */}
                  <div className="space-y-4">
                     <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                           <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-primary">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} alt="User" />
                           </div>
                           <h3 className="font-bold">Bạn</h3>
                        </div>
                        <span className="text-sm font-bold text-primary">HP {userHp}/100</span>
                     </div>
                     <Progress value={userHp} className="h-3 bg-slate-800" />
                  </div>
               </div>

               {/* Right: Question Card */}
               <div className="space-y-6">
                  <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                     <CardContent className="p-8 space-y-8">
                        <div className="text-center space-y-4">
                           <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                             {questions[currentQuestionIndex]?.type === 'meaning' ? 'Ý nghĩa của từ này là gì?' : 'Cách đọc của từ này là gì?'}
                           </div>
                           <h4 className="font-jp text-5xl font-black text-white">{questions[currentQuestionIndex]?.word}</h4>
                           <div className="text-xs text-slate-400 italic">Câu hỏi {currentQuestionIndex + 1}/{questions.length}</div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                           {questions[currentQuestionIndex]?.options.map((opt, i) => (
                             <button
                               key={i}
                               disabled={isAttacking}
                               onClick={() => handleAnswer(opt)}
                               className={cn(
                                 "w-full p-5 rounded-2xl text-left font-bold transition-all border-2",
                                 "bg-slate-800/50 border-slate-700 hover:bg-slate-700 hover:border-slate-600 active:scale-[0.98]",
                                 isAttacking && "opacity-50"
                               )}
                             >
                               <span className="text-slate-500 mr-4">{String.fromCharCode(65 + i)}.</span>
                               {opt}
                             </button>
                           ))}
                        </div>
                     </CardContent>
                  </Card>
                  
                  <div className="flex items-center gap-6 justify-center text-slate-500">
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><Shield className="h-3 w-3" /> Auto-Guard</div>
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><Zap className="h-3 w-3" /> Combo Multiplier</div>
                     <AISenseiExplain 
                        content={questions[currentQuestionIndex]?.word}
                        trigger={
                          <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sakura hover:opacity-80 transition-opacity">
                             <Sparkles className="h-3 w-3" /> AI Analysis
                          </button>
                        }
                     />
                  </div>
               </div>
            </motion.div>
          )}

          {gameState === 'victory' && (
            <motion.div 
              key="victory"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-10"
            >
               <div className="relative">
                  <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-[100px] animate-pulse" />
                  <motion.div 
                    animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Trophy className="h-32 w-32 text-yellow-400 mx-auto fill-yellow-400/20" />
                  </motion.div>
               </div>
               <div className="space-y-4">
                  <h2 className="text-6xl font-black tracking-tighter text-yellow-400">CHIẾN THẮNG!</h2>
                  <p className="text-slate-400 text-lg">Bạn đã đánh bại {boss?.name} và giải cứu chapter này!</p>
               </div>

               <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                  <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-2">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kinh nghiệm</p>
                     <p className="text-3xl font-black text-yellow-400">+{boss?.reward_xp} XP</p>
                  </div>
                  <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-2">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vật phẩm hiếm</p>
                     <div className="flex items-center justify-center gap-2">
                        <Gift className="h-6 w-6 text-sakura" />
                        <span className="text-xl font-black">Mystery Box</span>
                     </div>
                  </div>
               </div>

               <Button 
                 onClick={() => navigate('/vocabulary')}
                 className="h-16 px-12 rounded-2xl bg-white text-slate-950 text-xl font-black gap-3 hover:bg-slate-200 transition-all"
               >
                 TRỞ VỀ KHOẢNG KHẮC <ChevronLeft className="h-5 w-5 rotate-180" />
               </Button>
            </motion.div>
          )}

          {gameState === 'defeat' && (
            <motion.div 
              key="defeat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-8"
            >
               <Skull className="h-32 w-32 text-rose-500 mx-auto opacity-50" />
               <div className="space-y-2">
                  <h2 className="text-5xl font-black tracking-tight text-white">BẠN ĐÃ NGÃ XUỐNG</h2>
                  <p className="text-slate-400">Đừng bỏ cuộc! Hãy ôn tập lại và quay lại phục thù.</p>
               </div>
               <div className="flex gap-4 justify-center">
                  <Button onClick={() => window.location.reload()} className="h-14 px-8 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold gap-2">
                    <RotateCcw className="h-5 w-5" /> Thử lại
                  </Button>
                  <Button variant="outline" asChild className="h-14 px-8 rounded-xl border-slate-700 hover:bg-slate-800">
                    <Link to="/vocabulary">Về ôn tập</Link>
                  </Button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- Overlay Effects --- */}
      {isAttacking && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-white/10 z-50 pointer-events-none"
        />
      )}
    </div>
  );
};

export default BossBattle;
