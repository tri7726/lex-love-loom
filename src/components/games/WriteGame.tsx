import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, CheckCircle2, XCircle, ArrowRight, HelpCircle, BookOpen, Languages, ChevronLeft, Sparkles, Trophy, RotateCcw, Keyboard, Delete } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { VocabularyItem } from '@/types/vocabulary';

interface WriteGameProps {
  vocabulary: VocabularyItem[];
  onComplete: (results: { correct: number; total: number }) => void;
  onUpdateMastery: (wordId: string, correct: boolean) => void;
  onBack: () => void;
}

type WriteMode = 'word-to-reading' | 'meaning-to-reading';

export const WriteGame: React.FC<WriteGameProps> = ({
  vocabulary,
  onComplete,
  onUpdateMastery,
  onBack,
}) => {
  const [writeMode, setWriteMode] = useState<WriteMode | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardType, setKeyboardType] = useState<'hira' | 'kata'>('hira');
  const inputRef = useRef<HTMLInputElement>(null);

  const HIRAGANA_GRID = [
    ['あ', 'い', 'う', 'え', 'お'],
    ['か', 'き', 'く', 'け', 'こ'],
    ['さ', 'し', 'す', 'せ', 'そ'],
    ['た', 'ち', 'つ', 'て', 'と'],
    ['な', 'に', 'ぬ', 'ね', 'の'],
    ['は', 'ひ', 'ふ', 'へ', 'ほ'],
    ['ま', 'み', 'む', 'め', 'も'],
    ['や', '（', 'ゆ', '）', 'よ'],
    ['ら', 'り', 'る', 'れ', 'ろ'],
    ['わ', '（', 'を', '）', 'ん'],
    ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
    ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
    ['だ', 'ぢ', 'づ', 'で', 'ど'],
    ['ば', 'び', 'ぶ', 'べ', 'ぼ'],
    ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'],
    ['ゃ', 'ゅ', 'ょ', 'っ', 'ー'],
  ];

  const KATAKANA_GRID = [
    ['ア', 'イ', 'ウ', 'エ', 'オ'],
    ['カ', 'キ', 'ク', 'ケ', 'コ'],
    ['サ', 'シ', 'ス', 'セ', 'ソ'],
    ['タ', 'チ', 'ツ', 'テ', 'ト'],
    ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
    ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
    ['マ', 'ミ', 'ム', 'メ', 'モ'],
    ['ヤ', '（', 'ユ', '）', 'ヨ'],
    ['ラ', 'リ', 'ル', 'レ', 'ロ'],
    ['ワ', '（', 'ヲ', '）', 'ン'],
    ['ガ', 'ギ', 'グ', 'ゲ', 'ゴ'],
    ['ザ', 'ジ', 'ズ', 'ゼ', 'ゾ'],
    ['ダ', 'ヂ', 'ヅ', 'デ', 'ド'],
    ['バ', 'ビ', 'ブ', 'ベ', 'ボ'],
    ['パ', 'ピ', 'プ', 'ぺ', 'ポ'],
    ['ャ', 'ュ', 'ョ', 'ッ', 'ー'],
  ];

  // Only use words that have reading (needed for answer checking)
  const validVocabulary = useMemo(() =>
    vocabulary.filter((w) => w.reading && w.reading.trim() !== ''),
    [vocabulary]
  );

  const questions = useMemo(() => {
    const shuffled = [...validVocabulary].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(10, shuffled.length));
  }, [validVocabulary]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  useEffect(() => {
    if (writeMode) inputRef.current?.focus();
  }, [currentIndex, writeMode]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const normalizeText = (text: string): string => {
    // Basic normalization: trim, lowercase, remove spaces
    let normalized = text.trim().toLowerCase().replace(/\s/g, '');
    
    // Hiragana to Katakana conversion for more flexible checking
    // (Helps if user types hiragana for a katakana word)
    return normalized.replace(/[\u3041-\u3096]/g, (ch) => 
      String.fromCharCode(ch.charCodeAt(0) + 0x60)
    );
  };

  const checkAnswer = () => {
    const normalized = normalizeText(userInput);
    const correctReading = currentQuestion?.reading ? normalizeText(currentQuestion.reading) : '';
    const correct = normalized === correctReading;

    setIsCorrect(correct);
    setShowResult(true);

    if (correct) setCorrectCount((prev) => prev + 1);
    if (currentQuestion) {
      onUpdateMastery(currentQuestion.id, correct);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResult && userInput.trim()) checkAnswer();
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setGameComplete(true);
      onComplete({ correct: correctCount + (isCorrect ? 0 : 0), total: questions.length });
    } else {
      setCurrentIndex((i) => i + 1);
      setUserInput('');
      setShowResult(false);
      setIsCorrect(false);
      setShowHint(false);
      setHintCount(0);
    }
  };

  const restartGame = () => {
    setCurrentIndex(0);
    setUserInput('');
    setShowResult(false);
    setIsCorrect(false);
    setCorrectCount(0);
    setShowHint(false);
    setHintCount(0);
    setGameComplete(false);
  };

  const getHint = () => {
    const reading = currentQuestion?.reading || '';
    const visibleLength = Math.min(hintCount, reading.length);
    return reading.slice(0, visibleLength) + '_'.repeat(reading.length - visibleLength);
  };

  const handleHintClick = () => {
    setShowHint(true);
    setHintCount((prev) => prev + 1);
  };

  const handleKeyClick = (char: string) => {
    if (char === '（' || char === '）') return;
    setUserInput(prev => prev + char);
    inputRef.current?.focus();
  };

  const handleVirtualBackspace = () => {
    setUserInput(prev => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  // ─── Mode Selection ───
  if (!writeMode) {
    return (
      <div className="space-y-10 py-6 max-w-3xl mx-auto">
        <div className="text-center space-y-4">
          <div className="inline-block p-4 bg-sky-50 rounded-[2rem] border border-sky-100 shadow-sm relative">
            <Languages className="h-10 w-10 text-sky-500" />
            <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-300 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-bold text-sky-900 tracking-tight">Chế độ Viết</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">Nâng tầm kỹ năng viết Hiragana và ghi nhớ mặt chữ Kanji</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {( [
            {
              mode: 'word-to-reading' as WriteMode,
              icon: BookOpen,
              title: 'Kanji → Reading',
              desc: 'Nhìn Kanji, gõ cách đọc Hiragana tương ứng',
              example: '学校 → がっこう',
              gradient: 'from-sky-50 via-indigo-50 to-white',
              border: 'border-sky-100 hover:border-sky-300',
              iconColor: 'bg-sky-100 text-sky-600',
            },
            {
              mode: 'meaning-to-reading' as WriteMode,
              icon: Languages,
              title: 'Nghĩa → Reading',
              desc: 'Gõ cách đọc từ dựa trên ý nghĩa tiếng Việt',
              example: 'Trường học → がっこう',
              gradient: 'from-amber-50 via-pink-50 to-white',
              border: 'border-amber-100 hover:border-amber-300',
              iconColor: 'bg-amber-100 text-amber-600',
            },
          ]).map(({ mode, icon: Icon, title, desc, example, gradient, border, iconColor }) => (
            <motion.div key={mode} whileHover={{ scale: 1.03, y: -4 }} whileTap={{ scale: 0.98 }}>
              <Card
                className={cn(
                  'cursor-pointer transition-all duration-300 shadow-card hover:shadow-elevated rounded-[2.5rem] h-full overflow-hidden border-2',
                  `bg-gradient-to-br ${gradient} ${border}`
                )}
                onClick={() => setWriteMode(mode)}
              >
                <CardContent className="p-8 text-center space-y-4">
                  <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-sm', iconColor)}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-xl text-slate-800">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 text-sm font-jp border border-white shadow-soft inline-block mx-auto text-sky-600 font-medium italic">
                    {example}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {validVocabulary.length === 0 && (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-center text-sm font-medium border border-red-100 max-w-md mx-auto">
            Không có từ nào có cách đọc để luyện tập!
          </div>
        )}
        
        <div className="text-center pt-4">
          <Button variant="ghost" onClick={onBack} className="text-muted-foreground gap-2">
            <ChevronLeft className="h-4 w-4" /> Quay lại
          </Button>
        </div>
      </div>
    );
  }

  // ─── Game Complete ───
  if (gameComplete) {
    const percentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <Card className="border-0 shadow-2xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-50 via-white to-sky-50">
          <div className="h-2 bg-gradient-to-r from-sky-400 via-indigo-400 to-indigo-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-display font-bold text-center text-slate-800 flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-amber-500" />
              Hoàn thành!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            <div className="text-center relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-7xl font-display font-black bg-gradient-to-br from-rose-600 to-indigo-500 bg-clip-text text-transparent inline-block"
              >
                {percentage}%
              </motion.div>
              <p className="text-slate-400 font-medium tracking-widest uppercase text-sm mt-2">Độ chính xác</p>
              <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-amber-300 animate-pulse" />
            </div>

            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-rose-100 text-center">
              <p className="text-lg text-slate-800 leading-relaxed">
                Bạn viết đúng <span className="font-bold text-sky-600">{correctCount}</span> / {questions.length} từ
              </p>
              <div className="mt-3">
                <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-100">
                  Chế độ: {writeMode === 'word-to-reading' ? 'Kanji → Reading' : 'Nghĩa → Reading'}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={restartGame} 
                className="w-full gap-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white rounded-[1.5rem] py-6 text-lg font-bold shadow-lg shadow-sky-200 transition-all active:scale-95"
              >
                <RotateCcw className="h-5 w-5 inline-block mr-2" />
                Luyện tập tiếp
              </button>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => { setWriteMode(null); restartGame(); }}
                  className="flex-1 text-slate-500 hover:bg-slate-50 rounded-2xl py-6"
                >
                  Đổi chế độ
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={onBack}
                  className="flex-1 text-slate-500 hover:bg-slate-50 rounded-2xl py-6"
                >
                  Thoát
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!currentQuestion) return null;

  // ─── Question prompt based on mode ───
  const prompt = writeMode === 'word-to-reading' ? currentQuestion.word : currentQuestion.meaning;
  const promptLabel = writeMode === 'word-to-reading' ? 'Dịch âm tiết Kanji sang Hiragana:' : 'Từ vựng có ý nghĩa này là:';
  const promptClass = writeMode === 'word-to-reading' ? 'text-5xl font-jp font-bold text-slate-900' : 'text-3xl font-bold text-slate-800 leading-tight';

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="space-y-2 px-2">
        <div className="flex justify-between items-end mb-1">
          <div className="flex gap-2 items-center">
            <Badge className="bg-sky-50 text-sky-600 border-sky-100 px-3 py-1 rounded-full text-xs font-bold hover:bg-sky-100 transition-colors">
              {writeMode === 'word-to-reading' ? 'Kanji → Reading' : 'Nghĩa → Reading'}
            </Badge>
            <span className="text-sm font-medium text-slate-400">Câu {currentIndex + 1} / {questions.length}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-green-100 shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span className="text-sm font-bold text-green-600">{correctCount}</span>
          </div>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-sky-400 to-indigo-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Task Card */}
      <Card className="border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-slate-100">
        <CardContent className="py-20 text-center space-y-6">
          <div className="space-y-4">
            <p className="text-slate-400 font-medium uppercase tracking-widest text-xs">{promptLabel}</p>
            <p className={cn(promptClass)}>{prompt}</p>

            {/* Extra Context */}
            {writeMode === 'meaning-to-reading' && (
              <div className="bg-slate-50 px-6 py-2 rounded-2xl inline-block border border-slate-100">
                <p className="text-lg text-slate-500 font-jp font-medium">{currentQuestion.word}</p>
              </div>
            )}

            <AnimatePresence>
              {showHint && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-amber-50 rounded-2xl p-4 border border-amber-100 inline-block mt-4 flex flex-col items-center gap-1 mx-auto"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-tighter">Gợi ý cách đọc</span>
                  </div>
                  <p className="text-3xl font-jp font-black tracking-[0.2em] text-amber-700">
                    {getHint()}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Feedback visualization */}
      <div className="flex justify-center h-12">
        <div className="flex gap-1">
          {currentQuestion.reading.split('').map((char, i) => {
            const typedChar = userInput[i];
            const isMatch = typedChar === char;
            const hasTyped = typedChar !== undefined;
            return (
              <div 
                key={i} 
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-lg border-2 font-jp text-xl transition-all duration-200",
                  !hasTyped ? "border-slate-100 bg-white/50 text-slate-200" : (isMatch ? "border-green-400 bg-green-50 text-green-600 font-bold" : "border-red-300 bg-red-50 text-red-500")
                )}
              >
                {hasTyped ? typedChar : '?'}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Input Form */}
      <form onSubmit={handleSubmit} className="space-y-6 px-4">
        <div className="relative group">
          <Input
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Gõ Hiragana tại đây..."
            className={cn(
              "text-3xl font-jp py-12 text-center rounded-[2rem] border-2 transition-all shadow-lg",
              !showResult ? "border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-50 bg-white" : (isCorrect ? "bg-green-50 border-green-500 text-green-800" : "bg-red-50 border-red-500 text-red-800")
            )}
            disabled={showResult}
            autoComplete="off"
          />
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex gap-2">
             <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowKeyboard(!showKeyboard)}
                className={cn(
                  "h-12 w-12 rounded-2xl transition-all",
                  showKeyboard ? "bg-sky-100 text-sky-600" : "text-slate-400 hover:text-sky-500"
                )}
             >
                <Keyboard className="h-6 w-6" />
             </Button>
          </div>
          <AnimatePresence>
            {showResult && (
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md"
              >
                {isCorrect ? (
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-500" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showKeyboard && !showResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-4">
                <div className="flex justify-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setKeyboardType('hira')}
                    className={cn(
                      "px-4 py-1 rounded-full text-xs font-bold transition-all",
                      keyboardType === 'hira' ? "bg-sky-500 text-white" : "bg-white text-slate-400 border"
                    )}
                  >
                    あ/Hiragana
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeyboardType('kata')}
                    className={cn(
                      "px-4 py-1 rounded-full text-xs font-bold transition-all",
                      keyboardType === 'kata' ? "bg-sky-500 text-white" : "bg-white text-slate-400 border"
                    )}
                  >
                    ア/Katakana
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {(keyboardType === 'hira' ? HIRAGANA_GRID : KATAKANA_GRID).flat().map((char, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleKeyClick(char)}
                      disabled={char === '（' || char === '）'}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-jp text-lg transition-all shadow-sm",
                        char === '（' || char === '）' 
                          ? "opacity-0 cursor-default" 
                          : "bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 active:scale-90"
                      )}
                    >
                      {char}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleVirtualBackspace}
                    className="w-20 h-10 bg-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-300 transition-all active:scale-95"
                  >
                    <Delete className="h-5 w-5 text-slate-600" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showResult ? (
          <div className="flex gap-4 justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleHintClick}
              disabled={hintCount >= currentQuestion.reading.length}
              className="px-8 py-7 rounded-2xl border-amber-200 text-amber-600 hover:bg-amber-50 gap-3 font-bold transition-all"
            >
              <HelpCircle className="h-5 w-5" />
              Gợi ý {hintCount > 0 && `(${hintCount})`}
            </Button>
            <button 
              type="submit" 
              disabled={!userInput.trim()}
              className="flex-1 max-w-[200px] bg-slate-900 text-white rounded-2xl py-5 font-bold shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
            >
              Kiểm tra
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Context feedback when wrong */}
            {!isCorrect && (
              <Card className="bg-slate-900 text-white border-0 shadow-xl rounded-[2.5rem]">
                <CardContent className="py-8 text-center space-y-3">
                  <p className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">Đáp án chính xác</p>
                  <p className="text-4xl font-jp font-black text-emerald-400 tracking-wider transition-all">{currentQuestion.reading}</p>
                  <div className="pt-2 flex items-center justify-center gap-2 text-sm text-slate-300 italic">
                    <BookOpen className="h-4 w-4" />
                    {currentQuestion.word} — {currentQuestion.meaning}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => speak(currentQuestion.word)}
                className="py-7 px-8 rounded-2xl border-slate-200 hover:bg-slate-50 gap-3 text-slate-600 shadow-sm"
              >
                <Volume2 className="h-5 w-5" />
                Nghe lại
              </Button>
              <button 
                onClick={handleNext} 
                className="flex-1 max-w-[280px] bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-[1.5rem] py-5 font-bold shadow-2xl hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </form>
      
      <div className="flex justify-center pt-4">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-sky-500 transition-colors">
          Dừng luyện tập
        </Button>
      </div>
    </div>
  );
};
