import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Flame, 
  Target, 
  Zap, 
  Heart, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft,
  Settings,
  HelpCircle,
  Volume2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

// --- Types ---
interface FallingKanji {
  id: string;
  character: string;
  readings: string[];
  meaning: string;
  x: number; // percentage
  speed: number;
  y: number; // percentage
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string;
  max_score: number;
}

// --- Constants ---
const INITIAL_SPEED = 0.2;
const SPEED_INCREMENT = 0.02;
const SPAWN_INTERVAL = 2000;
const MAX_LIVES = 3;

const KanjiBattleArena = () => {
  const { profile } = useProfile();
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [kanjiList, setKanjiList] = useState<FallingKanji[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [difficulty, setDifficulty] = useState<'N5' | 'N4' | 'N3'>('N5');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  const gameLoopRef = useRef<number | null>(null);
  const lastSpawnTime = useRef<number>(0);
  const kanjiPool = useRef<any[]>([]);

  // --- Initialization ---
  useEffect(() => {
    fetchLeaderboard();
    fetchKanjiPool();
  }, [difficulty]);

  const fetchKanjiPool = async () => {
    try {
      const { data, error } = await supabase
        .from('kanji')
        .select('character, onyomi, kunyomi, meaning')
        .eq('jlpt_level', difficulty)
        .limit(100);
      
      if (error) throw error;
      kanjiPool.current = data || [];
    } catch (err) {
      console.error('Failed to fetch kanji:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase.rpc('get_kanji_battle_leaderboard', { p_period: 'daily' });
      if (error) throw error;
      setLeaderboard(data || []);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  };

  // --- Game Logic ---
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(MAX_LIVES);
    setKanjiList([]);
    setInputValue('');
    lastSpawnTime.current = performance.now();
  };

  const gameOver = useCallback(async () => {
    setGameState('gameover');
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    
    // Save score to Supabase
    if (score > 0) {
      try {
        const { error } = await supabase.from('kanji_battle_scores').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          score,
          max_combo: maxCombo,
          difficulty: difficulty.toLowerCase(),
          kanji_count: Math.floor(score / 10) // rough estimate
        });
        if (error) throw error;
        fetchLeaderboard();
      } catch (err) {
        console.error('Failed to save score:', err);
      }
    }
  }, [score, maxCombo, difficulty]);

  const spawnKanji = useCallback(() => {
    if (kanjiPool.current.length === 0) return;
    
    const randomKanji = kanjiPool.current[Math.floor(Math.random() * kanjiPool.current.length)];
    const readings = [...(randomKanji.onyomi || []), ...(randomKanji.kunyomi || [])];
    
    const newKanji: FallingKanji = {
      id: Math.random().toString(36).substr(2, 9),
      character: randomKanji.character,
      readings: readings.map(r => r.replace(/\./g, '').replace(/-/g, '')),
      meaning: randomKanji.meaning,
      x: 10 + Math.random() * 80, // 10% to 90%
      y: -10,
      speed: INITIAL_SPEED + (score / 1000) * SPEED_INCREMENT
    };
    
    setKanjiList(prev => [...prev, newKanji]);
  }, [score]);

  const gameLoop = useCallback((time: number) => {
    if (gameState !== 'playing') return;

    // Spawn logic
    if (time - lastSpawnTime.current > SPAWN_INTERVAL - (score / 10)) {
      spawnKanji();
      lastSpawnTime.current = time;
    }

    // Move logic
    setKanjiList(prev => {
      const updated = prev.map(k => ({ ...k, y: k.y + k.speed }));
      
      // Check for bottom hit
      const hitsBottom = updated.find(k => k.y >= 100);
      if (hitsBottom) {
        setLives(l => {
          if (l <= 1) {
            gameOver();
            return 0;
          }
          return l - 1;
        });
        setCombo(0);
        return updated.filter(k => k.y < 100);
      }
      
      return updated;
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score, spawnKanji, gameOver]);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, gameLoop]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setInputValue(value);

    // Check against all active kanji readings
    const matchedKanji = kanjiList.find(k => k.readings.includes(value));
    
    if (matchedKanji) {
      // Correct!
      setScore(prev => prev + 10 * (combo >= 5 ? 2 : 1));
      setCombo(c => {
        const next = c + 1;
        if (next > maxCombo) setMaxCombo(next);
        return next;
      });
      setKanjiList(prev => prev.filter(k => k.id !== matchedKanji.id));
      setInputValue('');
      
      // Play sound/effect logic here
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col relative overflow-hidden font-sans">
      {/* Background Particles/Design */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-sakura rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-primary rounded-full blur-3xl animate-pulse" />
      </div>

      {/* --- Header --- */}
      <header className="h-16 border-b bg-white/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          <Link to="/vocabulary">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              KANJI BATTLE ARENA
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-70">Action Learning Mode</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-sakura/10 rounded-full border border-sakura/20">
            <Trophy className="h-4 w-4 text-sakura" />
            <span className="text-sm font-black text-sakura">{score.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
             {[...Array(MAX_LIVES)].map((_, i) => (
               <Heart 
                 key={i} 
                 className={cn(
                   "h-5 w-5 transition-all duration-300",
                   i < lives ? "text-rose-500 fill-rose-500 scale-110" : "text-slate-200 fill-slate-200 scale-90"
                 )} 
               />
             ))}
          </div>
        </div>
      </header>

      {/* --- Main Game Area --- */}
      <main className="flex-1 relative flex">
        
        {/* Battle Zone */}
        <div className="flex-1 relative border-r border-dashed border-slate-200 overflow-hidden bg-white/30">
          <AnimatePresence>
            {gameState === 'idle' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex flex-center z-30"
              >
                <div className="text-center p-10 bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-elevated border border-sakura/10 max-w-sm m-auto">
                   <div className="h-20 w-20 bg-sakura/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                     <Zap className="h-10 w-10 text-sakura fill-sakura/20" />
                   </div>
                   <h2 className="text-2xl font-black mb-2">Sẵn sàng chưa?</h2>
                   <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                     Kanji sẽ rơi từ trên xuống. Hãy gõ cách đọc (hiragana) thật nhanh trước khi chúng chạm đáy!
                   </p>
                   
                   <div className="flex gap-2 mb-8 justify-center">
                     {(['N5', 'N4', 'N3'] as const).map(lvl => (
                       <button
                         key={lvl}
                         onClick={() => setDifficulty(lvl)}
                         className={cn(
                           "px-4 py-2 rounded-xl text-xs font-black transition-all",
                           difficulty === lvl ? "bg-sakura text-white shadow-soft" : "bg-muted text-muted-foreground hover:bg-muted/80"
                         )}
                       >
                         {lvl}
                       </button>
                     ))}
                   </div>

                   <Button 
                     onClick={startGame}
                     className="w-full h-14 rounded-2xl bg-sakura hover:bg-sakura-dark text-white text-lg font-black gap-3 shadow-lg hover:translate-y-[-2px] transition-all"
                   >
                     <Play className="h-6 w-6 fill-white" /> BẮT ĐẦU NGAY
                   </Button>
                </div>
              </motion.div>
            )}

            {gameState === 'gameover' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex items-center justify-center"
              >
                <div className="text-center p-10 bg-white rounded-[2.5rem] shadow-elevated border-2 border-rose-100 max-w-sm">
                   <h2 className="text-4xl font-black text-rose-500 mb-2">GAME OVER</h2>
                   <div className="space-y-4 my-8">
                      <div className="p-4 bg-slate-50 rounded-2xl">
                         <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Điểm số</p>
                         <p className="text-3xl font-black text-foreground">{score.toLocaleString()}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl">
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Max Combo</p>
                           <p className="text-xl font-black text-sakura">{maxCombo}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl">
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Trình độ</p>
                           <p className="text-xl font-black text-primary">{difficulty}</p>
                        </div>
                      </div>
                   </div>
                   <div className="flex gap-3">
                      <Button onClick={startGame} className="flex-1 h-12 rounded-xl bg-sakura hover:bg-sakura-dark text-white font-bold gap-2">
                         <RotateCcw className="h-4 w-4" /> Chơi lại
                      </Button>
                      <Button variant="outline" asChild className="flex-1 h-12 rounded-xl">
                         <Link to="/vocabulary">Thoát</Link>
                      </Button>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Falling Kanji Elements */}
          <div className="absolute inset-0 pointer-events-none">
            {kanjiList.map(k => (
              <motion.div
                key={k.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ 
                  left: `${k.x}%`, 
                  top: `${k.y}%`,
                  transform: 'translateX(-50%)' 
                }}
                className="absolute"
              >
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-br from-sakura/40 to-primary/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-16 h-16 bg-white rounded-2xl border-2 border-sakura/20 shadow-soft flex items-center justify-center transition-transform hover:scale-110">
                    <span className="font-jp text-3xl font-black text-foreground">{k.character}</span>
                  </div>
                  {/* Hints for easy mode could be added here */}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom Input Area */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-20">
             <div className="relative">
                <div className={cn(
                  "absolute -top-14 left-1/2 -translate-x-1/2 transition-all duration-300",
                  combo >= 5 ? "opacity-100 scale-100" : "opacity-0 scale-50"
                )}>
                   <Badge className="bg-yellow-400 text-yellow-900 border-none px-4 py-1.5 rounded-full text-lg font-black shadow-lg animate-bounce">
                     COMBO x{combo} <Sparkles className="h-4 w-4 ml-1 inline" />
                   </Badge>
                </div>
                
                <div className="bg-white/90 backdrop-blur-xl p-2 rounded-3xl border shadow-elevated focus-within:ring-4 focus-within:ring-sakura/20 transition-all">
                   <Input 
                     autoFocus
                     value={inputValue}
                     onChange={handleInputChange}
                     placeholder="Gõ cách đọc..."
                     disabled={gameState !== 'playing'}
                     className="h-16 border-none bg-transparent text-center text-2xl font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:ring-0"
                   />
                </div>
                
                <div className="mt-4 flex justify-center gap-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                   <div className="flex items-center gap-1.5"><Volume2 className="h-3 w-3" /> Audio ON</div>
                   <div className="flex items-center gap-1.5"><Target className="h-3 w-3" /> Accuracy 100%</div>
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar: Stats & Leaderboard */}
        <div className="w-80 bg-white/50 backdrop-blur-sm p-6 hidden lg:flex flex-col gap-8 overflow-y-auto">
           {/* Current Session Stats */}
           <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                <Settings className="h-3 w-3" /> THỐNG KÊ TRẬN ĐẤU
              </h3>
              <Card className="border-none shadow-sm bg-white/80">
                <CardContent className="p-4 space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Tốc độ</span>
                      <span className="text-sm font-black">{(INITIAL_SPEED + (score / 1000) * SPEED_INCREMENT).toFixed(2)}x</span>
                   </div>
                   <Progress value={Math.min(100, (score / 500) * 100)} className="h-1.5 bg-slate-100" />
                   
                   <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Combo lớn nhất</span>
                      <span className="text-sm font-black text-sakura">{maxCombo}</span>
                   </div>
                </CardContent>
              </Card>
           </div>

           {/* Leaderboard */}
           <div className="flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                  <Trophy className="h-3 w-3" /> BẢNG VÀNG NGÀY
                </h3>
                <Badge variant="outline" className="text-[9px] uppercase border-sakura/30 text-sakura">Daily</Badge>
              </div>
              
              <div className="space-y-2 flex-1">
                 {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
                   <motion.div 
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.05 }}
                     key={i} 
                     className={cn(
                       "flex items-center gap-3 p-3 rounded-2xl transition-all",
                       entry.user_id === profile?.user_id ? "bg-sakura/10 border border-sakura/20 shadow-sm" : "hover:bg-white/80"
                     )}
                   >
                     <div className={cn(
                       "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shadow-inner",
                       i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-slate-100 text-slate-400"
                     )}>
                       {i + 1}
                     </div>
                     <div className="h-8 w-8 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                       <img src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.display_name}`} alt={entry.display_name} />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-xs font-bold truncate">{entry.display_name}</p>
                       <p className="text-[10px] text-muted-foreground font-medium">{entry.max_score.toLocaleString()} pts</p>
                     </div>
                     {i === 0 && <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />}
                   </motion.div>
                 )) : (
                   <div className="h-40 flex flex-col items-center justify-center text-center opacity-30">
                      <HelpCircle className="h-8 w-8 mb-2" />
                      <p className="text-xs font-medium">Chưa có dữ liệu hôm nay</p>
                   </div>
                 )}
              </div>
           </div>

           <Button variant="ghost" className="w-full text-xs font-bold text-muted-foreground hover:text-sakura gap-2">
              Xem toàn bộ bảng xếp hạng <ChevronLeft className="h-3 w-3 rotate-180" />
           </Button>
        </div>
      </main>

      {/* --- Footer / Navigation Mobile --- */}
      <footer className="h-14 border-t bg-white lg:hidden flex items-center justify-around px-6">
         <Button variant="ghost" size="sm" className="gap-2 font-bold text-xs"><Trophy className="h-4 w-4" /> Scores</Button>
         <Button variant="ghost" size="sm" className="gap-2 font-bold text-xs"><HelpCircle className="h-4 w-4" /> Rules</Button>
      </footer>
    </div>
  );
};

export default KanjiBattleArena;
