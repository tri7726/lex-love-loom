import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, XCircle, Trophy, RotateCcw, Zap, Clock, 
  Target, Brain, Headphones, PenTool, Shuffle, Volume2,
  Star, Award, TrendingUp, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import Navigation from '@/components/Navigation';
import { useTTS } from '@/hooks/useTTS';
import { cn } from '@/lib/utils';

type QuizMode = 'classic' | 'speed' | 'listening' | 'writing';

interface QuizQuestion {
  id: string;
  question: string;
  questionJp?: string;
  options: string[];
  correctAnswer: number;
  category: 'vocabulary' | 'grammar' | 'kanji' | 'culture';
  difficulty: 'easy' | 'medium' | 'hard';
}

const sampleQuestions: QuizQuestion[] = [
  {
    id: '1',
    question: '"おはようございます" nghĩa là gì?',
    questionJp: 'おはようございます',
    options: ['Chào buổi tối', 'Chào buổi sáng', 'Chúc ngủ ngon', 'Xin chào'],
    correctAnswer: 1,
    category: 'vocabulary',
    difficulty: 'easy',
  },
  {
    id: '2',
    question: 'Làm sao nói "Cảm ơn" trong tiếng Nhật?',
    options: ['すみません', 'ありがとう', 'ごめんなさい', 'おねがいします'],
    correctAnswer: 1,
    category: 'vocabulary',
    difficulty: 'easy',
  },
  {
    id: '3',
    question: '"食べる" (taberu) có nghĩa là gì?',
    questionJp: '食べる',
    options: ['Uống', 'Ngủ', 'Ăn', 'Đi bộ'],
    correctAnswer: 2,
    category: 'vocabulary',
    difficulty: 'medium',
  },
  {
    id: '4',
    question: 'Trợ từ nào dùng để đánh dấu chủ đề câu?',
    options: ['を', 'に', 'は', 'で'],
    correctAnswer: 2,
    category: 'grammar',
    difficulty: 'medium',
  },
  {
    id: '5',
    question: '"大きい" (ookii) có nghĩa là gì?',
    questionJp: '大きい',
    options: ['Nhỏ', 'Lớn', 'Nhanh', 'Chậm'],
    correctAnswer: 1,
    category: 'kanji',
    difficulty: 'easy',
  },
  {
    id: '6',
    question: 'Động từ nào ở thể て (te-form) là "行って"?',
    questionJp: '行って',
    options: ['見る', '食べる', '行く', '来る'],
    correctAnswer: 2,
    category: 'grammar',
    difficulty: 'hard',
  },
  {
    id: '7',
    question: '"毎日" đọc là gì?',
    questionJp: '毎日',
    options: ['まいにち', 'まいじつ', 'きょう', 'あした'],
    correctAnswer: 0,
    category: 'kanji',
    difficulty: 'medium',
  },
  {
    id: '8',
    question: 'Câu nào đúng ngữ pháp?',
    options: ['本を読みます', '本が読みます', '本に読みます', '本で読みます'],
    correctAnswer: 0,
    category: 'grammar',
    difficulty: 'hard',
  },
];

const modeConfig = {
  classic: { icon: Target, label: 'Cổ điển', color: 'text-primary', description: 'Trả lời không giới hạn thời gian' },
  speed: { icon: Zap, label: 'Tốc độ', color: 'text-gold', description: '10 giây mỗi câu' },
  listening: { icon: Headphones, label: 'Nghe', color: 'text-matcha', description: 'Nghe và chọn đáp án' },
  writing: { icon: PenTool, label: 'Viết', color: 'text-sakura', description: 'Tự gõ đáp án' },
};

const categoryColors = {
  vocabulary: 'bg-blue-500/10 text-blue-600',
  grammar: 'bg-purple-500/10 text-purple-600',
  kanji: 'bg-pink-500/10 text-pink-600',
  culture: 'bg-amber-500/10 text-amber-600',
};

const difficultyConfig = {
  easy: { label: 'Dễ', color: 'bg-matcha/20 text-matcha', xp: 5 },
  medium: { label: 'Vừa', color: 'bg-gold/20 text-gold', xp: 10 },
  hard: { label: 'Khó', color: 'bg-destructive/20 text-destructive', xp: 20 },
};

const Quiz = () => {
  const [mode, setMode] = useState<QuizMode>('classic');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState<(number | string)[]>([]);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [totalXP, setTotalXP] = useState(0);
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestion[]>([]);

  const { speak, isSpeaking, isSupported: ttsSupported } = useTTS({ lang: 'ja-JP' });
  
  const question = shuffledQuestions[currentQuestion];
  const progress = shuffledQuestions.length > 0 
    ? ((currentQuestion + 1) / shuffledQuestions.length) * 100 
    : 0;

  // Shuffle questions when starting
  const startQuiz = () => {
    const shuffled = [...sampleQuestions].sort(() => Math.random() - 0.5);
    setShuffledQuestions(shuffled);
    setIsStarted(true);
    setCurrentQuestion(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setTotalXP(0);
    setAnswers([]);
    setIsComplete(false);
  };

  // Speed mode timer
  useEffect(() => {
    if (!isStarted || mode !== 'speed' || showResult || isComplete) return;

    setTimeLeft(10);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion, mode, showResult, isStarted, isComplete]);

  // Auto-play for listening mode
  useEffect(() => {
    if (mode === 'listening' && question?.questionJp && isStarted && !showResult) {
      speak(question.questionJp);
    }
  }, [currentQuestion, mode, isStarted, showResult]);

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (mode === 'writing') {
      const isCorrect = checkWrittenAnswer();
      processAnswer(isCorrect);
    } else {
      if (selectedAnswer === null && mode !== 'speed') return;
      const isCorrect = selectedAnswer === question?.correctAnswer;
      processAnswer(isCorrect);
    }
    setShowResult(true);
  };

  const checkWrittenAnswer = (): boolean => {
    if (!question) return false;
    const correctOption = question.options[question.correctAnswer];
    const normalized = writtenAnswer.trim().toLowerCase();
    const correctNormalized = correctOption.toLowerCase();
    return normalized === correctNormalized || 
           (question.questionJp && normalized === question.questionJp.toLowerCase());
  };

  const processAnswer = (isCorrect: boolean) => {
    const xpEarned = isCorrect ? difficultyConfig[question?.difficulty || 'easy'].xp : 0;
    const streakBonus = isCorrect ? Math.floor(streak / 3) * 5 : 0;

    if (isCorrect) {
      setScore(prev => prev + 1);
      setStreak(prev => {
        const newStreak = prev + 1;
        setMaxStreak(m => Math.max(m, newStreak));
        return newStreak;
      });
      setTotalXP(prev => prev + xpEarned + streakBonus);
    } else {
      setStreak(0);
    }

    setAnswers(prev => [...prev, mode === 'writing' ? writtenAnswer : selectedAnswer ?? -1]);
  };

  const handleNext = () => {
    if (currentQuestion < shuffledQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setWrittenAnswer('');
    } else {
      setIsComplete(true);
    }
  };

  const handleRestart = () => {
    setIsStarted(false);
  };

  // Start Screen
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navigation />
        <main className="container py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            {/* Header */}
            <div className="text-center space-y-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
              >
                <Brain className="h-16 w-16 mx-auto text-primary" />
              </motion.div>
              <h1 className="text-4xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-sakura to-primary">
                Quiz Master
              </h1>
              <p className="text-muted-foreground text-lg">
                Kiểm tra kiến thức tiếng Nhật của bạn
              </p>
            </div>

            {/* Mode Selection */}
            <Card className="shadow-elevated">
              <CardHeader>
                <CardTitle>Chọn chế độ chơi</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {(Object.keys(modeConfig) as QuizMode[]).map((m) => {
                  const config = modeConfig[m];
                  const Icon = config.icon;
                  return (
                    <motion.button
                      key={m}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setMode(m)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        mode === m
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Icon className={cn("h-8 w-8 mb-2", config.color)} />
                      <h3 className="font-semibold">{config.label}</h3>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </motion.button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Stats Preview */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{sampleQuestions.length}</p>
                  <p className="text-muted-foreground">Câu hỏi</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gold">4</p>
                  <p className="text-muted-foreground">Chủ đề</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-matcha">N5-N4</p>
                  <p className="text-muted-foreground">Level</p>
                </div>
              </CardContent>
            </Card>

            {/* Start Button */}
            <Button size="lg" className="w-full h-14 text-lg gap-2" onClick={startQuiz}>
              <Shuffle className="h-5 w-5" />
              Bắt đầu Quiz
            </Button>
          </motion.div>
        </main>
      </div>
    );
  }

  // Complete Screen
  if (isComplete) {
    const percentage = Math.round((score / shuffledQuestions.length) * 100);
    const grade = percentage >= 90 ? 'S' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : 'D';
    const gradeColor = grade === 'S' ? 'text-gold' : grade === 'A' ? 'text-matcha' : grade === 'B' ? 'text-blue-500' : grade === 'C' ? 'text-orange-500' : 'text-muted-foreground';

    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navigation />
        <main className="container py-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto space-y-6"
          >
            <Card className="shadow-elevated border-2 border-gold/30 overflow-hidden">
              <div className="bg-gradient-to-br from-gold/20 to-sakura/20 p-8 text-center space-y-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <Trophy className="h-20 w-20 mx-auto text-gold" />
                </motion.div>

                <div>
                  <h2 className="text-3xl font-display font-bold mb-2">
                    Hoàn thành Quiz!
                  </h2>
                  <Badge variant="outline" className="text-sm">
                    {modeConfig[mode].label}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Grade */}
                <div className="text-center">
                  <motion.p
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring' }}
                    className={cn("text-8xl font-bold", gradeColor)}
                  >
                    {grade}
                  </motion.p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{score}/{shuffledQuestions.length}</p>
                    <p className="text-sm text-muted-foreground">Đúng</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <TrendingUp className="h-6 w-6 mx-auto mb-2 text-matcha" />
                    <p className="text-2xl font-bold">{percentage}%</p>
                    <p className="text-sm text-muted-foreground">Chính xác</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <Zap className="h-6 w-6 mx-auto mb-2 text-gold" />
                    <p className="text-2xl font-bold">{maxStreak}</p>
                    <p className="text-sm text-muted-foreground">Max Streak</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <Star className="h-6 w-6 mx-auto mb-2 text-sakura" />
                    <p className="text-2xl font-bold">+{totalXP}</p>
                    <p className="text-sm text-muted-foreground">XP</p>
                  </div>
                </div>

                {/* XP Banner */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="p-4 rounded-lg bg-gradient-to-r from-gold/20 to-sakura/20 text-center"
                >
                  <Award className="h-8 w-8 mx-auto mb-2 text-gold" />
                  <p className="font-semibold text-lg">+{totalXP} XP kiếm được!</p>
                </motion.div>

                <Button onClick={handleRestart} size="lg" className="w-full gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Chơi lại
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header with Mode & Timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={modeConfig[mode].color}>
                {React.createElement(modeConfig[mode].icon, { className: "h-4 w-4 mr-1" })}
                {modeConfig[mode].label}
              </Badge>
              {streak >= 3 && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 border-0">
                  🔥 {streak} streak
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Câu {currentQuestion + 1}/{shuffledQuestions.length}
            </div>
          </div>

          {/* Speed Mode Timer */}
          {mode === 'speed' && !showResult && (
            <motion.div
              key={currentQuestion}
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / 10) * 100}%` }}
              className={cn(
                "h-2 rounded-full transition-colors",
                timeLeft > 5 ? "bg-matcha" : timeLeft > 2 ? "bg-gold" : "bg-destructive"
              )}
            />
          )}

          {/* Progress */}
          <Progress value={progress} className="h-2" />

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              <Card className="shadow-elevated">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={categoryColors[question?.category || 'vocabulary']}>
                      {question?.category}
                    </Badge>
                    <Badge variant="outline" className={difficultyConfig[question?.difficulty || 'easy'].color}>
                      {difficultyConfig[question?.difficulty || 'easy'].label}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl leading-relaxed">
                    {mode === 'listening' ? (
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => question?.questionJp && speak(question.questionJp)}
                          disabled={isSpeaking}
                        >
                          <Volume2 className={cn("h-5 w-5", isSpeaking && "animate-pulse text-primary")} />
                        </Button>
                        <span>Nghe và chọn đáp án đúng</span>
                      </div>
                    ) : (
                      question?.question
                    )}
                  </CardTitle>
                  {question?.questionJp && mode !== 'listening' && (
                    <p className="font-jp text-2xl text-sakura mt-2">
                      {question.questionJp}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {mode === 'writing' ? (
                    <div className="space-y-4">
                      <Input
                        value={writtenAnswer}
                        onChange={(e) => setWrittenAnswer(e.target.value)}
                        placeholder="Gõ câu trả lời..."
                        className="text-lg h-14 font-jp"
                        disabled={showResult}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                      />
                      {showResult && (
                        <div className={cn(
                          "p-4 rounded-lg",
                          checkWrittenAnswer() ? "bg-matcha/10" : "bg-destructive/10"
                        )}>
                          <p className="font-medium">
                            Đáp án đúng: <span className="font-jp">{question?.options[question.correctAnswer]}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    question?.options.map((option, index) => {
                      const isSelected = selectedAnswer === index;
                      const isCorrect = index === question.correctAnswer;
                      const showCorrect = showResult && isCorrect;
                      const showWrong = showResult && isSelected && !isCorrect;

                      return (
                        <motion.button
                          key={index}
                          whileHover={{ scale: showResult ? 1 : 1.01 }}
                          whileTap={{ scale: showResult ? 1 : 0.99 }}
                          onClick={() => handleSelectAnswer(index)}
                          className={cn(
                            'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between bg-card',
                            !showResult && isSelected && 'border-primary bg-primary/10',
                            !showResult && !isSelected && 'border-border hover:border-primary/50',
                            showCorrect && 'border-matcha bg-matcha/10',
                            showWrong && 'border-destructive bg-destructive/10'
                          )}
                          disabled={showResult}
                        >
                          <span className="font-medium font-jp">{option}</span>
                          {showCorrect && <CheckCircle className="h-5 w-5 text-matcha" />}
                          {showWrong && <XCircle className="h-5 w-5 text-destructive" />}
                        </motion.button>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Action Button */}
          <div className="flex justify-center">
            {!showResult ? (
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={mode === 'writing' ? !writtenAnswer.trim() : selectedAnswer === null}
                className="w-full max-w-xs h-12"
              >
                Kiểm tra
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleNext}
                className="w-full max-w-xs h-12 gap-2"
              >
                {currentQuestion < shuffledQuestions.length - 1 ? (
                  <>
                    Tiếp theo
                    <ChevronRight className="h-5 w-5" />
                  </>
                ) : (
                  'Xem kết quả'
                )}
              </Button>
            )}
          </div>

          {/* Bottom Stats */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Điểm: <span className="font-semibold text-foreground">{score}</span></span>
            <span>XP: <span className="font-semibold text-gold">+{totalXP}</span></span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Quiz;
