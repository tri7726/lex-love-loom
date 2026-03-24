import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2,
  Trophy,
  X,
  Menu
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const mockQuestions = [
  {
    id: 1,
    section: 'Kiến thức ngôn ngữ',
    question: 'この___の名前は何ですか。',
    options: ['花', '鼻', '話', '放'],
    correct: 0,
    explanation: 'Hana (Hoa)'
  },
  {
    id: 2,
    section: 'Kiến thức ngôn ngữ',
    question: '山田さんは___です。',
    options: ['学生', '学制', '学正', '学生ー'],
    correct: 0,
    explanation: 'Gakusei (Học sinh)'
  },
  {
    id: 3,
    section: 'Đọc hiểu',
    question: '昨日、どこへ行きましたか。',
    options: ['デパートへ行きました。', 'デパートで行きました。', 'デパートにきました。', 'デパートへきました。'],
    correct: 0,
    explanation: 'Đi bộ đến cửa hàng bách hóa'
  }
];

const EXAM_DURATION = 7200; // 120 minutes

// Map examId -> JLPT level label
const EXAM_LEVELS: Record<number, string> = {
  1: 'N5',
  2: 'N5',
  3: 'N4',
};

export const JLPTMockExam = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isExamFinished, setIsExamFinished] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(false);

  // Timer
  useEffect(() => {
    if (isExamFinished) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExamFinished]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateScore = () => {
    let correct = 0;
    mockQuestions.forEach((q, idx) => {
      if (answers[idx] === q.correct) correct++;
    });
    return Math.floor((correct / mockQuestions.length) * 180);
  };

  const handleFinish = async () => {
    if (savedRef.current) return;
    savedRef.current = true;
    setIsExamFinished(true);
    setShowSubmitDialog(false);

    if (!user) return;

    const score = calculateScore();
    const timeTaken = EXAM_DURATION - timeLeft;
    const numericExamId = Number(examId) || 1;
    const level = EXAM_LEVELS[numericExamId] ?? 'N5';

    setSaving(true);
    await (supabase.from('mock_exam_results' as any) as any).insert({
      user_id: user.id,
      exam_id: numericExamId,
      score,
      max_score: 180,
      time_taken: timeTaken,
      completed_at: new Date().toISOString(),
      level,
    });
    setSaving(false);
  };

  if (isExamFinished) {
    const finalScore = calculateScore();
    const timeTaken = EXAM_DURATION - timeLeft;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full space-y-8"
        >
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-gold/10 flex items-center justify-center">
              <Trophy className="h-12 w-12 text-gold" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold font-display">Kết quả bài thi</h1>
            <p className="text-muted-foreground">Chúc mừng bạn đã hoàn thành bài thi thử N5!</p>
          </div>
          
          <Card className="border-2 border-gold/20 shadow-elevated overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground uppercase">Tổng điểm đạt được</p>
                <h2 className="text-6xl font-bold text-gradient-gold">
                  {finalScore}<span className="text-2xl text-muted-foreground ml-1">/180</span>
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-2xl font-bold">{Math.floor((finalScore / 180) * 100)}%</p>
                  <p className="text-xs text-muted-foreground uppercase">Tỷ lệ đúng</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-2xl font-bold">{formatTime(timeTaken)}</p>
                  <p className="text-xs text-muted-foreground uppercase">Thời gian làm</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Badge className={finalScore >= 80 ? 'bg-matcha text-white' : 'bg-destructive'}>
                  {finalScore >= 80 ? 'ĐẠT (PASS)' : 'CHƯA ĐẠT (FAIL)'}
                </Badge>
                {saving && (
                  <p className="text-xs text-muted-foreground">Đang lưu kết quả...</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <Button className="w-full h-12 text-lg font-bold" onClick={() => navigate('/learning-path')}>
              Về lộ trình học tập
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate('/mock-tests')}>
              Làm đề khác
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQ = mockQuestions[currentQuestionIdx];

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Exam Header */}
      <header className="h-16 bg-background border-b px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="md:hidden">
            <X className="h-5 w-5" />
          </Button>
          <div className="hidden md:flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            <h2 className="font-bold">Đề thi thử N5 - Đề số 1</h2>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-bold text-lg ${timeLeft < 300 ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-primary/10 text-primary'}`}>
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
          <Button variant="destructive" className="font-bold shadow-soft" onClick={() => setShowSubmitDialog(true)}>
            Nộp bài
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Question Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 flex justify-center">
          <div className="max-w-3xl w-full flex flex-col gap-8">
            <div className="space-y-2">
              <Badge variant="secondary" className="bg-sakura/10 text-sakura font-bold text-sm uppercase tracking-widest px-3 py-1">
                Phần: {currentQ.section}
              </Badge>
              <h1 className="text-2xl md:text-3xl font-jp font-bold leading-relaxed pt-2">
                <span className="text-muted-foreground mr-4">Câu {currentQuestionIdx + 1}:</span>
                {currentQ.question}
              </h1>
            </div>

            <div className="grid gap-4">
              {currentQ.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => setAnswers({ ...answers, [currentQuestionIdx]: idx })}
                  className={`
                    w-full text-left p-6 rounded-2xl border-2 transition-all flex items-center gap-4 group
                    ${answers[currentQuestionIdx] === idx 
                      ? 'border-primary bg-primary/5 shadow-soft ring-1 ring-primary/20' 
                      : 'border-background bg-background hover:border-primary/20 hover:bg-muted/50 shadow-sm'}
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
                    ${answers[currentQuestionIdx] === idx ? 'bg-primary text-white border-primary' : 'bg-muted border-transparent group-hover:bg-primary/10'}
                  `}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-lg font-medium">{option}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-10 mt-auto border-t">
              <Button 
                variant="ghost" 
                size="lg" 
                className="gap-2 font-bold px-8 h-12"
                onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIdx === 0}
              >
                <ChevronLeft className="h-5 w-5" />
                Câu trước
              </Button>
              
              <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground font-medium">
                {currentQuestionIdx + 1} / {mockQuestions.length} câu hỏi
              </div>

              {currentQuestionIdx === mockQuestions.length - 1 ? (
                <Button 
                  size="lg" 
                  className="gap-2 bg-gradient-to-r from-sakura to-pink-500 hover:shadow-sakura transition-all font-bold px-10 h-12"
                  onClick={() => setShowSubmitDialog(true)}
                >
                  Hoàn thành
                  <CheckCircle2 className="h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  className="gap-2 font-bold px-8 h-12 shadow-soft"
                  onClick={() => setCurrentQuestionIdx(prev => Math.min(mockQuestions.length - 1, prev + 1))}
                >
                  Câu tiếp
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* Sidebar Question Navigator */}
        <aside className={`bg-background border-l transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
          <div className="p-6 border-b flex items-center justify-between shrink-0">
            <h3 className="font-bold flex items-center gap-2">
              <Menu className="h-4 w-4" />
              Bảng câu hỏi
            </h3>
            <Badge variant="outline">{Object.keys(answers).length}/{mockQuestions.length}</Badge>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-5 gap-3">
              {mockQuestions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestionIdx(idx)}
                  className={`
                    h-10 rounded-lg text-sm font-bold flex items-center justify-center transition-all
                    ${currentQuestionIdx === idx ? 'ring-2 ring-primary ring-offset-2' : ''}
                    ${answers[idx] !== undefined ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}
                  `}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6 border-t space-y-4 shrink-0 bg-muted/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <div className="w-3 h-3 rounded-sm bg-primary" /> Đã trả lời
              <div className="w-3 h-3 rounded-sm bg-muted ml-2" /> Chưa trả lời
            </div>
            <Button variant="outline" className="w-full gap-2 border-primary/20 hover:bg-primary/5 h-12" onClick={() => setIsSidebarOpen(false)}>
              Ẩn bảng điều khiển
            </Button>
          </div>
        </aside>
        
        {!isSidebarOpen && (
          <Button 
            variant="secondary" 
            size="icon" 
            className="fixed right-6 bottom-20 z-40 rounded-full shadow-elevated h-12 w-12 border-2 border-primary/20"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        )}
      </div>

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nộp bài thi?</DialogTitle>
            <DialogDescription>
              Bạn còn <strong>{formatTime(timeLeft)}</strong> thời gian và đã làm <strong>{Object.keys(answers).length}/{mockQuestions.length}</strong> câu hỏi. Bạn có chắc chắn muốn nộp bài ngay bây giờ không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex sm:justify-between gap-3 pt-6">
            <Button variant="ghost" onClick={() => setShowSubmitDialog(false)} className="flex-1">Tiếp tục làm bài</Button>
            <Button onClick={handleFinish} className="flex-1 font-bold">Nộp bài ngay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
