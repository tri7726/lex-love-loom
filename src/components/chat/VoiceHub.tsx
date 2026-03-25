import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Volume2, VolumeX, X, RotateCcw,
  CheckCircle2, AlertCircle, Target, MessageSquare,
  Loader2, Radio, ChevronRight, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { WaveVisualizer } from '@/components/chat/WaveVisualizer';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTTS } from '@/hooks/useTTS';
import { supabase } from '@/integrations/supabase/client';
import { useXP } from '@/hooks/useXP';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PronunciationFeedback {
  recognized: string;
  target: string;
  score: number;
  errors: string[];
  suggestion: string;
}

interface VoiceMessage {
  id: string;
  role: 'user' | 'sensei';
  text: string;
  translation?: string;
  pronunciation?: PronunciationFeedback;
}

type VoiceMode = 'conversation' | 'pronunciation';

// ─── Practice sentences ───────────────────────────────────────────────────────

const SENTENCES = [
  { jp: 'おはようございます', vi: 'Chào buổi sáng' },
  { jp: 'ありがとうございます', vi: 'Cảm ơn bạn' },
  { jp: '日本語を勉強しています', vi: 'Tôi đang học tiếng Nhật' },
  { jp: 'もう一度言ってください', vi: 'Xin hãy nói lại một lần nữa' },
  { jp: 'どこに住んでいますか', vi: 'Bạn sống ở đâu?' },
  { jp: '今日はいい天気ですね', vi: 'Hôm nay thời tiết đẹp nhỉ' },
  { jp: 'よろしくお願いします', vi: 'Rất vui được làm quen' },
];

// ─── Pronunciation scorer ─────────────────────────────────────────────────────

function scorePronunciation(recognized: string, target: string): PronunciationFeedback {
  const norm = (s: string) => s.replace(/\s+/g, '').replace(/[。、！？,.!?]/g, '');
  const rec = norm(recognized);
  const tgt = norm(target);

  let matches = 0;
  const len = Math.max(rec.length, tgt.length);
  for (let i = 0; i < Math.min(rec.length, tgt.length); i++) {
    if (rec[i] === tgt[i]) matches++;
  }
  const score = len > 0 ? Math.round((matches / len) * 100) : 0;

  // Find missing words
  const tgtWords = target.split(/[\s、。！？]+/).filter(Boolean);
  const recWords = recognized.split(/[\s、。！？]+/).filter(Boolean);
  const errors = tgtWords.filter(w => !recWords.some(r => r.includes(w) || w.includes(r)));

  let suggestion = '';
  if (score >= 85) suggestion = '素晴らしい！完璧な発音です。';
  else if (score >= 65) suggestion = 'いいですね。もう少しゆっくり話してみてください。';
  else if (errors.length > 0) suggestion = `「${errors[0]}」の部分をもう一度練習してください。`;
  else suggestion = 'ゆっくり、はっきり話してみてください。';

  return { recognized, target, score, errors, suggestion };
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface VoiceHubProps {
  isOpen: boolean;
  onClose: () => void;
  targetSentence?: string;
  systemPrompt?: string;
}

export const VoiceHub = ({ isOpen, onClose, targetSentence, systemPrompt }: VoiceHubProps) => {
  const { awardXP } = useXP();
  const { speak, stop: stopTTS, isSpeaking } = useTTS({ lang: 'ja-JP', rate: 0.75 });

  const [mode, setMode] = useState<VoiceMode>(targetSentence ? 'pronunciation' : 'conversation');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [pendingTranscript, setPendingTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);

  const activeSentence = targetSentence ?? SENTENCES[sentenceIdx].jp;
  const activeTranslation = targetSentence ? '' : SENTENCES[sentenceIdx].vi;

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // ── Handle final STT result ────────────────────────────────────────────────
  const handleFinalResult = useCallback(async (text: string) => {
    if (!text.trim() || processingRef.current) return;
    processingRef.current = true;
    setPendingTranscript('');

    const userMsg: VoiceMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
    };
    setMessages(prev => [...prev, userMsg]);

    // ── Pronunciation mode ──
    if (mode === 'pronunciation') {
      const feedback = scorePronunciation(text, activeSentence);

      setMessages(prev => prev.map(m =>
        m.id === userMsg.id ? { ...m, pronunciation: feedback } : m
      ));

      const senseiJp = feedback.score >= 85
        ? `とても上手です！${feedback.score}点！`
        : feedback.score >= 65
        ? `${feedback.score}点。${feedback.suggestion}`
        : `もう一度試してみましょう。${feedback.suggestion}`;

      const senseiVi = feedback.score >= 85
        ? `Rất giỏi! ${feedback.score} điểm!`
        : feedback.score >= 65
        ? `${feedback.score} điểm. ${feedback.score >= 65 ? 'Hãy luyện thêm.' : ''}`
        : 'Hãy thử lại nhé.';

      const senseiMsg: VoiceMessage = {
        id: crypto.randomUUID(),
        role: 'sensei',
        text: senseiJp,
        translation: senseiVi,
      };
      setMessages(prev => [...prev, senseiMsg]);
      speak(senseiJp);
      if (feedback.score >= 85) awardXP('speaking', 20);
      else if (feedback.score >= 65) awardXP('speaking', 10);
      processingRef.current = false;
      return;
    }

    // ── Conversation mode ──
    setIsProcessing(true);
    try {
      const history = messages.slice(-8).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const { data, error } = await supabase.functions.invoke('japanese-chat', {
        body: {
          messages: [...history, { role: 'user', content: text }],
          systemPrompt: systemPrompt ||
            'あなたは優しい日本語の先生です。学習者と自然な日本語で会話してください。返答は2〜3文で短く。必ず最後に改行して[翻訳]ベトナム語訳を付けてください。',
          engine: 'gemini',
        },
      });

      if (error) throw error;

      let raw = '';
      if (typeof data === 'string') raw = data;
      else if (data?.content) raw = data.content;
      else if (data?.response) raw = data.response;

      const translationMatch = raw.match(/\[翻訳\]\s*(.+)/s);
      const japanese = raw.replace(/\[翻訳\]\s*.+/s, '').trim();
      const translation = translationMatch?.[1]?.trim() ?? '';

      if (japanese) {
        const senseiMsg: VoiceMessage = {
          id: crypto.randomUUID(),
          role: 'sensei',
          text: japanese,
          translation,
        };
        setMessages(prev => [...prev, senseiMsg]);
        speak(japanese);
        awardXP('speaking', 5);
      }
    } catch (err) {
      console.error('VoiceHub AI error:', err);
      const errMsg: VoiceMessage = {
        id: crypto.randomUUID(),
        role: 'sensei',
        text: 'すみません、もう一度お願いします。',
        translation: 'Xin lỗi, hãy thử lại.',
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [mode, activeSentence, messages, systemPrompt, speak, awardXP]);

  // ── STT ───────────────────────────────────────────────────────────────────
  const { isListening, transcript, startListening, stopListening, isSupported } =
    useSpeechRecognition({
      lang: 'ja-JP',
      continuous: false,
      onResult: (text) => setPendingTranscript(text),
    });

  // When recognition ends, process the final transcript
  const prevListening = useRef(false);
  useEffect(() => {
    if (prevListening.current && !isListening && transcript.trim()) {
      handleFinalResult(transcript);
    }
    prevListening.current = isListening;
  }, [isListening, transcript, handleFinalResult]);

  const toggleMic = () => {
    if (isSpeaking) stopTTS();
    if (isListening) stopListening();
    else startListening();
  };

  const nextSentence = () => {
    setMessages([]);
    setSentenceIdx(i => (i + 1) % SENTENCES.length);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-background rounded-[2rem] shadow-2xl border-2 border-sakura/20 flex flex-col overflow-hidden"
        style={{ maxHeight: '88vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sakura/10 bg-gradient-to-r from-sakura/10 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-sakura flex items-center justify-center shadow-lg shadow-sakura/30">
              <Radio className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm leading-none">AI Voice Hub</h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                {mode === 'pronunciation' ? 'Luyện phát âm' : 'Hội thoại thực tế'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode toggle — only when no targetSentence */}
            {!targetSentence && (
              <div className="flex bg-muted rounded-xl p-1 gap-0.5">
                {(['conversation', 'pronunciation'] as VoiceMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setMessages([]); }}
                    className={cn(
                      'text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1',
                      mode === m ? 'bg-sakura text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {m === 'conversation'
                      ? <><MessageSquare className="h-3 w-3" />Hội thoại</>
                      : <><Target className="h-3 w-3" />Phát âm</>
                    }
                  </button>
                ))}
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-xl">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Pronunciation target ── */}
        {mode === 'pronunciation' && (
          <div className="px-5 py-3 bg-primary/5 border-b border-primary/10 shrink-0">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1.5 tracking-widest">Câu luyện tập</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-jp font-black text-primary leading-tight">{activeSentence}</p>
                {activeTranslation && (
                  <p className="text-xs text-muted-foreground mt-0.5 italic">{activeTranslation}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary hover:bg-primary/10"
                  onClick={() => speak(activeSentence)}>
                  <Volume2 className="h-4 w-4" />
                </Button>
                {!targetSentence && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-muted"
                    onClick={nextSentence}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {messages.length === 0 && !isListening && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
              <div className="h-14 w-14 rounded-full bg-sakura/10 flex items-center justify-center">
                <Mic className="h-7 w-7 text-sakura/40" />
              </div>
              <p className="text-sm font-bold text-muted-foreground">
                {mode === 'pronunciation' ? 'Nhấn mic và đọc câu bên trên' : 'Nhấn mic và nói tiếng Nhật'}
              </p>
              <p className="text-xs text-muted-foreground/60">
                {isSupported ? 'Web Speech API sẵn sàng' : '⚠️ Dùng Chrome/Edge để bật mic'}
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : '')}
              >
                {/* Avatar */}
                <div className={cn(
                  'h-7 w-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 mt-0.5',
                  msg.role === 'sensei' ? 'bg-sakura text-white' : 'bg-primary/15 text-primary'
                )}>
                  {msg.role === 'sensei' ? '先' : '私'}
                </div>

                <div className={cn('flex-1 space-y-1.5 max-w-[82%]', msg.role === 'user' ? 'items-end flex flex-col' : '')}>
                  {/* Bubble */}
                  <div className={cn(
                    'px-4 py-2.5 rounded-2xl text-sm',
                    msg.role === 'sensei'
                      ? 'bg-white dark:bg-slate-800 border border-sakura/10 rounded-tl-none shadow-sm'
                      : 'bg-primary text-primary-foreground rounded-tr-none'
                  )}>
                    <p className="font-jp font-medium leading-relaxed">{msg.text}</p>
                    {msg.translation && (
                      <p className="text-xs opacity-55 mt-0.5 italic">{msg.translation}</p>
                    )}
                  </div>

                  {/* Replay TTS */}
                  {msg.role === 'sensei' && (
                    <button
                      onClick={() => speak(msg.text)}
                      className="text-[10px] text-muted-foreground hover:text-sakura flex items-center gap-1 transition-colors"
                    >
                      <Volume2 className="h-3 w-3" /> Nghe lại
                    </button>
                  )}

                  {/* Pronunciation feedback */}
                  {msg.pronunciation && (
                    <div className="w-full p-3 rounded-xl bg-muted/60 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Điểm phát âm</span>
                        <div className="flex items-center gap-1.5">
                          {msg.pronunciation.score >= 85
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            : <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                          }
                          <span className={cn(
                            'text-sm font-black',
                            msg.pronunciation.score >= 85 ? 'text-green-500' :
                            msg.pronunciation.score >= 65 ? 'text-amber-500' : 'text-red-500'
                          )}>
                            {msg.pronunciation.score}/100
                          </span>
                        </div>
                      </div>
                      <Progress value={msg.pronunciation.score} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground">
                        Nhận diện: <span className="font-jp font-bold text-foreground">{msg.pronunciation.recognized}</span>
                      </p>
                      {msg.pronunciation.errors.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {msg.pronunciation.errors.slice(0, 4).map((e, i) => (
                            <Badge key={i} variant="outline" className="text-[9px] border-red-300 text-red-500 px-1.5 py-0">
                              {e}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Interim transcript */}
          {isListening && pendingTranscript && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-row-reverse gap-2.5">
              <div className="h-7 w-7 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-xs font-black shrink-0">私</div>
              <div className="px-4 py-2.5 rounded-2xl rounded-tr-none bg-primary/20 text-sm max-w-[82%]">
                <p className="font-jp italic text-muted-foreground">{pendingTranscript}…</p>
              </div>
            </motion.div>
          )}

          {/* AI thinking */}
          {isProcessing && (
            <div className="flex gap-2.5">
              <div className="h-7 w-7 rounded-xl bg-sakura flex items-center justify-center text-white text-xs font-black shrink-0">先</div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-white dark:bg-slate-800 border border-sakura/10 shadow-sm">
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.12 }}
                      className="h-2 w-2 rounded-full bg-sakura/60"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Controls ── */}
        <div className="px-5 py-4 border-t border-sakura/10 bg-sakura/[0.03] shrink-0">
          {/* Wave visualizer */}
          <div className="mb-3">
            <WaveVisualizer isActive={isListening} color={isListening ? '#f43f5e' : '#e2e8f0'} />
          </div>

          <div className="flex items-center justify-center gap-4">
            {/* Clear */}
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted"
                onClick={() => setMessages([])}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}

            {/* Main mic */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={isSupported ? toggleMic : undefined}
              disabled={!isSupported || isProcessing}
              className={cn(
                'h-16 w-16 rounded-full flex items-center justify-center shadow-xl transition-all',
                !isSupported
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : isListening
                  ? 'bg-red-500 text-white shadow-red-500/40 ring-4 ring-red-500/20'
                  : 'bg-sakura text-white shadow-sakura/40 hover:shadow-sakura/60 hover:scale-105'
              )}
            >
              {isProcessing
                ? <Loader2 className="h-7 w-7 animate-spin" />
                : isListening
                ? <MicOff className="h-7 w-7" />
                : <Mic className="h-7 w-7" />
              }
            </motion.button>

            {/* Stop TTS */}
            {isSpeaking && (
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-sakura hover:bg-sakura/10"
                onClick={stopTTS}>
                <VolumeX className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Status label */}
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-3">
            {!isSupported ? '⚠️ Dùng Chrome/Edge'
              : isListening ? '🔴 Đang nghe...'
              : isProcessing ? '⏳ Sensei đang trả lời...'
              : isSpeaking ? '🔊 Sensei đang nói...'
              : '🎙️ Nhấn mic để bắt đầu'}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
