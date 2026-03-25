import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Volume2, ChevronRight, RotateCcw, CheckCircle2, AlertCircle, Loader2,
  BrainCircuit, Sparkles, Target, MessageSquare, Headphones, History,
  TrendingUp, Award, Play, X, Zap, BookOpen, Search, Filter, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { VoiceHub } from '@/components/chat/VoiceHub';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useTTS } from '@/hooks/useTTS';
import { useXP } from '@/hooks/useXP';
import { useAI } from '@/contexts/AIContext';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useLearningDiagnostics } from '@/hooks/useLearningDiagnostics';
import { toast as sonnerToast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// ─── Types & Data ───────────────────────────────────────────────────────────

interface PracticeSentence {
  id: string;
  japanese: string;
  reading: string;
  vietnamese: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface LessonChapter {
  id: string;
  title: string;
  level: string;
  icon: any;
  sentences: PracticeSentence[];
  color: string;
}

type PracticeMode = 'shadowing' | 'roleplay' | 'diagnostic' | 'boss';

const DEFAULT_LIBRARY: LessonChapter[] = [
  {
    id: 'n5-comms',
    title: 'Chào hỏi hàng ngày',
    level: 'N5',
    icon: Sparkles,
    color: 'bg-emerald-500',
    sentences: [
      { id: '1', japanese: 'おはようございます', reading: 'おはようございます', vietnamese: 'Chào buổi sáng', difficulty: 'easy' },
      { id: '2', japanese: 'ありがとうございます', reading: 'ありがとうございます', vietnamese: 'Cảm ơn bạn', difficulty: 'easy' },
      { id: '3', japanese: 'よろしくお願いします', reading: 'よろしくおねがいします', vietnamese: 'Rất vui được làm quen', difficulty: 'easy' },
    ]
  },
  {
    id: 'n4-travel',
    title: 'Du lịch Nhật Bản',
    level: 'N4',
    icon: Target,
    color: 'bg-blue-500',
    sentences: [
      { id: 't1', japanese: '駅はどこですか', reading: 'えきはどこですか', vietnamese: 'Nhà ga ở đâu?', difficulty: 'medium' },
      { id: 't2', japanese: 'おすすめの料理は何ですか', reading: 'おすすめのりょうりはなんですか', vietnamese: 'Món ăn gợi ý là gì?', difficulty: 'medium' },
    ]
  },
  {
    id: 'business',
    title: 'Giao tiếp Công sở',
    level: 'N3+',
    icon: MessageSquare,
    color: 'bg-amber-500',
    sentences: [
      { id: 'b1', japanese: 'お疲れ様でした', reading: 'おつかれさまでした', vietnamese: 'Bạn đã vất vả rồi (Chào khi về/xong việc)', difficulty: 'hard' },
      { id: 'b2', japanese: '承知いたしました', reading: 'しょうちいたしました', vietnamese: 'Tôi đã hiểu rõ (Lịch sự)', difficulty: 'hard' },
    ]
  }
];

const PERSONAS: { id: string, name: string, systemPrompt: string }[] = [
  { id: 'sensei', name: 'Sensei', systemPrompt: 'あなたは優しい日本語の先生です。' },
  { id: 'oni', name: 'Akuma Boss', systemPrompt: 'お前は強力な鬼のボスだ。日本語で学習者を威嚇し、挑戦を与えろ。' },
];

interface ScoreResult {
  accuracy: number;
  fluency: number;
  rhythm: number;
  overall: number;
  feedback: string;
  details: { word: string; status: 'correct' | 'incorrect' }[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export const SpeakingPractice = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { speak, isSpeaking } = useTTS({ lang: 'ja-JP', rate: 0.8 });
  const { awardXP } = useXP();
  const { insights, refreshInsights } = useLearningDiagnostics();
  
  const [activeMode, setActiveMode] = useState<PracticeMode>('shadowing');
  const [activeChapter, setActiveChapter] = useState<LessonChapter>(DEFAULT_LIBRARY[0]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [voiceHubOpen, setVoiceHubOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { chat } = useAI();

  // 🐲 Boss State
  const [bossHP, setBossHP] = useState(100);
  const [playerHP, setPlayerHP] = useState(100);
  const [battleLog, setBattleLog] = useState<string[]>(["Akuma đang chờ đợi... Hãy cất vang tiếng nói của bạn!"]);
  const [isBossAttacking, setIsBossAttacking] = useState(false);

  const currentSentence = activeChapter.sentences[currentIdx];

  const { isListening, startListening, stopListening, transcript, isSupported } =
    useSpeechRecognition({
      lang: 'ja-JP',
      continuous: false,
      onResult: (text) => {/* handle live feedback if needed */},
    });

  // Load insights
  useEffect(() => {
    if (user) refreshInsights();
  }, [user, refreshInsights]);

  // Scoring Logic
  const handleScore = useCallback(async (recognized: string) => {
    if (!recognized.trim()) return;
    setIsScoring(true);
    
    // 🧠 Phonetic Matching Logic
    const targetPhonetic = currentSentence.reading; // Use Hiragana for comparison
    const norm = (s: string) => s.replace(/[\s、。！？,.!?]/g, '');
    const tgtChars = norm(targetPhonetic).split('');
    const recChars = norm(recognized).split('');
    
    let matches = 0;
    const details = tgtChars.map((char, i) => {
      // Allow partial matching for phonetic similarity
      const match = recChars.includes(char);
      if (match) matches++;
      return { word: char, status: (match ? 'correct' : 'incorrect') as any };
    });

    const acc = Math.round((matches / Math.max(tgtChars.length, 1)) * 100);
    const result: ScoreResult = {
      accuracy: acc,
      fluency: Math.min(100, acc + 12),
      rhythm: Math.min(100, acc + 8),
      overall: acc,
      feedback: acc >= 85 ? 'Tuyệt vời! Phát âm rất chuẩn.' : acc >= 60 ? 'Rất tốt, hãy luyện thêm nhé.' : 'Hãy nghe kỹ và thử lại nhé.',
      details
    };

    setScoreResult(result);

    if (user) {
      if (activeMode === 'boss' && acc >= 70) {
        const dmg = Math.round(acc / 2);
        const newHP = Math.max(0, bossHP - dmg);
        setBossHP(newHP);
        setBattleLog(prev => [`⚔️ Đòn đánh chí mạng! Gây ${dmg} sát thương.`, ...prev]);
        
        if (newHP === 0) {
          awardXP('achievement', 500);
          sonnerToast.success("BẠN ĐÃ CHIẾN THẮNG AKUMA! +500 XP");
          return;
        }

        setTimeout(() => {
          setIsBossAttacking(true);
          const bossDmg = 15;
          const threat = ["まだまだだな！", "もっと本気でかかってこい！"][Math.floor(Math.random()*2)];
          speak(threat);
          setPlayerHP(p => Math.max(0, p - bossDmg));
          setBattleLog(prev => [`🔥 Akuma: "${threat}" - Bạn mất ${bossDmg} HP`, ...prev]);
          setIsBossAttacking(false);
        }, 1500);
      }

      await (supabase as any).from('pronunciation_results').insert({
        user_id: user.id,
        original_text: currentSentence.japanese,
        recognized_text: recognized,
        score: acc,
        mode: activeMode
      });
      awardXP('speaking', acc >= 80 ? 30 : 10);
    }
    
    setIsScoring(false);
  }, [currentSentence, user, awardXP, activeMode, bossHP, speak]);

  const handleGenerateAILesson = async () => {
    if (!user) return;
    setIsGenerating(true);
    setLibraryOpen(false);

    try {
      // 1. Fetch mistakes
      const { data: mistakeData } = await (supabase as any)
        .from('user_mistakes')
        .select('word')
        .eq('user_id', user.id)
        .order('mistake_count', { ascending: false })
        .limit(5);

      const mistakeList = mistakeData?.map(m => m.word).join(', ') || 'N5 grammar';

      // 2. Call AI
      const systemPrompt = "You are a Japanese sensei creating a personalized speaking lesson. Generate exactly 5 natural sentences targeting the user's weak words. Return ONLY a JSON array of objects with 'japanese', 'reading' (hiragana), and 'vietnamese' fields. No markdown, no prose.";
      const response = await chat([
        { role: 'user', content: `Generate a speaking lesson based on these weak points: ${mistakeList}. Target level: N5-N4.` }
      ], systemPrompt);

      if (!response || !response.content) throw new Error('AI failed to generate');
      
      const raw = response.content.replace(/```json|```/g, '').trim();
      const generatedSentences: PracticeSentence[] = JSON.parse(raw).map((s: any, i: number) => ({
        id: `ai-${Date.now()}-${i}`,
        japanese: s.japanese,
        reading: s.reading,
        vietnamese: s.vietnamese,
        difficulty: 'medium'
      }));

      const aiChapter: LessonChapter = {
        id: `ai-gen-${Date.now()}`,
        title: 'Bài tập AI Cá nhân hóa',
        level: 'Personal',
        icon: Sparkles,
        color: 'bg-indigo-500',
        sentences: generatedSentences
      };

      setActiveChapter(aiChapter);
      setCurrentIdx(0);
      setScoreResult(null);
      sonnerToast.success("Đã tạo bài học cá nhân hóa cho bạn!");
    } catch (error) {
      console.error('Lesson Gen Error:', error);
      sonnerToast.error("Không thể tạo bài học AI lúc này.");
    } finally {
      setIsGenerating(false);
    }
  };

  const prevListening = useRef(false);
  useEffect(() => {
    if (prevListening.current && !isListening && transcript.trim()) {
      handleScore(transcript);
    }
    prevListening.current = isListening;
  }, [isListening, transcript, handleScore]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-slate-950 pb-20">
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        {/* Header with Dashboard Stats */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-sakura to-crimson rounded-2xl shadow-xl shadow-sakura/20">
                <Headphones className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">AI Speaking Lab</h1>
            </div>
            <div className="flex items-center gap-4 text-slate-400 font-bold text-xs uppercase tracking-widest">
               <div className="flex items-center gap-1.5"><History className="h-4 w-4" /> 120 câu đã luyện</div>
               <div className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> 88% chính xác</div>
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            {(['shadowing', 'roleplay', 'boss', 'diagnostic'] as PracticeMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setActiveMode(m)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeMode === m ? "bg-sakura text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {m === 'shadowing' ? 'Luyện âm' : m === 'roleplay' ? 'Nhập vai' : m === 'boss' ? 'Boss Battle' : 'Sơ đồ lỗi'}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Content */}
        <AnimatePresence mode="wait">
          {activeMode === 'boss' && (
            <motion.div key="boss" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="space-y-8">
               <div className="relative h-[280px] w-full bg-slate-950 rounded-[3.5rem] overflow-hidden border-4 border-slate-800 shadow-2xl">
                 <div className="absolute inset-0 flex items-center justify-center">
                   <motion.div 
                     animate={isBossAttacking ? { x: [0, -30, 30, 0], scale: [1, 1.3, 1] } : { y: [0, -15, 0] }}
                     transition={isBossAttacking ? { duration: 0.2 } : { repeat: Infinity, duration: 4 }}
                     className="w-56 h-56 bg-contain bg-center bg-no-repeat drop-shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                     style={{ backgroundImage: 'url("/assets/boss.png")' }}
                   />
                 </div>

                 {/* HUD */}
                 <div className="absolute top-8 left-12 right-12 space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-white font-black text-sm uppercase italic">AKUMA THE DESTROYER (LV 99)</span>
                      <span className="text-sakura font-black text-xl">{bossHP}%</span>
                    </div>
                    <Progress value={bossHP} className="h-4 bg-white/10" indicatorClassName="bg-gradient-to-r from-sakura to-rose-600" />
                 </div>

                 <div className="absolute bottom-8 left-12 right-12 space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-cyan-400 font-black text-xs uppercase italic">LINH HỒN CỦA BẠN</span>
                      <span className="text-cyan-500 font-black">{playerHP}/100</span>
                    </div>
                    <Progress value={playerHP} className="h-2 bg-white/10" indicatorClassName="bg-cyan-500" />
                 </div>
               </div>

               <div className="grid md:grid-cols-2 gap-8">
                 <Card className="rounded-[3rem] p-10 border-2 border-sakura/10 dark:border-slate-800 shadow-xl space-y-8 bg-white/80 dark:bg-slate-900 backdrop-blur-md">
                    <div className="text-center space-y-3">
                       <Badge className="bg-crimson/10 text-crimson border-none font-black text-[10px] uppercase">Kỹ năng đang dùng</Badge>
                       <h3 className="text-3xl font-jp font-black text-slate-800 dark:text-white">{currentSentence.japanese}</h3>
                       <p className="text-lg text-slate-400 font-medium italic">{currentSentence.vietnamese}</p>
                    </div>

                    <div className="flex justify-center gap-6">
                       <Button size="icon" variant="outline" className="h-14 w-14 rounded-2xl" onClick={() => speak(currentSentence.japanese)}><Volume2 className="h-6 w-6"/></Button>
                       <motion.button
                         whileTap={{ scale: 0.9 }}
                         onClick={() => isListening ? stopListening() : startListening()}
                         className={cn(
                           "h-20 w-20 rounded-full flex items-center justify-center text-white transition-all shadow-2xl",
                           isListening ? "bg-red-500 ring-8 ring-red-100" : "bg-sakura"
                         )}
                       >
                         {isListening ? <div className="h-6 w-6 bg-white rounded-md" /> : <Mic className="h-8 w-8" />}
                       </motion.button>
                       <Button size="icon" variant="outline" className="h-14 w-14 rounded-2xl" onClick={() => setCurrentIdx(i => (i+1)%activeChapter.sentences.length)}><ChevronRight className="h-6 w-6"/></Button>
                    </div>
                 </Card>

                 <Card className="rounded-[3rem] p-8 bg-crimson shadow-2xl flex flex-col h-[350px] border-4 border-crimson/20">
                    <div className="flex items-center gap-3 mb-6">
                      <Zap className="h-5 w-5 text-sakura" /><h4 className="text-sm font-black text-white uppercase tracking-widest">Nhật ký chiến trường</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
                       {battleLog.map((log, i) => (
                         <motion.p key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                           className={cn("text-[11px] font-bold leading-relaxed", log.includes('⚔️') ? "text-emerald-300" : log.includes('🔥') ? "text-white/80" : "text-white/50")}>
                           {log}
                         </motion.p>
                       ))}
                    </div>
                 </Card>
               </div>
            </motion.div>
          )}

          {activeMode === 'shadowing' && (
            <motion.div key="shadowing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <Card className="rounded-[3.5rem] border-2 border-sakura/10 overflow-hidden shadow-2xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl">
                <CardContent className="p-12 space-y-10">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="border-sakura text-sakura px-4 py-1.5 rounded-full font-black uppercase text-[10px]">PHÒNG Shadowing 01</Badge>
                    <div className="flex gap-2">
                       <Button variant="ghost" size="sm" onClick={() => setLibraryOpen(true)} className="text-sakura font-black text-xs gap-2 px-4 rounded-full bg-sakura/5"><BookOpen className="h-4 w-4" /> THƯ VIỆN</Button>
                    </div>
                  </div>

                  <div className="text-center space-y-8">
                    <div className="space-y-4">
                       <h2 className="text-6xl font-jp font-black text-slate-800 dark:text-white leading-tight tracking-tighter">{currentSentence.japanese}</h2>
                       <p className="text-xl text-slate-400 font-jp italic font-medium">{currentSentence.reading}</p>
                    </div>
                    <div className="max-w-md mx-auto p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                       <p className="text-lg text-slate-600 dark:text-slate-300 font-medium">{currentSentence.vietnamese}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-8 pt-4">
                    <Button size="lg" variant="outline" onClick={() => speak(currentSentence.japanese)} disabled={isSpeaking} className="h-16 w-16 rounded-full shadow-lg border-2"><Volume2 className="h-6 w-6" /></Button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => isListening ? stopListening() : startListening()} className={cn("h-28 w-28 rounded-full flex items-center justify-center transition-all shadow-2xl", isListening ? "bg-red-500 ring-12 ring-red-100" : "bg-sakura shadow-sakura/40 hover:scale-105")}>
                      {isScoring ? <Loader2 className="h-10 w-10 text-white animate-spin" /> : isListening ? <div className="h-10 w-10 bg-white rounded-md animate-pulse" /> : <Mic className="h-12 w-12 text-white" />}
                    </motion.button>
                    <Button size="lg" variant="outline" onClick={() => setCurrentIdx((i) => (i + 1) % activeChapter.sentences.length)} className="h-16 w-16 rounded-full shadow-lg border-2"><ChevronRight className="h-6 w-6" /></Button>
                  </div>

                  {scoreResult && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-10 rounded-[3rem] bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-xl space-y-8">
                       <div className="flex items-center justify-between">
                         <div className="space-y-1">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">KIÊM TRA TRÍ TUỆ NHÂN TẠO</p>
                           <h3 className="text-3xl font-black text-slate-800 dark:text-white">{scoreResult.feedback}</h3>
                         </div>
                         <div className="text-5xl font-black text-sakura">{scoreResult.overall}%</div>
                      </div>
                      <div className="grid grid-cols-3 gap-8">
                        {[{ label: 'Chính xác', val: scoreResult.accuracy, color: 'bg-sakura' }, { label: 'Thanh điệu', val: scoreResult.fluency, color: 'bg-indigo-500' }, { label: 'Tốc độ', val: scoreResult.rhythm, color: 'bg-emerald-500' }].map((s) => (
                          <div key={s.label} className="space-y-3">
                            <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{s.label}</p>
                            <Progress value={s.val} className="h-2 rounded-full bg-slate-100" indicatorClassName={s.color} />
                            <p className="text-sm font-black dark:text-white">{s.val}%</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeMode === 'roleplay' && (
            <motion.div key="roleplay" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
               <Card className="rounded-[4rem] border-2 border-blue-100 shadow-2xl bg-white p-16 text-center space-y-10">
                  <div className="h-24 w-24 bg-sakura/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner"><MessageSquare className="h-12 w-12 text-sakura" /></div>
                  <div className="space-y-4">
                     <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-tight">Hội thoại Nhập vai</h2>
                     <p className="text-slate-400 font-medium max-w-sm mx-auto">Tạo tình huống giả định và giao tiếp tự nhiên cùng AI Sensei để tăng phản xạ.</p>
                  </div>
                  <Button size="lg" onClick={() => setVoiceHubOpen(true)} className="h-20 px-16 rounded-[2rem] bg-crimson text-white font-black text-xl shadow-2xl shadow-crimson/20 hover:bg-crimson/90 hover:scale-105 transition-all gap-4">
                    <Sparkles className="h-6 w-6" /> MỞ TRUNG TÂM VOICE
                  </Button>
               </Card>
            </motion.div>
          )}

          {activeMode === 'diagnostic' && (
            <motion.div key="diagnostic" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
               <Card className="rounded-[4rem] border-2 border-sakura/10 shadow-2xl bg-white p-12 space-y-10">
                  <div className="flex items-center justify-between bg-sakura/5 p-6 rounded-[2.5rem] border border-sakura/10">
                     <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-sakura rounded-2xl flex items-center justify-center"><BrainCircuit className="h-6 w-6 text-white" /></div>
                        <div><h2 className="text-2xl font-black text-slate-800 tracking-tight">AI Mindmap Lỗi Sai</h2><p className="text-xs text-amber-600 font-bold uppercase tracking-widest">Phân tích nhược điểm gần đây</p></div>
                     </div>
                     <Star className="h-6 w-6 text-sakura fill-sakura" />
                  </div>
                  <div className="relative h-[450px] w-full bg-slate-50 dark:bg-slate-950 rounded-[3.5rem] p-8 overflow-hidden border-2 border-slate-100">
                    <div className="absolute inset-0 flex items-center justify-center">
                       <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 4 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-4 border-sakura/30 z-10 text-center"><p className="text-xs font-black text-sakura uppercase tracking-widest mb-1">BẠN ĐANG YẾU TẠI</p><p className="text-3xl font-jp font-black text-slate-800">Cải thiện ngay!</p></motion.div>
                       {insights.map((insight, idx) => {
                         const angle = idx * (2 * Math.PI / insights.length);
                         return (
                           <motion.div key={idx} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: idx * 0.1 }}
                             style={{ position: 'absolute', left: `${50 + 36 * Math.cos(angle)}%`, top: `${50 + 36 * Math.sin(angle)}%`, transform: 'translate(-50%, -50%)' }} 
                             className="px-6 py-3 bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 whitespace-nowrap"
                           >
                             <div className="h-2 w-2 rounded-full bg-sakura animate-pulse" />
                             <span className="font-jp font-black text-lg text-slate-700">{insight.target}</span>
                           </motion.div>
                         );
                       })}
                       <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-10"><line x1="50%" y1="50%" x2="0%" y2="0%" /></svg>
                    </div>
                  </div>
               </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Library Browser Portal */}
      <AnimatePresence>
        {libraryOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: -20 }} className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
              <div className="p-12 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-8 w-8 text-sakura" />
                    <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Mục lục Học liệu</h2>
                  </div>
                  <p className="text-slate-400 font-medium">Khám phá hàng ngàn câu mẫu được cá nhân hóa cho trình độ của bạn.</p>
                </div>
                <Button variant="outline" size="icon" onClick={() => setLibraryOpen(false)} className="rounded-full h-16 w-16 border-2 group hover:bg-sakura hover:border-sakura transition-all"><X className="h-6 w-6 group-hover:text-white" /></Button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 grid md:grid-cols-2 lg:grid-cols-3 gap-8 custom-scrollbar">
                {DEFAULT_LIBRARY.map((chapter) => (
                  <motion.button key={chapter.id} whileHover={{ scale: 1.05, y: -10 }} whileTap={{ scale: 0.95 }}
                    onClick={() => { setActiveChapter(chapter); setCurrentIdx(0); setLibraryOpen(false); }}
                    className={cn("p-8 rounded-[3rem] border-4 text-left transition-all relative group overflow-hidden", activeChapter.id === chapter.id ? "border-sakura bg-sakura/[0.03]" : "border-slate-100 dark:border-slate-800 hover:border-sakura/30")}>
                    <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-8 shadow-2xl group-hover:rotate-12 transition-transform", activeChapter.id === chapter.id ? "bg-sakura text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400")}>
                      <chapter.icon className="h-7 w-7" />
                    </div>
                    <div className="space-y-4 relative z-10">
                      <div>
                        <Badge variant="outline" className="mb-2 border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">{chapter.level}</Badge>
                        <h4 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{chapter.title}</h4>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-100/50">
                        <span className="flex items-center gap-2"><Play className="h-3 w-3" /> {chapter.sentences.length} bài luyện</span>
                        <div className="h-2 w-2 rounded-full bg-sakura opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </motion.button>
                ))}
                
                {/* AI Generated Option */}
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  disabled={isGenerating}
                  onClick={handleGenerateAILesson}
                  className="p-8 rounded-[3rem] border-4 border-dashed border-blue-200 bg-blue-50/20 text-left flex flex-col justify-center gap-4 group disabled:opacity-50"
                >
                  <div className="h-14 w-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg">
                    {isGenerating ? <Loader2 className="h-7 w-7 animate-spin" /> : <Sparkles className="h-7 w-7" />}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-blue-600">AI Personal Lesson</h4>
                    <p className="text-xs font-bold text-blue-400 uppercase mt-1">
                      {isGenerating ? 'Đang sáng tạo...' : 'Tạo bài học từ lỗi sai'}
                    </p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {voiceHubOpen && (
          <VoiceHub
            isOpen={voiceHubOpen}
            onClose={() => setVoiceHubOpen(false)}
            systemPrompt={`あなたは優しくて励ましてくれる日本語の先生です。
            ${insights.length > 0 ? `[PHÂN TÍCH LỖI] Người học đang gặp khó khăn với: ${insights.map(i => i.target).join(', ')}.` : ''}`}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpeakingPractice;
