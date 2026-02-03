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
import Navigation from '@/components/Navigation';
import KanaKeyboard from '@/components/KanaKeyboard';
import KanjiSuggestions from '@/components/KanjiSuggestions';
import KanjiStrokeOrder from '@/components/KanjiStrokeOrder';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useTTS, TTSSpeed } from '@/hooks/useTTS';
import { useKanaInput, KanaMode } from '@/hooks/useKanaInput';
import { useKanjiLookup } from '@/hooks/useKanjiLookup';
import { useWordHistory } from '@/hooks/useWordHistory';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// Types
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

const SpeakingPractice = () => {
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
  const { mode: kanaMode, cycleMode, processInput, resetBuffer, getKanjiSuggestions } = useKanaInput();
  const { suggestions: apiSuggestions, isLoading: isLookupLoading, lookupKanji, clearSuggestions } = useKanjiLookup();
  const { saveWord } = useWordHistory();

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
    resetBuffer();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const processedValue = processInput(newValue, message);
    setMessage(processedValue);
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

  // Audio Visualizer Component
  const AudioVisualizer = () => (
    <div className="flex items-center gap-1 h-8">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ height: [8, 24, 8] }}
          transition={{ 
            repeat: Infinity, 
            duration: 0.5,
            delay: i * 0.1,
            ease: "easeInOut"
          }}
          className="w-1.5 bg-white rounded-full"
        />
      ))}
    </div>
  );

  // Score Display Component
  const ScoreDisplay = ({ result }: { result: ScoreResult }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4 bg-muted rounded-xl"
    >
      {/* Overall Score */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className={cn(
            "inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl font-bold",
            result.overall >= 90 ? "bg-matcha/20 text-matcha" :
            result.overall >= 70 ? "bg-sakura/20 text-sakura" :
            result.overall >= 50 ? "bg-amber-500/20 text-amber-500" :
            "bg-destructive/20 text-destructive"
          )}
        >
          {result.overall}
        </motion.div>
        <p className="mt-2 text-lg font-medium">{result.feedback}</p>
      </div>

      {/* Detailed Scores */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>Độ chính xác</span>
          </div>
          <Progress value={result.accuracy} className="h-2" />
          <span className="text-sm font-medium">{result.accuracy}%</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Trường âm</span>
          </div>
          <Progress value={result.duration} className="h-2" />
          <span className="text-sm font-medium">{result.duration}%</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Music className="h-4 w-4" />
            <span>Nhịp điệu</span>
          </div>
          <Progress value={result.rhythm} className="h-2" />
          <span className="text-sm font-medium">{result.rhythm}%</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span>Độ trôi chảy</span>
          </div>
          <Progress value={result.fluency} className="h-2" />
          <span className="text-sm font-medium">{result.fluency}%</span>
        </div>
      </div>

      {/* Word Analysis */}
      {result.details.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Phân tích từng từ:</p>
          <div className="flex flex-wrap gap-2">
            {result.details.map((detail, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className={cn(
                  "font-jp text-base",
                  detail.status === 'correct' && "border-matcha text-matcha bg-matcha/10",
                  detail.status === 'incorrect' && "border-destructive text-destructive bg-destructive/10",
                  detail.status === 'missing' && "border-amber-500 text-amber-500 bg-amber-500/10",
                  detail.status === 'extra' && "border-muted-foreground text-muted-foreground line-through"
                )}
              >
                {detail.status === 'correct' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {detail.status === 'incorrect' && <XCircle className="h-3 w-3 mr-1" />}
                {detail.status === 'missing' && <AlertCircle className="h-3 w-3 mr-1" />}
                {detail.word}
                {detail.expected && (
                  <span className="ml-1 text-xs opacity-70">→ {detail.expected}</span>
                )}
              </Badge>
            ))}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-matcha" /> Đúng</span>
            <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" /> Sai</span>
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-500" /> Thiếu</span>
            <span className="flex items-center gap-1 line-through">Thừa</span>
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
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
                {/* Target Sentence */}
                <div className="text-center space-y-2">
                  <p className="text-3xl font-jp">{currentSentence.japanese}</p>
                  {currentSentence.reading && (
                    <p className="text-muted-foreground">{currentSentence.reading}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{currentSentence.vietnamese}</p>
                  
                  {/* Listen Button */}
                  <Button
                    variant="outline"
                    onClick={() => speak(currentSentence.japanese)}
                    disabled={isSpeaking}
                    className="gap-2"
                  >
                    <Volume2 className={cn("h-4 w-4", isSpeaking && "animate-pulse")} />
                    {isSpeaking ? 'Đang phát...' : 'Nghe mẫu'}
                  </Button>
                </div>

                {/* Recording Area */}
                <div className="flex flex-col items-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isAnalyzing}
                    className={cn(
                      "w-24 h-24 rounded-full flex items-center justify-center transition-all",
                      isRecording 
                        ? "bg-destructive text-destructive-foreground" 
                        : "bg-gradient-to-br from-matcha to-matcha-dark text-white",
                      isAnalyzing && "opacity-50"
                    )}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-10 w-10 animate-spin" />
                    ) : isRecording ? (
                      <AudioVisualizer />
                    ) : (
                      <Mic className="h-10 w-10" />
                    )}
                  </motion.button>
                  
                  <p className="text-sm text-muted-foreground">
                    {isRecording ? 'Đang ghi âm... Nhấn để dừng' : 'Nhấn để bắt đầu nói'}
                  </p>
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
                <div className="text-center space-y-2 p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-jp">{currentQuestion.japanese}</p>
                  <p className="text-muted-foreground">{currentQuestion.vietnamese}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speak(currentQuestion.japanese)}
                    disabled={isSpeaking}
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Nghe
                  </Button>
                </div>

                {/* Recording Area */}
                <div className="flex flex-col items-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isAnalyzing}
                    className={cn(
                      "w-24 h-24 rounded-full flex items-center justify-center transition-all",
                      isRecording 
                        ? "bg-destructive text-destructive-foreground" 
                        : "bg-gradient-to-br from-sakura to-sakura-dark text-white"
                    )}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-10 w-10 animate-spin" />
                    ) : isRecording ? (
                      <AudioVisualizer />
                    ) : (
                      <Mic className="h-10 w-10" />
                    )}
                  </motion.button>
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
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] p-4 rounded-2xl",
                        msg.role === 'user'
                          ? "bg-gradient-to-br from-matcha to-matcha-dark text-white"
                          : "bg-muted"
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
                          className="mt-2 h-8"
                        >
                          {isSpeaking ? (
                            <><VolumeX className="h-4 w-4 mr-1" /> Dừng</>
                          ) : (
                            <><Volume2 className="h-4 w-4 mr-1" /> Nghe</>
                          )}
                        </Button>
                      )}
                    </div>
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

export default SpeakingPractice;
