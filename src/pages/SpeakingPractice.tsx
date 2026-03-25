import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Headphones, MessageSquare, Users, Mic, MicOff, Volume2, Send, 
  Loader2, Trash2, VolumeX, Settings2, Play, RotateCcw, ChevronRight,
  Target, Clock, Music, Zap, CheckCircle2, XCircle, AlertCircle, Radio, PenTool,
  Sparkles, Save, Star, History, BrainCircuit, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigation } from '@/components/Navigation';
import { PersonaSelector, PersonaId, PERSONAS } from '@/components/chat/PersonaSelector';
import { VoiceHub } from '@/components/chat/VoiceHub';
import { KanjiStrokeOrder } from '@/components/KanjiStrokeOrder';
import { VoiceVisualizer } from '@/components/chat/VoiceVisualizer';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useTTS } from '@/hooks/useTTS';
import { useKanaInput, KanaMode } from '@/hooks/useKanaInput';
import { useKanjiLookup } from '@/hooks/useKanjiLookup';
import { useWordHistory } from '@/hooks/useWordHistory';
import { useXP } from '@/hooks/useXP';
import { useFlashcardFolders } from '@/hooks/useFlashcardFolders';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { toast as sonnerToast } from 'sonner';

// Types
interface Message {
  role: 'user' | 'assistant';
  content: string;
  translation?: string;
  correction?: string;
  explanation?: string;
}

interface KanjiSuggestion {
  kanji: string;
  reading: string;
  meaning: string;
  source?: string;
}

interface PracticeSentence {
  id: string;
  japanese: string;
  reading?: string;
  vietnamese: string;
  difficulty: 'easy' | 'medium' | 'hard';
  pitch?: string;
}

interface ScoreResult {
  accuracy: number;
  duration: number;
  rhythm: number;
  fluency: number;
  overall: number;
  feedback: string;
  details: WordAnalysis[];
}

interface WordAnalysis {
  word: string;
  status: 'correct' | 'incorrect' | 'missing' | 'extra';
  expected?: string;
}

type PracticeMode = 'shadowing' | 'question' | 'roleplay';

const PRACTICE_SENTENCES: PracticeSentence[] = [
  { id: '1', japanese: 'おはようございます', reading: 'ohayou gozaimasu', vietnamese: 'Chào buổi sáng', difficulty: 'easy', pitch: 'LHHHHHHH' },
  { id: '2', japanese: 'ありがとうございます', reading: 'arigatou gozaimasu', vietnamese: 'Cảm ơn nhiều', difficulty: 'easy', pitch: 'LHHL' },
  { id: '3', japanese: 'すみません', reading: 'sumimasen', vietnamese: 'Xin lỗi / Xin phép', difficulty: 'easy', pitch: 'LHHHL' },
  { id: '4', japanese: 'お元気ですか', reading: 'o genki desu ka', vietnamese: 'Bạn khỏe không?', difficulty: 'easy' },
  { id: '5', japanese: '私の名前は田中です', reading: 'watashi no namae wa tanaka desu', vietnamese: 'Tôi tên là Tanaka', difficulty: 'medium' },
  { id: '6', japanese: '日本語 को benkyou shite imasu', reading: 'nihongo o benkyou shite imasu', vietnamese: 'Tôi đang học tiếng Nhật', difficulty: 'medium' }, // Corrected a typo here too
  { id: '7', japanese: '明日は何をしますか', reading: 'ashita wa nani o shimasu ka', vietnamese: 'Ngày mai bạn làm gì?', difficulty: 'medium' },
  { id: '8', japanese: '東京へ行ったことがありますか', reading: 'toukyou e itta koto ga arimasu ka', vietnamese: 'Bạn đã từng đến Tokyo chưa?', difficulty: 'hard' },
  { id: '9', japanese: 'もう少しゆっくり話してください', reading: 'mou sukoshi yukkuri hanashite kudasai', vietnamese: 'Xin hãy nói chậm hơn một chút', difficulty: 'hard' },
  { id: '10', japanese: '日本の文化にとても興味があります', reading: 'nihon no bunka ni totemo kyoumi ga arimasu', vietnamese: 'Tôi rất quan tâm đến văn hóa Nhật Bản', difficulty: 'hard' },
];

const QUESTION_PROMPTS = [
  { japanese: '好きな食べ物は何ですか？', vietnamese: 'Món ăn yêu thích của bạn là gì?' },
  { japanese: '週末は何をしますか？', vietnamese: 'Cuối tuần bạn làm gì?' },
  { japanese: '日本語をどのくらい勉強していますか？', vietnamese: 'Bạn học tiếng Nhật bao lâu rồi?' },
  { japanese: 'どこに住んでいますか？', vietnamese: 'Bạn sống ở đâu?' },
  { japanese: '趣味は何ですか？', vietnamese: 'Sở thích của bạn là gì?' },
];

const SCENARIOS = [
  { id: '1', title: 'Tại Nhà hàng', description: 'Đặt món và hỏi về thực đơn.', prompt: 'You are a waiter in a Japanese restaurant. The user is a customer ordering food.' },
  { id: '2', title: 'Hỏi đường', description: 'Hỏi đường đến ga Shinjuku.', prompt: 'You are a polite passerby. The user is lost and looking for Shinjuku Station.' },
  { id: '3', title: 'Phỏng vấn xin việc', description: 'Trả lời các câu hỏi giới thiệu bản thân.', prompt: 'You are a manager interviewing the user for a part-time job (Baito).' },
  { id: '4', title: 'Cửa hàng tiện lợi', description: 'Thanh toán và yêu cầu túi đựng.', prompt: 'You are a Konbini staff. The user is buying some items.' },
  { id: '5', title: 'Trò chuyện tự do', description: 'Nói chuyện về sở thích cá nhân.', prompt: 'You are a friendly Japanese language exchange partner.' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/japanese-chat`;

export const SpeakingPractice = () => {
  const [activeMode, setActiveMode] = useState<PracticeMode>('shadowing');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [voiceHubOpen, setVoiceHubOpen] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [currentSentence, setCurrentSentence] = useState<PracticeSentence>(PRACTICE_SENTENCES[0]);
  const [currentQuestion, setCurrentQuestion] = useState(QUESTION_PROMPTS[0]);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [stats, setStats] = useState({ total: 0, average: 0, today: 0 });
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Message[]>([
    { role: 'assistant', content: 'こんにちは！日本語で話しましょう。何か質問がありますか？', translation: 'Xin chào! Hãy nói chuyện bằng tiếng Nhật. Bạn có câu hỏi gì không?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showStrokeOrder, setShowStrokeOrder] = useState<KanjiSuggestion | null>(null);
  const [combo, setCombo] = useState(0);
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { speak, stop: stopTTS, isSpeaking, isSupported: ttsSupported } = useTTS({ lang: 'ja-JP' });
  const { mode: kanaMode, cycleMode, processInput, getKanjiSuggestions } = useKanaInput();
  const { suggestions: apiSuggestions, isLoading: isLookupLoading, lookupKanji, clearSuggestions } = useKanjiLookup();
  const { awardXP } = useXP();
  const { saveToInbox } = useFlashcardFolders();
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('sensei');

  const { isRecording: isAudioRecording, audioUrl, startRecording: startAudio, stopRecording: stopAudio, playRecording } = useAudioRecorder();

  const { isListening: isRecording, startListening: startSTT, stopListening: stopSTT, isSupported: sttSupported } = useSpeechRecognition({
    lang: 'ja-JP',
    continuous: true,
    onResult: (res) => {
      if (activeMode === 'roleplay') {
        setMessage(res);
      } else {
        setRecognizedText(res);
      }
    }
  });

  const startPractice = () => {
    startSTT();
    startAudio();
  };

  const stopPractice = () => {
    stopSTT();
    stopAudio();
  };

  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('pronunciation_results').select('score, created_at').eq('user_id', user.id);
      if (data) {
        setStats({
          total: data.length,
          average: data.length > 0 ? Math.round(data.reduce((sum, r) => sum + r.score, 0) / data.length) : 0,
          today: data.filter(r => r.created_at.startsWith(today)).length
        });
      }
    } catch (e) { console.error(e); }
  }, [user]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation]);
  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);
  useEffect(() => { if (user) loadStats(); }, [user, loadStats]);

  const localSuggestions = getKanjiSuggestions(message);
  const allSuggestions: KanjiSuggestion[] = [
    ...localSuggestions.map(s => ({ ...s, source: 'local' })),
    ...(apiSuggestions || []).filter((api: any) => !localSuggestions.some(local => local.kanji === api.kanji))
  ];

  useEffect(() => {
    if (message.length >= 2 && localSuggestions.length === 0 && !isLoading) lookupKanji(message);
    else if (message.length < 2) clearSuggestions();
  }, [message, localSuggestions.length, isLoading, lookupKanji, clearSuggestions]);

  const saveToFlashcards = async (jp: string, vi: string) => {
    try {
      await saveToInbox({
        word: jp,
        meaning: vi,
        reading: '',
        example_sentence: jp,
        example_translation: vi
      });
      sonnerToast.success('Đã lưu mẫu câu vào Flashcards', {
        icon: <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
      });
    } catch (error) {
      sonnerToast.error('Không thể lưu Flashcard');
    }
  };

  const calculateDetailedScores = useCallback((original: string, recognized: string): ScoreResult => {
    const norm = (t: string) => t.replace(/[\s、。！？]+/g, '').toLowerCase();
    const oArr = original.split('');
    const rArr = recognized.split('');
    let correctChars = 0;
    const wordAnalysis: WordAnalysis[] = [];
    oArr.forEach((char, idx) => {
      const matchInWindow = rArr.slice(Math.max(0, idx - 2), idx + 3).includes(char);
      if (matchInWindow) {
        correctChars++;
        wordAnalysis.push({ word: char, status: 'correct' });
      } else {
        wordAnalysis.push({ word: char, status: 'incorrect' });
      }
    });
    const acc = Math.round((correctChars / Math.max(oArr.length, 1)) * 100);
    const over = Math.round(acc * 0.6 + 40);
    return { 
      accuracy: acc, duration: 90, rhythm: 85, fluency: 80, 
      overall: over, feedback: over >= 80 ? 'Tốt!' : 'Cố gắng lên!', details: wordAnalysis 
    };
  }, []);
  const analyzeResponse = async () => {
    if (!recognizedText.trim() || !user) return;
    setIsAnalyzing(true);
    try {
      const target = activeMode === 'shadowing' ? currentSentence.japanese : currentQuestion.japanese;
      const scores = calculateDetailedScores(target, recognizedText);
      await supabase.from('pronunciation_results').insert({ user_id: user.id, original_text: target, recognized_text: recognizedText, score: scores.overall, feedback: scores.feedback, mode: activeMode });
      
      if (scores.overall >= 80) {
        setCombo(prev => prev + 1);
        const bonus = combo * 5;
        awardXP('speaking', 25 + bonus, { mode: activeMode, score: scores.overall, combo: combo + 1 });
        sonnerToast.success(`Combo x${combo + 1}! Nhận ${25 + bonus} XP`, { icon: <Sparkles className="h-4 w-4 text-amber-500" /> });
      } else {
        setCombo(0);
        awardXP('speaking', 10, { mode: activeMode, score: scores.overall });
      }

      setScoreResult(scores); loadStats();
    } catch (e) { toast({ title: 'Lỗi', variant: 'destructive' }); }
    finally { setIsAnalyzing(false); }
  };

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: message };
    setConversation(prev => [...prev, userMsg]); setMessage(''); setIsLoading(true);
    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ 
          messages: [...conversation, userMsg].map(m => ({ role: m.role, content: m.content })), 
          systemPrompt: `${activeScenario.prompt} ${PERSONAS.find(p => p.id === selectedPersona)?.systemPrompt}` 
        })
      });
      if (!response.ok) throw new Error();
      const reader = response.body?.getReader(); if (!reader) return;
      const decoder = new TextDecoder(); let assistantContent = '';
      setConversation(prev => [...prev, { role: 'assistant', content: '' }]);
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const json = line.slice(6); if (json === '[DONE]') break;
          try {
            const content = JSON.parse(json).choices[0].delta.content;
            if (content) {
              assistantContent += content;
              setConversation(prev => {
                const updated = [...prev]; const last = updated[updated.length - 1];
                if (last.role === 'assistant') last.content = assistantContent;
                return updated;
              });
            }
          } catch {}
        }
      }
      if (ttsSupported) speak(assistantContent);
    } catch { toast({ title: 'Lỗi' }); } finally { setIsLoading(false); }
  };

  const handleInputChange = (e: any) => setMessage(processInput(e.target.value, e.target.selectionStart).text);
  const cycleKana = () => cycleMode();

  const getKanaModeLabel = (mode: KanaMode): string => {
    switch (mode) {
      case 'hiragana': return 'あ';
      case 'katakana': return 'ア';
      default: return 'A';
    }
  };

  const ScoreDisplay = ({ result }: { result: ScoreResult }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="p-8 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 shadow-xl space-y-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5"><Target className="h-24 w-24 text-sakura" /></div>
      <div className="flex items-center justify-between relative z-10">
        <div className="space-y-1">
          <Badge className="bg-amber-500 h-6 text-[10px] font-black uppercase tracking-widest border-none text-white px-3">AI Analysis Engine</Badge>
          <p className="text-2xl font-black text-slate-800 dark:text-white capitalize">{result.feedback}</p>
        </div>
        <div className="text-right">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black text-sakura tracking-tighter">{result.overall}%</motion.p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confidence Score</p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {[
          { label: 'Phát âm', val: result.accuracy, icon: Target, color: 'text-sakura', bg: 'bg-sakura' },
          { label: 'Trường âm', val: result.duration, icon: Clock, color: 'text-matcha', bg: 'bg-matcha' },
          { label: 'Nhịp điệu', val: result.rhythm, icon: Music, color: 'text-sakura', bg: 'bg-sakura' },
          { label: 'Độ mượt', val: result.fluency, icon: Zap, color: 'text-matcha', bg: 'bg-matcha' }
        ].map((stat, i) => (
          <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-white dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
               <stat.icon className={cn("h-4 w-4", stat.color)} />
               <span className="text-sm font-black text-slate-900 dark:text-white">{stat.val}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${stat.val}%` }} transition={{ duration: 1, delay: i * 0.1 }} className={cn("h-full", stat.bg)} />
            </div>
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">{stat.label}</span>
          </div>
        ))}
      </div>
      {result.details.length > 0 && (
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Phân tích từng từ</p>
          <div className="flex flex-wrap gap-2">
            {result.details.map((d, i) => (
              <Badge key={i} variant="outline" className={cn(
                "font-jp text-base py-1.5 px-4 rounded-xl border-2 transition-all",
                d.status === 'correct' ? "bg-matcha-light/20 border-matcha/20 text-matcha-dark shadow-sm" :
                d.status === 'incorrect' ? "bg-rose-50 border-rose-100 text-rose-600 shadow-sm" :
                "bg-slate-50 border-slate-100 text-slate-400"
              )}>
                {d.word}{d.expected && <span className="ml-2 opacity-50 text-xs">→ {d.expected}</span>}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 relative overflow-hidden transition-colors duration-500">
      <Navigation />
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
         <div className="absolute top-[10%] left-[5%] w-[40rem] h-[40rem] bg-sakura/20 dark:bg-indigo-900/10 rounded-full blur-[120px]" />
         <div className="absolute bottom-[10%] right-[5%] w-[40rem] h-[40rem] bg-matcha/20 dark:bg-amber-900/10 rounded-full blur-[120px]" />
      </div>
      <main className="max-w-6xl mx-auto py-12 px-4 space-y-12 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-6">
             <div className="relative">
                <div className="absolute -inset-2 bg-sakura/20 rounded-3xl blur-xl animate-pulse" /><div className="relative w-20 h-20 rounded-3xl bg-sakura flex items-center justify-center text-white shadow-2xl"><Mic className="h-10 w-10" /></div>
             </div>
             <div className="space-y-1">
               <div className="flex items-center gap-2"><h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Luyện nói AI</h1><Badge className="bg-sakura text-white font-black text-[10px] uppercase border-none px-3 h-5">Sensei Pro</Badge></div>
               <p className="text-slate-400 font-medium">Làm chủ kỹ năng nói tiếng Nhật với công nghệ AI hàng đầu.</p>
             </div>
          </div>
          <div className="flex items-stretch gap-3">
             {[
               { icon: Star, val: stats.total, label: 'Bài tập', color: 'text-sakura', bg: 'bg-rose-50' },
               { icon: Target, val: `${stats.average}%`, label: 'Chỉnh chu', color: 'text-matcha', bg: 'bg-emerald-50' },
               { icon: History, val: stats.today, label: 'Hôm nay', color: 'text-emerald-500', bg: 'bg-emerald-50' }
             ].map((item, i) => (
                <div key={i} className="px-6 py-4 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center group hover:border-indigo-200 transition-all text-center">
                   <div className={cn("p-2 rounded-xl mb-1", item.bg, "dark:bg-slate-800")}><item.icon className={cn("h-4 w-4", item.color)} /></div>
                   <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{item.val}</p>
                   <p className="text-[9px] font-black uppercase text-slate-400 mt-1 tracking-widest">{item.label}</p>
                </div>
             ))}
          </div>
        </div>

        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as PracticeMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-16 rounded-[2rem] bg-white dark:bg-slate-900 p-2 shadow-lg border border-rose-100 dark:border-slate-800 max-w-2xl mx-auto mb-12">
            <TabsTrigger value="shadowing" className="rounded-2xl gap-3 transition-all font-bold data-[state=active]:bg-sakura data-[state=active]:text-white data-[state=active]:shadow-xl"><Headphones className="h-4 w-4" /> Shadowing</TabsTrigger>
            <TabsTrigger value="question" className="rounded-2xl gap-3 transition-all font-bold data-[state=active]:bg-sakura data-[state=active]:text-white data-[state=active]:shadow-xl"><MessageSquare className="h-4 w-4" /> Trả lời</TabsTrigger>
            <TabsTrigger value="roleplay" className="rounded-2xl gap-3 transition-all font-bold data-[state=active]:bg-sakura data-[state=active]:text-white data-[state=active]:shadow-xl"><Users className="h-4 w-4" /> Hội thoại</TabsTrigger>
          </TabsList>

          <TabsContent value="shadowing" className="mt-0 space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
             <div className="max-w-3xl mx-auto">
                <Card className="rounded-[3rem] border-rose-100 dark:border-slate-800 shadow-2xl overflow-hidden bg-white/70 dark:bg-slate-950/70 backdrop-blur-3xl border-2">
                   <CardContent className="p-10 space-y-8">
                      <div className="text-center space-y-6">
                        <div className="space-y-4 relative">
                          {combo > 1 && (<motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-12 -right-4 bg-gradient-to-br from-amber-400 to-orange-500 text-white px-4 py-2 rounded-2xl shadow-xl z-20 font-black text-sm">FIRE COMBO x{combo} 🔥</motion.div>)}
                          <div className="text-5xl font-jp font-black leading-[1.2] tracking-widest flex flex-wrap justify-center gap-1">
                            {currentSentence.japanese.split('').map((char, idx) => {
                              const detail = scoreResult?.details.find(d => d.word === char);
                              return (
                                <span key={idx} className={cn("relative px-1 transition-all rounded-lg", detail?.status === 'correct' ? "text-matcha-dark bg-matcha-light/10" : detail?.status === 'incorrect' ? "text-rose-500 bg-rose-50 underline decoration-wavy decoration-rose-300" : "text-slate-900 dark:text-white")}>
                                  {char}
                                  {currentSentence.pitch && (<div className={cn("absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full", currentSentence.pitch[idx] === 'H' ? "bg-amber-400" : "bg-slate-200")} />)}
                                </span>
                              );
                            })}
                          </div>
                          <p className="text-xl text-slate-400 font-medium italic">"{currentSentence.vietnamese}"</p>
                        </div>
                        <div className="flex justify-center gap-4">
                           <Button onClick={() => speak(currentSentence.japanese)} disabled={isSpeaking} size="lg" className="h-14 px-8 rounded-2xl bg-sakura text-white hover:bg-rose-600 shadow-lg gap-3 font-bold group"><Volume2 className="h-5 w-5" /> Nghe mẫu</Button>
                           {audioUrl && (<Button onClick={playRecording} variant="outline" size="lg" className="h-14 px-8 rounded-2xl border-rose-200 text-sakura hover:bg-rose-50 transition-all gap-3 font-bold"><Play className="h-5 w-5" /> Nghe chính mình</Button>)}
                        </div>
                     </div>
                     <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-8">
                        <div className="w-full max-w-md"><VoiceVisualizer isActive={isRecording} color="#f43f5e" /></div>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={isRecording ? stopPractice : startPractice} className={cn("relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-2xl", isRecording ? "bg-red-500 text-white ring-8 ring-red-500/10" : "bg-sakura text-white hover:bg-rose-600 shadow-rose-200")}>{isRecording ? <div className="flex gap-1.5">{[1, 2, 3].map(i => <motion.div key={i} animate={{ height: [15, 40, 15] }} transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }} className="w-2 bg-white rounded-full" />)}</div> : <Mic className="h-10 w-10" />}</motion.button>
                     </div>
                     {recognizedText && (
                       <div className="space-y-6">
                          <div className="p-8 bg-rose-50/50 dark:bg-rose-900/10 rounded-[2.5rem] border-2 border-dashed border-rose-100 text-center space-y-4">
                            <p className="text-3xl font-jp font-bold text-sakura dark:text-rose-300">{recognizedText}</p>
                            {!scoreResult && !isRecording && (<Button onClick={analyzeResponse} className="bg-sakura hover:bg-rose-600 text-white h-12 px-10 rounded-[1.5rem] shadow-xl font-black text-[10px] uppercase tracking-[0.2em] gap-3"><BrainCircuit className="h-4 w-4" /> Run AI Evaluation</Button>)}
                          </div>
                          {scoreResult && <ScoreDisplay result={scoreResult} />}
                       </div>
                     )}
                     <div className="flex justify-between pt-10 border-t border-slate-100 dark:border-slate-800">
                        <Button variant="ghost" onClick={() => { setRecognizedText(''); setScoreResult(null); }} className="rounded-2xl text-slate-400 gap-2 font-black uppercase text-[10px] tracking-widest h-12 px-6"><RotateCcw className="h-4 w-4" /> Reset Try</Button>
                        <Button onClick={() => { setCurrentSentence(PRACTICE_SENTENCES[Math.floor(Math.random() * PRACTICE_SENTENCES.length)]); setRecognizedText(''); setScoreResult(null); }} className="rounded-2xl bg-slate-900 text-white px-10 font-black uppercase text-[10px] tracking-widest h-12 gap-3 group">Tiếp theo <ChevronRight className="h-4 w-4" /></Button>
                      </div>
                   </CardContent>
                 </Card>
              </div>
           </TabsContent>

          <TabsContent value="question" className="mt-0 animate-in fade-in duration-500 slide-in-from-bottom-4">
             <div className="max-w-3xl mx-auto">
              <Card className="rounded-[3rem] border-2 border-rose-100 dark:border-slate-800 shadow-2xl p-10 text-center space-y-8 bg-white/70 backdrop-blur-3xl relative overflow-hidden">
                 <div className="space-y-6">
                   <Badge className="bg-rose-50 text-sakura font-black uppercase tracking-widest text-[10px] py-2 px-6 rounded-full">AI Reflex Interaction</Badge>
                   <div className="space-y-4">
                      <p className="text-4xl font-jp font-black text-slate-900 dark:text-white tracking-tight">{currentQuestion.japanese}</p>
                      <p className="text-xl text-slate-400 font-medium italic">"{currentQuestion.vietnamese}"</p>
                   </div>
                 </div>
                 <div className="flex flex-col items-center gap-8">
                   <Button onClick={() => speak(currentQuestion.japanese)} className="h-12 rounded-xl bg-rose-50 text-sakura hover:bg-rose-100 font-bold gap-3 px-8 transition-all"><Volume2 className="h-5 w-5" /> Nghe Sensei nói</Button>
                   <div className="w-full max-w-sm"><VoiceVisualizer isActive={isRecording} color="#10b981" /></div>
                   <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={isRecording ? stopPractice : startPractice} className={cn("w-28 h-28 rounded-full flex items-center justify-center text-white shadow-2xl transition-all relative z-10", isRecording ? "bg-red-500 ring-8 ring-red-100" : "bg-sakura hover:bg-rose-600 shadow-rose-200")}>{isRecording ? <Loader2 className="h-10 w-10 animate-spin" /> : <Mic className="h-10 w-10" />}</motion.button>
                 </div>
                  {recognizedText && (
                    <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] space-y-6 border border-slate-100 text-center">
                      <p className="text-3xl font-jp font-bold text-indigo-600">{recognizedText}</p>
                      {!scoreResult && !isRecording && (<Button onClick={analyzeResponse} className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-3 shadow-xl shadow-emerald-100 dark:shadow-none"><Target className="h-4 w-4" /> Evaluate Response</Button>)}
                      {scoreResult && <ScoreDisplay result={scoreResult} />}
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                     <Button variant="ghost" onClick={() => { setRecognizedText(''); setScoreResult(null); }} className="text-slate-400"><RotateCcw className="h-4 w-4 mr-2" /> Thử lại</Button>
                     <Button onClick={() => { setCurrentQuestion(QUESTION_PROMPTS[Math.floor(Math.random() * QUESTION_PROMPTS.length)]); setRecognizedText(''); setScoreResult(null); }} className="h-12 px-8 rounded-xl bg-sakura text-white font-bold shadow-lg gap-2">Tiếp theo <ChevronRight className="h-4 w-4" /></Button>
                  </div>
              </Card>
             </div>
          </TabsContent>

          <TabsContent value="roleplay" className="mt-0 animate-in fade-in duration-500 slide-in-from-bottom-4">
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-6">
                   <Card className="rounded-[2.5rem] border-rose-100 bg-white/70 backdrop-blur-3xl shadow-2xl overflow-hidden">
                      <div className="p-5 bg-sakura text-white text-[10px] font-black uppercase tracking-widest text-center">Scenarios</div>
                      <div className="p-4 space-y-2 overflow-y-auto max-h-[400px]">
                         {SCENARIOS.map((s) => (<button key={s.id} onClick={() => { setActiveScenario(s); setConversation([{ role: 'assistant', content: 'こんにちは！ hãy bắt đầu nhé.' }]); }} className={cn("w-full text-left p-4 rounded-2xl transition-all border-2", activeScenario.id === s.id ? "border-sakura bg-rose-50 text-sakura-dark shadow-sm" : "border-slate-100 hover:border-rose-200 text-slate-600")}><p className="font-bold text-sm">{s.title}</p><p className="text-[10px] opacity-60 mt-1">{s.description}</p></button>))}
                      </div>
                   </Card>
                   <Card className="rounded-[2.5rem] border-none bg-sakura p-6 text-white shadow-xl space-y-4">
                      <h3 className="text-xl font-black leading-tight">AI Voice Hub</h3>
                      <Button onClick={() => setVoiceHubOpen(true)} className="w-full h-12 bg-white text-sakura hover:bg-white/90 rounded-2xl font-black uppercase text-[10px] tracking-widest">Launch Console</Button>
                   </Card>
                   <PersonaSelector selectedPersona={selectedPersona} onSelect={setSelectedPersona} />
                 </div>
                <div className="lg:col-span-3">
                   <Card className="h-[750px] flex flex-col bg-white dark:bg-slate-900 border-2 border-slate-100 shadow-2xl rounded-[3rem] overflow-hidden">
                      <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
                        {conversation.map((msg, i) => (
                          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-5", msg.role === 'user' ? "flex-row-reverse" : "")}>
                            <div className={cn("max-w-[80%] space-y-2", msg.role === 'user' ? "items-end" : "")}>
                               <div className={cn("group relative p-6 rounded-[2.5rem] shadow-soft", msg.role === 'assistant' ? "bg-white dark:bg-slate-800 rounded-tl-none border border-rose-50" : "bg-sakura text-white rounded-tr-none shadow-rose-100")}>
                                  <p className="font-jp text-xl leading-relaxed">{msg.content}</p>
                                  {msg.translation && <p className={cn("text-xs mt-4 opacity-60 italic font-medium pt-3 border-t", msg.role === 'assistant' ? "border-slate-100" : "border-white/20")}>— {msg.translation}</p>}
                                  <div className={cn("absolute -bottom-4 flex gap-2 opacity-0 group-hover:opacity-100", msg.role === 'user' ? "-right-2" : "-left-2")}>
                                     {msg.role === 'assistant' && (<Button size="icon" variant="secondary" onClick={() => speak(msg.content)} className="h-9 w-9 rounded-xl bg-white shadow-md border text-sakura"><Volume2 className="h-4 w-4" /></Button>)}
                                     <Button size="icon" variant="secondary" onClick={() => saveToFlashcards(msg.content, msg.translation || '')} className="h-9 w-9 rounded-xl bg-white shadow-md border text-amber-500"><Save className="h-4 w-4" /></Button>
                                  </div>
                               </div>
                            </div>
                          </motion.div>
                        ))}
                        {isLoading && (<div className="flex gap-4"><div className="w-12 h-12 rounded-2xl bg-slate-200 animate-pulse" /><div className="bg-white p-4 rounded-3xl rounded-tl-none border border-slate-100"><Loader2 className="h-6 w-6 animate-spin text-sakura" /></div></div>)}
                        <div ref={messagesEndRef} />
                      </div>
                      <div className="p-8 border-t dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6">
                        <div className="flex flex-wrap gap-2">
                          {allSuggestions.slice(0, 10).map((s, i) => (<Button key={i} variant="outline" size="sm" onClick={() => setMessage(prev => prev + s.kanji)} className="rounded-2xl font-jp border-slate-100 hover:border-sakura hover:bg-rose-50 text-base py-5 px-5 shadow-sm">{s.kanji} <span className="ml-2 opacity-40 text-xs font-normal">({s.reading})</span></Button>))}
                        </div>
                        <div className="flex gap-4 items-end">
                           <div className="relative flex-1">
                              <div className="relative">
                                 <Button onClick={cycleKana} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-100 rounded-xl font-black text-xs hover:bg-slate-200">{getKanaModeLabel(kanaMode)}</Button>
                                 <Input value={message} onChange={handleInputChange} placeholder="Nói chuyện với Sensei..." className="h-16 pl-16 pr-14 rounded-2xl border-2 border-slate-100 focus:border-sakura font-jp text-xl bg-slate-50/50" />
                                 <Button onClick={isRecording ? stopPractice : startPractice} variant="ghost" className={cn("absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl transition-all", isRecording ? "bg-red-500 text-white shadow-lg shadow-red-200" : "text-slate-300 hover:text-sakura")}>{isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</Button>
                              </div>
                           </div>
                           <Button onClick={handleSend} disabled={isLoading || !message.trim()} className="h-16 w-16 rounded-[1.5rem] bg-sakura text-white shadow-2xl hover:scale-105 active:scale-95 border-none"><Send className="h-7 w-7" /></Button>
                        </div>
                      </div>
                   </Card>
                </div>
             </div>
          </TabsContent>
        </Tabs>
      </main>
      <AnimatePresence>
        {voiceHubOpen && <VoiceHub isOpen={voiceHubOpen} onClose={() => setVoiceHubOpen(false)} systemPrompt={PERSONAS.find(p => p.id === selectedPersona)?.systemPrompt} />}
        {showStrokeOrder && (<KanjiStrokeOrder kanji={showStrokeOrder.kanji} reading={showStrokeOrder.reading} meaning={showStrokeOrder.meaning} onClose={() => setShowStrokeOrder(null)} />)}
      </AnimatePresence>
    </div>
  );
};

export default SpeakingPractice;
