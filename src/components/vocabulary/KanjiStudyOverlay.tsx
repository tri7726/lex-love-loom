import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  RotateCcw, 
  Target, 
  Info,
  Brain,
  Pencil,
  Zap,
  Timer,
  Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { KanjiCanvas } from '@/components/kanji/KanjiCanvas';
import { cn } from '@/lib/utils';
import { KANJI_DB } from '@/data/kanji-db';

interface KanjiStudyOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  unitKanji: any[];
  onCompleteUnit?: () => void;
}

type StudyPhase = 'LEARN' | 'QUIZ' | 'WRITE_GUIDED' | 'WRITE_BLIND' | 'COMPLETE';

export const KanjiStudyOverlay: React.FC<KanjiStudyOverlayProps> = ({
  isOpen,
  onClose,
  unitKanji,
  onCompleteUnit,
}) => {
  const [shuffledKanji, setShuffledKanji] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<StudyPhase>('LEARN');
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [timerActive, setTimerActive] = useState(false);
  
  // Shuffle kanji on mount
  React.useEffect(() => {
    if (unitKanji && unitKanji.length > 0) {
      setShuffledKanji([...unitKanji].sort(() => Math.random() - 0.5));
    }
  }, [unitKanji]);

  const currentKanji = shuffledKanji[currentIndex];
  const progress = shuffledKanji.length > 0 ? ((currentIndex) / shuffledKanji.length) * 100 : 0;

  // Generate quiz options
  const generateOptions = (correctMeaning: string) => {
    const distractors = KANJI_DB
      .filter(k => k.meaning_vi !== correctMeaning)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(k => k.meaning_vi);
    
    return [correctMeaning, ...distractors].sort(() => Math.random() - 0.5);
  };

  const startQuiz = () => {
    setQuizOptions(generateOptions(currentKanji.meaning_vi));
    setQuizAnswered(false);
    setQuizCorrect(null);
    setTimeLeft(10);
    setTimerActive(true);
    setCurrentPhase('QUIZ');
  };

  // Timer logic
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0 && !quizAnswered) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !quizAnswered) {
      handleQuizAnswer(''); // Fail for timeout
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, quizAnswered]);

  const handleQuizAnswer = (meaning: string) => {
    if (quizAnswered) return;
    const isCorrect = meaning === currentKanji.meaning_vi;
    setQuizAnswered(true);
    setQuizCorrect(isCorrect);
    setTimerActive(false);
    
    if (isCorrect) {
      setStreak(prev => prev + 1);
      setTimeout(() => setCurrentPhase('WRITE_GUIDED'), 1000);
    } else {
      setStreak(0);
      // Let user see correct answer before they can retry or go back to learn
      setTimeout(() => setCurrentPhase('LEARN'), 2000);
    }
  };

  const handleWriteGuidedComplete = () => {
    setCurrentPhase('WRITE_BLIND');
  };

  const handleWriteBlindComplete = () => {
    if (currentIndex < shuffledKanji.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCurrentPhase('LEARN');
    } else {
      setCurrentPhase('COMPLETE');
      if (onCompleteUnit) onCompleteUnit();
    }
  };

  const getPhaseTitle = () => {
    switch (currentPhase) {
      case 'LEARN': return 'Ghi nhớ chữ cái';
      case 'QUIZ': return 'Kiểm tra nhận diện';
      case 'WRITE_GUIDED': return 'Luyện viết (Có hướng dẫn)';
      case 'WRITE_BLIND': return 'Thử thách: Viết từ trí nhớ';
      default: return 'Hoàn thành';
    }
  };

  if (!isOpen || shuffledKanji.length === 0) return null;
  if (currentPhase === 'COMPLETE') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-cream z-[100] flex flex-col items-center justify-center text-center p-6"
        >
          <div className="max-w-md w-full space-y-8 bg-white p-12 rounded-[50px] shadow-2xl border border-sakura/10 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sakura via-gold to-matcha" />
             
             <div className="w-32 h-32 rounded-full bg-matcha/10 flex items-center justify-center mx-auto mb-6">
               <Trophy className="h-16 w-16 text-matcha animate-bounce" />
             </div>
             
             <div className="space-y-2">
               <h1 className="text-4xl font-black text-sumi uppercase tracking-tight">Thử thách Hoàn tất!</h1>
               <p className="text-muted-foreground text-lg">Bạn đã chinh phục {shuffledKanji.length} chữ Kanji với tinh thần võ sĩ đạo.</p>
             </div>
             
             <div className="grid grid-cols-2 gap-4 py-6">
               <div className="p-4 bg-sakura/5 rounded-3xl border border-sakura/10">
                 <span className="text-[10px] font-bold text-sakura uppercase tracking-widest block mb-1">Max Streak</span>
                 <p className="text-3xl font-black text-sumi">{streak}</p>
               </div>
               <div className="p-4 bg-gold/5 rounded-3xl border border-gold/10">
                 <span className="text-[10px] font-bold text-gold uppercase tracking-widest block mb-1">Cấp độ</span>
                 <p className="text-3xl font-black text-sumi">MASTER</p>
               </div>
             </div>
             
             <Button 
               size="lg" 
               onClick={onClose}
               className="w-full h-16 rounded-2xl bg-sumi text-white hover:bg-sumi/90 text-lg font-bold shadow-xl transition-all hover:scale-[1.02]"
             >
               QUAY LẠI LỘ TRÌNH
             </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!currentKanji) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-cream z-[100] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="h-20 border-b border-sakura/10 flex items-center justify-between px-6 bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
              <X className="h-6 w-6 text-muted-foreground" />
            </Button>
            <div className="h-8 w-px bg-sakura/20 mx-2" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-sakura uppercase tracking-widest">{getPhaseTitle()}</span>
              <h3 className="font-bold text-sumi">Bài {currentKanji.lesson} • Chữ {currentIndex + 1}/{unitKanji.length}</h3>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-8">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex gap-1">
                {(['LEARN', 'QUIZ', 'WRITE_GUIDED', 'WRITE_BLIND'] as const).map((p, i) => (
                  <div 
                    key={p} 
                    className={cn(
                      "h-1.5 w-8 rounded-full transition-all duration-300",
                      currentPhase === p ? "bg-sakura w-12" : (['LEARN', 'QUIZ', 'WRITE_GUIDED', 'WRITE_BLIND'] as string[]).indexOf(currentPhase) > i || currentPhase === 'COMPLETE' ? "bg-matcha" : "bg-sakura/10"
                    )}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold text-matcha uppercase tracking-tighter">Mastery Level: {currentIndex + 1}</span>
            </div>
            <Progress value={((currentIndex + 1) / unitKanji.length) * 100} className="h-2 bg-sakura/10" />
          </div>

              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 px-3 py-1 bg-sakura/10 text-sakura rounded-lg font-bold border border-sakura/20">
                   <Zap className="h-4 w-4 fill-sakura" />
                   <span>STREAK: {streak}</span>
                 </div>
                 <div className="hidden md:flex items-center gap-2 bg-gold/10 px-3 py-1.5 rounded-full border border-gold/20">
                   <Trophy className="h-4 w-4 text-gold" />
                   <span className="text-sm font-bold text-gold">Cấp độ Thách thức</span>
                 </div>
              </div>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {currentPhase === 'LEARN' && (
              <motion.div
                key="learn"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col lg:flex-row h-full items-stretch"
              >
                <div className="flex-1 p-8 lg:p-16 flex flex-col justify-center bg-gradient-to-br from-sakura/5 to-transparent">
                  <div className="text-center space-y-6 max-w-lg mx-auto">
                    <div className="relative inline-block">
                      <h1 className="text-[180px] font-jp font-bold text-sumi leading-none drop-shadow-2xl select-none">
                        {currentKanji.character}
                      </h1>
                      <Badge className="absolute -top-4 -right-4 bg-sakura text-white px-3 py-1 rounded-full text-lg shadow-lg">
                        {currentKanji.level}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-5xl font-black text-sakura uppercase tracking-widest drop-shadow-sm">
                        {currentKanji.hanviet}
                      </h2>
                      <p className="text-3xl text-sumi/80 italic font-medium">({currentKanji.meaning_vi})</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 pt-10">
                      <div className="bg-white/80 p-6 rounded-3xl border border-sakura/10 shadow-sm transition-transform hover:scale-105">
                        <span className="text-xs font-bold text-sakura uppercase tracking-wider block mb-2">Âm On</span>
                        <p className="text-2xl font-jp font-bold text-sumi">{currentKanji.on_reading || '---'}</p>
                      </div>
                      <div className="bg-white/80 p-6 rounded-3xl border border-matcha/10 shadow-sm transition-transform hover:scale-105">
                        <span className="text-xs font-bold text-matcha uppercase tracking-wider block mb-2">Âm Kun</span>
                        <p className="text-2xl font-jp font-bold text-sumi">{currentKanji.kun_reading || '---'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 bg-white/40 p-8 lg:p-16 flex flex-col justify-center border-l border-sakura/5">
                  <div className="max-w-md mx-auto space-y-10">
                    <div className="bg-white p-8 rounded-[40px] border border-sakura/10 shadow-xl shadow-sakura/5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                        <Brain className="h-20 w-20 text-sakura" />
                      </div>
                      <h4 className="font-bold text-sumi text-xl mb-4 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-gold" />
                        Ghi nhớ nhanh
                      </h4>
                      <p className="text-sumi/70 leading-relaxed text-lg italic">
                        "{currentKanji.mnemonic || 'Hãy ghi nhớ hình dáng và ý nghĩa của chữ này trước khi bắt đầu thử thách!'}"
                      </p>
                    </div>
                    
                    <Button 
                      size="lg" 
                      onClick={startQuiz}
                      className="w-full h-20 rounded-[30px] bg-sakura hover:bg-sakura-dark text-white text-xl font-black gap-3 shadow-2xl shadow-sakura/30 group"
                    >
                      BẮT ĐẦU THỬ THÁCH
                      <ChevronRight className="h-8 w-8 transition-transform group-hover:translate-x-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {currentPhase === 'QUIZ' && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto p-8 h-full flex flex-col items-center justify-center text-center space-y-12"
              >
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-sakura/10 text-sakura rounded-full font-bold text-sm">
                      <Timer className="h-4 w-4" />
                      CHỌN NGHĨA ĐÚNG: {timeLeft}s
                    </div>
                    <div className="w-64 h-2 bg-sakura/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: '100%' }}
                        animate={{ width: `${(timeLeft / 10) * 100}%` }}
                        className={cn(
                          "h-full transition-colors",
                          timeLeft < 4 ? "bg-destructive" : "bg-sakura"
                        )}
                      />
                    </div>
                  </div>
                  <h1 className="text-[200px] font-jp font-bold text-sumi leading-none drop-shadow-2xl">
                    {currentKanji.character}
                  </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                  {quizOptions.map((opt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className={cn(
                        "h-20 text-xl font-bold rounded-2xl border-2 transition-all",
                        quizAnswered && opt === currentKanji.meaning_vi && "bg-matcha/20 border-matcha text-matcha",
                        quizAnswered && opt !== currentKanji.meaning_vi && quizCorrect === false && "bg-destructive/10 border-destructive opacity-50",
                        !quizAnswered && "hover:border-sakura hover:text-sakura hover:scale-[1.02]"
                      )}
                      onClick={() => handleQuizAnswer(opt)}
                      disabled={quizAnswered}
                    >
                      {opt}
                      {quizAnswered && opt === currentKanji.meaning_vi && <CheckCircle2 className="ml-2 h-6 w-6" />}
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}

            {(currentPhase === 'WRITE_GUIDED' || currentPhase === 'WRITE_BLIND') && (
              <motion.div
                key={currentPhase}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col lg:flex-row h-full items-stretch"
              >
                <div className="hidden lg:flex flex-1 p-16 flex-col justify-center space-y-8 bg-muted/5">
                  <div className="space-y-2">
                    <span className="text-sm font-bold text-sakura uppercase tracking-widest block">Mục tiêu viết</span>
                    <h2 className="text-6xl font-black text-sumi uppercase">{currentKanji.hanviet}</h2>
                    <p className="text-2xl text-muted-foreground italic">({currentKanji.meaning_vi})</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-sakura/10 shadow-sm">
                      <div className="h-10 w-10 rounded-xl bg-sakura/10 flex items-center justify-center text-sakura font-bold">1</div>
                      <p className="text-sm font-medium">Viết theo thứ tự các nét từ trên xuống dưới, từ trái sang phải.</p>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-sakura/10 shadow-sm">
                      <div className="h-10 w-10 rounded-xl bg-sakura/10 flex items-center justify-center text-sakura font-bold">2</div>
                      <p className="text-sm font-medium">Đảm bảo các nét thanh, nét đậm và các điểm dừng đúng vị trí.</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white p-6 lg:p-12 flex flex-col items-center justify-center border-l border-sakura/10 relative">
                   <div className="absolute top-8 left-8">
                     <Badge variant="outline" className={cn(
                       "px-4 py-2 text-lg font-bold gap-2 rounded-xl",
                       currentPhase === 'WRITE_BLIND' ? "text-destructive border-destructive bg-destructive/5" : "text-matcha border-matcha bg-matcha/5"
                     )}>
                       {currentPhase === 'WRITE_BLIND' ? <Zap className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
                       {currentPhase === 'WRITE_BLIND' ? "VIẾT KHÔNG DẪN" : "CÓ HƯỚNG DẪN"}
                     </Badge>
                   </div>

                   <div className="w-full max-w-md space-y-8">
                     <KanjiCanvas 
                      key={`${currentPhase}-${currentKanji.character}`}
                      kanji={currentKanji.character} 
                      meaning={currentKanji.meaning_vi}
                      showGuide={currentPhase === 'WRITE_GUIDED'}
                      onComplete={currentPhase === 'WRITE_GUIDED' ? handleWriteGuidedComplete : handleWriteBlindComplete}
                     />
                   </div>
                </div>
              </motion.div>
            )}

            {/* Redundant COMPLETE block removed since we have an early return for it */}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
