import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Headphones, MessageSquare, Users, Mic, MicOff, Volume2, Send, 
  Loader2, Trash2, VolumeX, Settings2, Play, RotateCcw, ChevronRight,
  Target, Clock, Music, Zap, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Navigation } from '@/components/Navigation';
import { KanaKeyboard } from '@/components/KanaKeyboard';
import { KanjiSuggestions } from '@/components/KanjiSuggestions';
import { KanjiStrokeOrder } from '@/components/KanjiStrokeOrder';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useTTS, TTSSpeed } from '@/hooks/useTTS';
import { useKanaInput, KanaMode } from '@/hooks/useKanaInput';
import { useKanjiLookup } from '@/hooks/useKanjiLookup';
import { useWordHistory } from '@/hooks/useWordHistory';
import { PersonaSelector, PersonaId, PERSONAS } from '@/components/chat/PersonaSelector';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

// Practice sentences data
const PRACTICE_SENTENCES: PracticeSentence[] = [
  { id: '1', japanese: 'おはようございます', reading: 'ohayou gozaimasu', vietnamese: 'Chào buổi sáng', difficulty: 'easy' },
  { id: '2', japanese: 'ありがとうございます', reading: 'arigatou gozaimasu', vietnamese: 'Cảm ơn nhiều', difficulty: 'easy' },
  { id: '3', japanese: 'すみません', reading: 'sumimasen', vietnamese: 'Xin lỗi / Xin phép', difficulty: 'easy' },
  { id: '4', japanese: 'お元気ですか', reading: 'o genki desu ka', vietnamese: 'Bạn khỏe không?', difficulty: 'easy' },
  { id: '5', japanese: '私の名前は田中です', reading: 'watashi no namae wa tanaka desu', vietnamese: 'Tôi tên là Tanaka', difficulty: 'medium' },
  { id: '6', japanese: '日本語を勉強しています', reading: 'nihongo o benkyou shite imasu', vietnamese: 'Tôi đang học tiếng Nhật', difficulty: 'medium' },
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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/japanese-chat`;

// Speech Recognition setup
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const SpeakingPractice = () => {
  // State
  const [activeMode, setActiveMode] = useState<PracticeMode>('shadowing');
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [currentSentence, setCurrentSentence] = useState<PracticeSentence>(PRACTICE_SENTENCES[0]);
  const [currentQuestion, setCurrentQuestion] = useState(QUESTION_PROMPTS[0]);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [stats, setStats] = useState({ total: 0, average: 0, today: 0 });
  
  // Roleplay chat state
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'こんにちは！日本語で話しましょう。何か質問がありますか？',
      translation: 'Xin chào! Hãy nói chuyện bằng tiếng Nhật. Bạn có câu hỏi gì không?',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showStrokeOrder, setShowStrokeOrder] = useState<KanjiSuggestion | null>(null);
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Hooks
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { speak, stop, isSpeaking, isSupported: ttsSupported, rate, setRate } = useTTS({ lang: 'ja-JP' });
  const { mode: kanaMode, cycleMode, processInput, getKanjiSuggestions } = useKanaInput();
  const { suggestions: apiSuggestions, isLoading: isLookupLoading, lookupKanji, clearSuggestions } = useKanjiLookup();
  const { saveWord } = useWordHistory();
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('sensei');

  // Check auth
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Load stats
  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get total and average
      const { data: allResults } = await supabase
        .from('pronunciation_results')
        .select('score, created_at')
        .eq('user_id', user.id);
      
      if (allResults) {
        const total = allResults.length;
        const average = total > 0 
          ? Math.round(allResults.reduce((sum, r) => sum + r.score, 0) / total)
          : 0;
        const todayCount = allResults.filter(r => 
          r.created_at.startsWith(today)
        ).length;
        
        setStats({ total, average, today: todayCount });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Scroll to bottom in chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Combine local and API suggestions
  const localSuggestions = getKanjiSuggestions(message);
  const allSuggestions: KanjiSuggestion[] = [
    ...localSuggestions.map(s => ({ ...s, source: 'local' })),
    ...apiSuggestions.filter(api => !localSuggestions.some(local => local.kanji === api.kanji)),
  ];

  // Lookup from API when local suggestions are empty
  useEffect(() => {
    if (message.length >= 2 && localSuggestions.length === 0 && !isLoading) {
      lookupKanji(message);
    } else if (message.length < 2) {
      clearSuggestions();
    }
  }, [message, localSuggestions.length, isLoading]);

  // Speech Recognition functions
  const startRecording = useCallback(async () => {
    if (!SpeechRecognition) {
      toast({
        title: 'Không hỗ trợ',
        description: 'Trình duyệt không hỗ trợ nhận diện giọng nói. Vui lòng dùng Chrome/Edge.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP';
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        const fullTranscript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setRecognizedText(fullTranscript);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        switch (event.error) {
          case 'no-speech':
            toast({
              title: 'Không nghe thấy',
              description: 'Không nghe thấy giọng nói. Vui lòng nói to hơn.',
              variant: 'destructive',
            });
            break;
          case 'not-allowed':
            toast({
              title: 'Không có quyền',
              description: 'Vui lòng cấp quyền truy cập microphone.',
              variant: 'destructive',
            });
            break;
          case 'service-not-allowed':
            toast({
              title: 'Dịch vụ không khả dụng',
              description: 'Dịch vụ nhận diện giọng nói không khả dụng.',
              variant: 'destructive',
            });
            break;
        }
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        if (isRecording) {
          // Auto restart if still recording
          try {
            recognition.start();
          } catch (e) {
            setIsRecording(false);
          }
        }
      };
      
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      setRecognizedText('');
      setScoreResult(null);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể bắt đầu ghi âm. Vui lòng kiểm tra microphone.',
        variant: 'destructive',
      });
    }
  }, [isRecording, toast]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // Analyze pronunciation
  const analyzeResponse = useCallback(async () => {
    if (!recognizedText.trim() || !user) return;
    
    setIsAnalyzing(true);
    stopRecording();
    
    try {
      const original = activeMode === 'shadowing' 
        ? currentSentence.japanese 
        : activeMode === 'question' 
          ? currentQuestion.japanese 
          : '';
      
      // Calculate scores
      const scores = calculateDetailedScores(original, recognizedText);
      
      // Save to database
      await supabase.from('pronunciation_results').insert({
        user_id: user.id,
        original_text: original,
        recognized_text: recognizedText,
        score: scores.overall,
        feedback: scores.feedback,
        mode: activeMode,
        accuracy_score: scores.accuracy,
        duration_score: scores.duration,
        rhythm_score: scores.rhythm,
        fluency_score: scores.fluency,
      });
      
      setScoreResult(scores);
      loadStats();
      
    } catch (error) {
      console.error('Error analyzing:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể phân tích kết quả.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [recognizedText, user, activeMode, currentSentence, currentQuestion, stopRecording, toast]);

  // Calculate detailed scores
  const calculateDetailedScores = (original: string, recognized: string): ScoreResult => {
    const normalizeJapanese = (text: string) => 
      text.replace(/\s+/g, '').replace(/[。、！？]/g, '').toLowerCase();
    
    const originalNorm = normalizeJapanese(original);
    const recognizedNorm = normalizeJapanese(recognized);
    
    // Character-level accuracy
    let matchCount = 0;
    const maxLength = Math.max(originalNorm.length, recognizedNorm.length);
    const minLength = Math.min(originalNorm.length, recognizedNorm.length);
    
    for (let i = 0; i < minLength; i++) {
      if (originalNorm[i] === recognizedNorm[i]) matchCount++;
    }
    
    const accuracy = maxLength > 0 ? Math.round((matchCount / maxLength) * 100) : 0;
    
    // Duration score (based on length similarity)
    const lengthRatio = minLength / maxLength;
    const duration = Math.round(lengthRatio * 100);
    
    // Rhythm score (based on syllable patterns)
    const rhythm = Math.round((accuracy + duration) / 2);
    
    // Fluency score (overall flow)
    const fluency = Math.round((accuracy * 0.4 + duration * 0.3 + rhythm * 0.3));
    
    // Overall score
    const overall = Math.round((accuracy * 0.4 + duration * 0.2 + rhythm * 0.2 + fluency * 0.2));
    
    // Generate feedback
    let feedback = '';
    if (overall >= 90) {
      feedback = 'Tuyệt vời! Phát âm rất chuẩn xác. 🎉';
    } else if (overall >= 70) {
      feedback = 'Khá tốt! Hãy chú ý kéo dài các âm dài hơn. 👍';
    } else if (overall >= 50) {
      feedback = 'Cần cải thiện. Hãy nghe lại và chú ý các âm đặc biệt. 💪';
    } else {
      feedback = 'Cần luyện thêm. Hãy nghe kỹ và thử lại từng phần nhỏ. 📚';
    }
    
    // Word-level analysis
    const details = analyzeWords(original, recognized);
    
    return { accuracy, duration, rhythm, fluency, overall, feedback, details };
  };

  const analyzeWords = (original: string, recognized: string): WordAnalysis[] => {
    const originalWords = original.split(/[\s、。！？]+/).filter(Boolean);
    const recognizedWords = recognized.split(/[\s、。！？]+/).filter(Boolean);
    const results: WordAnalysis[] = [];
    
    // Mark matched, incorrect, missing, extra words
    const recognizedUsed = new Set<number>();
    
    originalWords.forEach(word => {
      const foundIdx = recognizedWords.findIndex((rw, idx) => 
        !recognizedUsed.has(idx) && rw === word
      );
      
      if (foundIdx !== -1) {
        recognizedUsed.add(foundIdx);
        results.push({ word, status: 'correct' });
      } else {
        // Try to find similar
        const similarIdx = recognizedWords.findIndex((rw, idx) => 
          !recognizedUsed.has(idx) && (rw.includes(word) || word.includes(rw))
        );
        
        if (similarIdx !== -1) {
          recognizedUsed.add(similarIdx);
          results.push({ word: recognizedWords[similarIdx], status: 'incorrect', expected: word });
        } else {
          results.push({ word, status: 'missing' });
        }
      }
    });
    
    // Mark extra words
    recognizedWords.forEach((word, idx) => {
      if (!recognizedUsed.has(idx)) {
        results.push({ word, status: 'extra' });
      }
    });
    
    return results;
  };

  // Next sentence
  const nextSentence = () => {
    const currentIndex = PRACTICE_SENTENCES.findIndex(s => s.id === currentSentence.id);
    const nextIndex = (currentIndex + 1) % PRACTICE_SENTENCES.length;
    setCurrentSentence(PRACTICE_SENTENCES[nextIndex]);
    setRecognizedText('');
    setScoreResult(null);
  };

  const nextQuestion = () => {
    const currentIndex = QUESTION_PROMPTS.indexOf(currentQuestion);
    const nextIndex = (currentIndex + 1) % QUESTION_PROMPTS.length;
    setCurrentQuestion(QUESTION_PROMPTS[nextIndex]);
    setRecognizedText('');
    setScoreResult(null);
  };

  // Roleplay chat functions
  const parseResponse = (content: string): { japanese: string; translation: string } => {
    const translationMatch = content.match(/\[翻訳\]\s*(.+?)(?:\n|$)/);
    const vietnameseMatch = content.match(/\[Tiếng Việt\]\s*(.+?)(?:\n|$)/i);
    
    let japanese = content;
    let translation = '';
    
    if (translationMatch) {
      japanese = content.replace(/\[翻訳\]\s*.+?(?:\n|$)/, '').trim();
      translation = translationMatch[1].trim();
    } else if (vietnameseMatch) {
      japanese = content.replace(/\[Tiếng Việt\]\s*.+?(?:\n|$)/i, '').trim();
      translation = vietnameseMatch[1].trim();
    }
    
    return { japanese, translation };
  };

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: message };
    setConversation(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    // Get correction for user message in background
    const getCorrection = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('japanese-analysis', {
          body: { 
            prompt: "Please check this Japanese sentence for grammar and naturalness. If it's incorrect or unnatural, provide a correction and a brief explanation in Vietnamese. Content: ", 
            content: message 
          }
        });
        
        if (!error && data.format === 'structured' && data.analysis) {
          const analysis = data.analysis;
          if (analysis.is_incorrect || analysis.suggested_correction) {
            setConversation(prev => prev.map((msg, idx) => {
              if (idx === prev.length - 1 && msg.role === 'user' && msg.content === userMessage.content) {
                return { 
                  ...msg, 
                  correction: analysis.suggested_correction,
                  explanation: analysis.correction_explanation
                };
              }
              return msg;
            }));
          }
        }
      } catch (err) {
        console.error('Error getting correction:', err);
      }
    };
    getCorrection();

    let assistantContent = '';

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...conversation, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt: PERSONAS.find(p => p.id === selectedPersona)?.systemPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      setConversation(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setConversation(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  const { japanese, translation } = parseResponse(assistantContent);
                  updated[updated.length - 1] = {
                    ...last,
                    content: japanese,
                    translation,
                  };
                }
                return updated;
              });
            }
          } catch {
            // Partial JSON, continue
          }
        }
      }

      // Auto-speak response
      if (assistantContent && ttsSupported) {
        const { japanese } = parseResponse(assistantContent);
        speak(japanese);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể gửi tin nhắn.',
        variant: 'destructive',
      });
      setConversation(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    setConversation([
      {
        role: 'assistant',
        content: 'こんにちは！日本語で話しましょう。何か質問がありますか？',
        translation: 'Xin chào! Hãy nói chuyện bằng tiếng Nhật. Bạn có câu hỏi gì không?',
      },
    ]);

  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const selectionStart = e.target.selectionStart || newValue.length;
    const { text } = processInput(newValue, selectionStart);
    setMessage(text);
  };

  const handleKanaKeyPress = (char: string) => {
    setMessage(prev => prev + char);
  };

  const handleKanjiSelect = (kanji: string) => {
    setMessage(kanji);
  };

  const handleViewStrokeOrder = (suggestion: KanjiSuggestion) => {
    setShowStrokeOrder(suggestion);
  };

  const handleSaveFromStrokeOrder = (word: { word: string; reading: string; meaning: string }) => {
    saveWord(word);
    setShowStrokeOrder(null);
  };

  const getKanaModeLabel = (mode: KanaMode): string => {
    switch (mode) {
      case 'hiragana': return 'あ';
      case 'katakana': return 'ア';
      default: return 'A';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const AudioVisualizer = () => (
    <div className="flex items-center gap-1.5 h-10">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ 
            height: [12, 32, 16, 28, 12],
            backgroundColor: ["#ffffff", "#ef4444", "#ffffff"]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 0.8,
            delay: i * 0.1,
            ease: "easeInOut"
          }}
          className="w-1.5 rounded-full bg-white opacity-80"
        />
      ))}
    </div>
  );

  const ScoreDisplay = ({ result }: { result: ScoreResult }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 p-10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-inner"
    >
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Overall Score Circle */}
        <div className="relative">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="60"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-200 dark:text-slate-800"
            />
            <motion.circle
              cx="64"
              cy="64"
              r="60"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={377}
              initial={{ strokeDashoffset: 377 }}
              animate={{ strokeDashoffset: 377 - (377 * result.overall) / 100 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                result.overall >= 90 ? "text-matcha" :
                result.overall >= 70 ? "text-indigo-500" :
                result.overall >= 50 ? "text-amber-500" :
                "text-red-500"
              )}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black">{result.overall}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Score</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 text-center md:text-left">
           <Badge variant="outline" className="border-indigo-600/30 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 font-bold mb-2">
            ĐÁNH GIÁ TỪ SENSEI
          </Badge>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{result.feedback}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kết quả phân tích dựa trên độ chính xác và nhịp điệu phát âm của bạn.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: "Chính xác", val: result.accuracy, icon: Target, color: "text-indigo-500" },
          { label: "Trường âm", val: result.duration, icon: Clock, color: "text-amber-500" },
          { label: "Nhịp điệu", val: result.rhythm, icon: Music, color: "text-indigo-500" },
          { label: "Trôi chảy", val: result.fluency, icon: Zap, color: "text-indigo-600" }
        ].map((stat, i) => (
          <div key={i} className="space-y-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2">
              <stat.icon className={cn("h-4 w-4", stat.color)} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-end justify-between">
                <span className="text-xl font-black">{stat.val}%</span>
              </div>
              <Progress value={stat.val} className="h-1.5" />
            </div>
          </div>
        ))}
      </div>

      {result.details.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chi tiết từng từ</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.details.map((detail, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className={cn(
                  "font-jp text-lg px-4 py-1.5 rounded-xl transition-all border-2 shadow-sm",
                  detail.status === 'correct' && "border-green-500/20 text-green-600 bg-green-50/50 dark:bg-green-900/20",
                  detail.status === 'incorrect' && "border-red-500/20 text-red-600 bg-red-50/50 dark:bg-red-900/20",
                  detail.status === 'missing' && "border-amber-500/20 text-amber-600 bg-amber-50/50 dark:bg-amber-900/20",
                  detail.status === 'extra' && "border-slate-300 text-slate-400 line-through opacity-50 bg-slate-50"
                )}
              >
                {detail.word}
                {detail.expected && (
                  <span className="ml-2 text-sm opacity-50 font-medium">({detail.expected})</span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 relative overflow-hidden">
      {/* Clean Minimalist Background (Matches AITutor/Vocabulary) */}
      <div className="absolute inset-0 bg-slate-50/50 dark:bg-slate-950/50 pointer-events-none z-0" />

      <Navigation />

      <main className="max-w-6xl mx-auto py-8 px-4 md:px-6 space-y-8 relative z-10">
        <div className="flex items-center justify-between pb-6 border-b">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-[11px] font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Vocal Analysis Active
             </div>
             <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider">
               Speaking Pro
             </Badge>
          </div>
          <div className="hidden md:block">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Giao diện Phân tích VIP</p>
          </div>
        </div>
        {/* Header with Stats */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Mic className="h-8 w-8 text-matcha" />
              Luyện Nói
            </h1>
            <p className="text-muted-foreground">
              Luyện phát âm tiếng Nhật với AI
            </p>
          </div>
          
          {/* Stats */}
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-matcha">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Tổng bài</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-sakura">{stats.average}%</p>
              <p className="text-xs text-muted-foreground">Điểm TB</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.today}</p>
              <p className="text-xs text-muted-foreground">Hôm nay</p>
            </div>
          </div>
        </div>

        {/* Mode Tabs */}
        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as PracticeMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="shadowing" className="gap-2">
              <Headphones className="h-4 w-4" />
              <span className="hidden sm:inline">Shadowing</span>
            </TabsTrigger>
            <TabsTrigger value="question" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Trả lời</span>
            </TabsTrigger>
            <TabsTrigger value="roleplay" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Hội thoại</span>
            </TabsTrigger>
          </TabsList>

          {/* Shadowing Mode */}
          <TabsContent value="shadowing" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Nghe và nói theo</CardTitle>
                    <CardDescription>
                      Nghe câu mẫu, sau đó nói theo và nhận đánh giá
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={cn(
                    currentSentence.difficulty === 'easy' && "border-matcha text-matcha",
                    currentSentence.difficulty === 'medium' && "border-sakura text-sakura",
                    currentSentence.difficulty === 'hard' && "border-destructive text-destructive"
                  )}>
                    {currentSentence.difficulty === 'easy' ? 'Dễ' : 
                     currentSentence.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Target Sentence Area */}
                <div className="relative group overflow-hidden rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm p-10 text-center transition-all">
                  <div className="space-y-4">
                    <p className="text-4xl md:text-5xl font-jp font-black text-slate-900 dark:text-white leading-tight">
                      {currentSentence.japanese}
                    </p>
                    {currentSentence.reading && (
                      <p className="text-xl font-mono text-slate-400 font-bold uppercase tracking-widest">{currentSentence.reading}</p>
                    )}
                    <div className="h-px w-12 bg-slate-200 dark:bg-slate-800 mx-auto my-4" />
                    <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">"{currentSentence.vietnamese}"</p>
                    
                    <div className="flex justify-center pt-4">
                      {/* Listen Button */}
                      <Button
                        variant="secondary"
                        onClick={() => speak(currentSentence.japanese)}
                        disabled={isSpeaking}
                        className="gap-2 h-12 px-8 rounded-full bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700"
                      >
                        <Volume2 className={cn("h-5 w-5", isSpeaking && "animate-pulse")} />
                        <span className="font-bold">{isSpeaking ? 'Đang phát...' : 'Nghe mẫu'}</span>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="relative flex flex-col items-center gap-6 py-4">
                  <div className="relative">
                    <AnimatePresence>
                      {isRecording && (
                        <>
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 0.1 }}
                            exit={{ scale: 2, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute inset-0 rounded-full bg-red-500 z-0"
                          />
                          <motion.div
                            initial={{ scale: 1, opacity: 0 }}
                            animate={{ scale: 1.8, opacity: 0.05 }}
                            exit={{ scale: 1, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                            className="absolute inset-0 rounded-full bg-red-400 z-0"
                          />
                        </>
                      )}
                    </AnimatePresence>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isAnalyzing}
                      className={cn(
                        "relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-xl",
                        isRecording 
                          ? "bg-red-500 text-white" 
                          : "bg-gradient-to-br from-indigo-600 to-violet-700 text-white",
                        isAnalyzing && "opacity-50"
                      )}
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-10 w-10 animate-spin" />
                      ) : isRecording ? (
                        <AudioVisualizer />
                      ) : (
                        <div className="flex flex-col items-center">
                          <Mic className="h-10 w-10 mb-1" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Nói ngay</span>
                        </div>
                      )}
                    </motion.button>
                  </div>
                  
                  <Badge variant="secondary" className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                    isRecording ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 text-slate-400"
                  )}>
                    {isRecording ? 'Hệ thống đang nghe...' : 'Sẵn sàng ghi âm'}
                  </Badge>
                </div>

                {/* Recognized Text */}
                {recognizedText && (
                  <div className="text-center space-y-2 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Bạn đã nói:</p>
                    <p className="text-xl font-jp">{recognizedText}</p>
                  </div>
                )}

                {/* Analyze Button */}
                {recognizedText && !scoreResult && !isRecording && (
                  <div className="flex justify-center">
                    <Button onClick={analyzeResponse} disabled={isAnalyzing}>
                      {isAnalyzing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Target className="h-4 w-4 mr-2" />
                      )}
                      Chấm điểm
                    </Button>
                  </div>
                )}

                {/* Score Result */}
                {scoreResult && <ScoreDisplay result={scoreResult} />}

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setRecognizedText('');
                      setScoreResult(null);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Thử lại
                  </Button>
                  <Button onClick={nextSentence}>
                    Câu tiếp
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Question Mode */}
          <TabsContent value="question" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Trả lời câu hỏi</CardTitle>
                <CardDescription>
                  Đọc câu hỏi và trả lời bằng tiếng Nhật
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Question */}
                <div className="relative group overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm p-8 text-center transition-all hover:border-indigo-500/30">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <MessageSquare className="h-20 w-20 rotate-12" />
                  </div>
                  
                  <div className="relative z-10 space-y-4">
                    <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 font-bold px-3 py-1 scale-90">
                      CÂU HỎI TỪ SENSEI
                    </Badge>
                    <p className="text-3xl md:text-4xl font-jp font-black text-slate-900 dark:text-white leading-tight">
                      {currentQuestion.japanese}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 font-medium italic">
                      "{currentQuestion.vietnamese}"
                    </p>
                    
                    <div className="flex justify-center pt-2">
                       <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => speak(currentQuestion.japanese)}
                        disabled={isSpeaking}
                        className="rounded-full px-6 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                      >
                        <Volume2 className={cn("h-4 w-4 mr-2", isSpeaking && "animate-play")} />
                        Nghe câu hỏi
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Recording Area */}
                <div className="relative flex flex-col items-center gap-6 py-4">
                  <div className="relative">
                    <AnimatePresence>
                      {isRecording && (
                        <>
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 0.1 }}
                            exit={{ scale: 2, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute inset-0 rounded-full bg-red-500 z-0"
                          />
                        </>
                      )}
                    </AnimatePresence>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isAnalyzing}
                      className={cn(
                        "relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-xl",
                        isRecording 
                          ? "bg-red-500 text-white" 
                          : "bg-gradient-to-br from-indigo-600 to-violet-700 text-white",
                        isAnalyzing && "opacity-50"
                      )}
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-10 w-10 animate-spin" />
                      ) : isRecording ? (
                        <AudioVisualizer />
                      ) : (
                        <div className="flex flex-col items-center">
                          <Mic className="h-10 w-10 mb-1" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Trả lời</span>
                        </div>
                      )}
                    </motion.button>
                  </div>
                  
                  <Badge variant="secondary" className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                    isRecording ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 text-slate-400"
                  )}>
                    {isRecording ? 'Hệ thống đang nghe...' : 'Sẵn sàng ghi âm'}
                  </Badge>
                </div>

                {/* Recognized Text */}
                {recognizedText && (
                  <div className="text-center space-y-2 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Câu trả lời của bạn:</p>
                    <p className="text-xl font-jp">{recognizedText}</p>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setRecognizedText('')}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Xóa
                  </Button>
                  <Button onClick={nextQuestion}>
                    Câu hỏi khác
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roleplay Mode */}
          <TabsContent value="roleplay" className="space-y-4">
            <PersonaSelector 
              selectedPersona={selectedPersona} 
              onSelect={(id) => {
                setSelectedPersona(id);
                setConversation([
                  {
                    role: 'assistant',
                    content: 'こんにちは！',
                    translation: 'Xin chào!',
                  },
                ]);
              }} 
            />
            <Card className="shadow-card min-h-[400px] max-h-[60vh] flex flex-col">
              <CardHeader className="py-3 flex-row items-center justify-between">
                <CardTitle className="text-lg">Hội thoại với AI</CardTitle>
                <Button variant="outline" size="sm" onClick={clearConversation}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa
                </Button>
              </CardHeader>
              <CardContent className="flex-1 space-y-4 overflow-y-auto">
                {conversation.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} mb-4`}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] p-4 rounded-2xl",
                        msg.role === 'user'
                          ? "bg-gradient-to-br from-matcha to-matcha-dark text-white rounded-tr-none"
                          : "bg-muted rounded-tl-none"
                      )}
                    >
                      <p className="font-jp whitespace-pre-wrap">{msg.content}</p>
                      {msg.translation && (
                        <p className="text-sm opacity-70 mt-2 pt-2 border-t border-current/20">
                          {msg.translation}
                        </p>
                      )}
                      
                      {msg.role === 'assistant' && msg.content && ttsSupported && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => isSpeaking ? stop() : speak(msg.content)}
                          className="mt-2 h-8 hover:bg-white/10"
                        >
                          {isSpeaking ? (
                            <><VolumeX className="h-4 w-4 mr-1" /> Dừng</>
                          ) : (
                            <><Volume2 className="h-4 w-4 mr-1" /> Nghe</>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Correction Display for User Messages */}
                    {msg.role === 'user' && (msg.correction || msg.explanation) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-sakura/10 border border-sakura/20 rounded-xl p-3 mt-2 text-xs space-y-2 max-w-[80%] shadow-sm"
                      >
                        {msg.correction && (
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-sakura shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-sakura">Gợi ý: </span>
                              <span className="font-jp text-foreground">{msg.correction}</span>
                            </div>
                          </div>
                        )}
                        {msg.explanation && (
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="text-muted-foreground italic leading-normal">{msg.explanation}</div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-muted p-4 rounded-2xl">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>
            </Card>

            {/* Input Area */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={message}
                    onChange={handleInputChange}
                    placeholder="Gõ tiếng Nhật hoặc nói..."
                    className="pr-12"
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 font-jp"
                    onClick={cycleMode}
                  >
                    {getKanaModeLabel(kanaMode)}
                  </Button>
                </div>
                <Button 
                  variant={isRecording ? "destructive" : "outline"} 
                  size="icon" 
                  onClick={() => {
                    if (isRecording) {
                      stopRecording();
                      if (recognizedText) {
                        setMessage(recognizedText);
                      }
                    } else {
                      startRecording();
                    }
                  }}
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Button onClick={handleSend} disabled={isLoading || !message.trim()}>
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {/* Kanji Suggestions */}
              {(allSuggestions.length > 0 || isLookupLoading) && (
                <KanjiSuggestions 
                  suggestions={allSuggestions} 
                  onSelect={handleKanjiSelect}
                  onViewStrokeOrder={handleViewStrokeOrder}
                  isLoading={isLookupLoading}
                />
              )}

              {/* Kana Keyboard */}
              <KanaKeyboard onKeyPress={handleKanaKeyPress} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Tips */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>💡 Mẹo: Nói to và rõ ràng để được nhận diện tốt hơn</p>
          <p>⚠️ Tính năng hoạt động tốt nhất trên Chrome/Edge</p>
        </div>
      </main>

      {/* Stroke Order Modal */}
      {showStrokeOrder && (
        <KanjiStrokeOrder
          kanji={showStrokeOrder.kanji}
          reading={showStrokeOrder.reading}
          meaning={showStrokeOrder.meaning}
          onClose={() => setShowStrokeOrder(null)}
          onSaveToVocabulary={handleSaveFromStrokeOrder}
        />
      )}
    </div>
  );
};

// export default SpeakingPractice;
