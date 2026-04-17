import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones, MessageSquare, Users, Mic, MicOff, Volume2, Send,
  Loader2, Trash2, VolumeX, Play, RotateCcw, ChevronRight,
  Target, Clock, Music, Zap, CheckCircle2, AlertCircle, Radio,
  Sparkles, Star, History, BrainCircuit
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigation } from '@/components/Navigation';
import { PersonaSelector, PersonaId, PERSONAS } from '@/components/chat/PersonaSelector';
import { VoiceHub } from '@/components/chat/VoiceHub';
import { VoiceVisualizer } from '@/components/chat/VoiceVisualizer';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useTTS } from '@/hooks/useTTS';
import { useKanaInput, KanaMode } from '@/hooks/useKanaInput';
import { useKanjiLookup } from '@/hooks/useKanjiLookup';
import { useXP } from '@/hooks/useXP';
import { useFlashcardFolders } from '@/hooks/useFlashcardFolders';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useAI } from '@/contexts/AIContext';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { toast as sonnerToast } from 'sonner';
};

export default SpeakingPractice;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  translation?: string;
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
  details: { word: string; status: 'correct' | 'incorrect' | 'missing' | 'extra'; expected?: string }[];
}

type PracticeMode = 'shadowing' | 'question' | 'roleplay';

const PRACTICE_SENTENCES: PracticeSentence[] = [
  { id: '1', japanese: 'おはようございます', reading: 'ohayou gozaimasu', vietnamese: 'Chào buổi sáng', difficulty: 'easy', pitch: 'LHHHHHHH' },
  { id: '2', japanese: 'ありがとうございます', reading: 'arigatou gozaimasu', vietnamese: 'Cảm ơn nhiều', difficulty: 'easy' },
  { id: '3', japanese: 'すみません', reading: 'sumimasen', vietnamese: 'Xin lỗi / Xin phép', difficulty: 'easy' },
  { id: '4', japanese: 'お元気ですか', reading: 'o genki desu ka', vietnamese: 'Bạn khỏe không?', difficulty: 'easy' },
  { id: '5', japanese: '私の名前は田中です', reading: 'watashi no namae wa tanaka desu', vietnamese: 'Tôi tên là Tanaka', difficulty: 'medium' },
  { id: '6', japanese: '日本語を勉強しています', reading: 'nihongo o benkyou shite imasu', vietnamese: 'Tôi đang học tiếng Nhật', difficulty: 'medium' },
  { id: '7', japanese: '明日は何をしますか', reading: 'ashita wa nani o shimasu ka', vietnamese: 'Ngày mai bạn làm gì?', difficulty: 'medium' },
  { id: '8', japanese: '東京へ行ったことがありますか', reading: 'toukyou e itta koto ga arimasu ka', vietnamese: 'Bạn đã từng đến Tokyo chưa?', difficulty: 'hard' },
  { id: '9', japanese: 'もう少しゆっくり話してください', reading: 'mou sukoshi yukkuri hanashite kudasai', vietnamese: 'Xin hãy nói chậm hơn', difficulty: 'hard' },
  { id: '10', japanese: '日本の文化にとても興味があります', reading: 'nihon no bunka ni totemo kyoumi ga arimasu', vietnamese: 'Tôi rất quan tâm đến văn hóa Nhật', difficulty: 'hard' },
];

const QUESTION_PROMPTS = [
  { japanese: '好きな食べ物は何ですか？', vietnamese: 'Món ăn yêu thích của bạn là gì?' },
  { japanese: '週末は何をしますか？', vietnamese: 'Cuối tuần bạn làm gì?' },
  { japanese: '日本語をどのくらい勉強していますか？', vietnamese: 'Bạn học tiếng Nhật bao lâu rồi?' },
  { japanese: 'どこに住んでいますか？', vietnamese: 'Bạn sống ở đâu?' },
  { japanese: '趣味は何ですか？', vietnamese: 'Sở thích của bạn là gì?' },
];

const SCENARIOS = [
  { id: '1', title: 'Tại Nhà hàng', prompt: 'You are a waiter in a Japanese restaurant.' },
  { id: '2', title: 'Hỏi đường', prompt: 'You are a polite passerby helping someone find Shinjuku Station.' },
  { id: '3', title: 'Phỏng vấn xin việc', prompt: 'You are a manager interviewing for a part-time job.' },
  { id: '4', title: 'Cửa hàng tiện lợi', prompt: 'You are a Konbini staff.' },
  { id: '5', title: 'Trò chuyện tự do', prompt: 'You are a friendly Japanese language exchange partner.' },
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
    { role: 'assistant', content: 'こんにちは！日本語で話しましょう。', translation: 'Xin chào! Hãy nói chuyện bằng tiếng Nhật.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
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
  const { analyzeText } = useAI();
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('sensei');
  const { isRecording: isAudioRecording, audioUrl, startRecording: startAudio, stopRecording: stopAudio, playRecording } = useAudioRecorder();

  const { isListening: isRecording, startListening: startSTT, stopListening: stopSTT, isSupported: sttSupported } = useSpeechRecognition({
    lang: 'ja-JP',
    continuous: true,
    onResult: (res) => {
      if (activeMode === 'roleplay') setMessage(res);
      else setRecognizedText(res);
    }
  });

  const startPractice = () => { setRecognizedText(''); setScoreResult(null); startSTT(); startAudio(); };
  const stopPractice = () => { stopSTT(); stopAudio(); };

  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('pronunciation_results').select('score, created_at').eq('user_id', user.id);
      if (data) setStats({ total: data.length, average: data.length > 0 ? Math.round(data.reduce((s, r) => s + r.score, 0) / data.length) : 0, today: data.filter(r => r.created_at.startsWith(today)).length });
    } catch {}
  }, [user]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation]);
  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);
  useEffect(() => { if (user) loadStats(); }, [user, loadStats]);

  const localSuggestions = getKanjiSuggestions(message);
  const allSuggestions: KanjiSuggestion[] = [
    ...localSuggestions.map(s => ({ ...s, source: 'local' })),
    ...(apiSuggestions || []).filter((api: any) => !localSuggestions.some(l => l.kanji === api.kanji))
  ];
  useEffect(() => {
    if (message.length >= 2 && localSuggestions.length === 0 && !isLoading) lookupKanji(message);
    else if (message.length < 2) clearSuggestions();
  }, [message, localSuggestions.length, isLoading, lookupKanji, clearSuggestions]);

  const calculateDetailedScores = useCallback((original: string, recognized: string): ScoreResult => {
    const norm = (t: string) => t.replace(/[\s、。！？]+/g, '').toLowerCase();
    const oArr = norm(original).split('');
    const rArr = norm(recognized).split('');
    let correct = 0;
    const details = oArr.map((char, idx) => {
      const match = rArr.slice(Math.max(0, idx - 2), idx + 3).includes(char);
      if (match) correct++;
      return { word: char, status: (match ? 'correct' : 'incorrect') as 'correct' | 'incorrect' };
    });
    const acc = Math.round((correct / Math.max(oArr.length, 1)) * 100);
    const over = Math.round(acc * 0.6 + 40);
    return { accuracy: acc, duration: 90, rhythm: 85, fluency: 80, overall: over, feedback: over >= 80 ? 'Tốt lắm!' : 'Cố gắng lên!', details };
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
        awardXP('speaking', 25 + (combo + 1) * 5);
        sonnerToast.success(`Combo x${combo + 1}! +${25 + (combo + 1) * 5} XP`);
      } else { setCombo(0); awardXP('speaking', 10); }
      setScoreResult(scores); loadStats();
    } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
    finally { setIsAnalyzing(false); }
  };

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: message };
    setConversation(prev => [...prev, userMsg]); setMessage(''); setIsLoading(true);
    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [...conversation, userMsg].map(m => ({ role: m.role, content: m.content })), systemPrompt: `${activeScenario.prompt} ${PERSONAS.find(p => p.id === selectedPersona)?.systemPrompt}` })
      });
      if (!response.ok) throw new Error();
      const reader = response.body?.getReader(); if (!reader) return;
      const decoder = new TextDecoder(); let content = '';
      setConversation(prev => [...prev, { role: 'assistant', content: '' }]);
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const json = line.slice(6); if (json === '[DONE]') break;
          try { const c = JSON.parse(json).choices[0].delta.content; if (c) { content += c; setConversation(prev => { const u = [...prev]; if (u[u.length-1].role === 'assistant') u[u.length-1].content = content; return u; }); } } catch {}
        }
      }
      if (ttsSupported) speak(content);
    } catch { toast({ title: 'Lỗi' }); } finally { setIsLoading(false); }
  };

  const getKanaModeLabel = (mode: KanaMode) => mode === 'hiragana' ? 'あ' : mode === 'katakana' ? 'ア' : 'A';

  const ScoreDisplay = ({ result }: { result: ScoreResult }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-bold text-slate-800 dark:text-white">{result.feedback}</p>
        <span className="text-3xl font-black text-[#f06292]">{result.overall}%</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[{ label: 'Phát âm', val: result.accuracy }, { label: 'Trường âm', val: result.duration }, { label: 'Nhịp điệu', val: result.rhythm }, { label: 'Độ mượt', val: result.fluency }].map((s, i) => (
          <div key={i} className="text-center space-y-1">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${s.val}%` }} className="h-full bg-[#f06292]" /></div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className="text-sm font-bold text-slate-700 dark:text-white">{s.val}%</p>
          </div>
        ))}
      </div>
      {result.details.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
          {result.details.map((d, i) => (
            <span key={i} className={cn('font-jp text-sm px-2 py-0.5 rounded-lg', d.status === 'correct' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500')}>{d.word}</span>
          ))}
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      <main className="max-w-5xl mx-auto py-10 px-4 space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Mic className="h-8 w-8 text-[#f06292]" /> Luyện nói AI
            </h1>
            <p className="text-muted-foreground mt-1">Làm chủ kỹ năng nói tiếng Nhật với AI Sensei.</p>
          </div>
          <div className="flex ga