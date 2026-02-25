import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Clock, 
  ChevronRight, 
  BarChart, 
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';

const mockTests = [
  {
    id: 1,
    title: 'Đề thi thử N5 - Đề số 1',
    level: 'N5',
    duration: 120, // minutes
    questions: 70,
    difficulty: 'Cơ bản',
    participants: 1250,
    completed: true,
    lastScore: 165,
    maxScore: 180,
    sections: ['Từ vựng', 'Ngữ pháp', 'Đọc hiểu', 'Nghe hiểu']
  },
  {
    id: 2,
    title: 'Đề thi thử N5 - Đề số 2',
    level: 'N5',
    duration: 120,
    questions: 70,
    difficulty: 'Trung bình',
    participants: 840,
    completed: false,
    sections: ['Từ vựng', 'Ngữ pháp', 'Đọc hiểu', 'Nghe hiểu']
  },
  {
    id: 3,
    title: 'Đề thi thử N4 - Đề số 1',
    level: 'N4',
    duration: 135,
    questions: 80,
    difficulty: 'Cơ bản',
    participants: 520,
    completed: false,
    sections: ['Từ vựng', 'Ngữ pháp', 'Đọc hiểu', 'Nghe hiểu']
  }
];

export const MockTestCenter = () => {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const filteredTests = mockTests.filter(test => !selectedLevel || test.level === selectedLevel);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      <main className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
             <Link to="/learning-path">
              <Button variant="ghost" size="sm" className="gap-2 mb-2">
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
            </Link>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Trophy className="h-8 w-8 text-gold" />
              Trung tâm Thi thử JLPT
            </h1>
            <p className="text-muted-foreground">
              Rèn luyện kỹ năng làm bài thi với các đề kiểm tra mô phỏng cấu trúc thi thực tế.
            </p>
          </div>
          
          <div className="bg-muted p-2 rounded-lg flex gap-1">
            {['All', 'N5', 'N4', 'N3'].map((l) => (
              <Button
                key={l}
                variant={selectedLevel === (l === 'All' ? null : l) ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedLevel(l === 'All' ? null : l)}
                className="font-bold px-4"
              >
                {l}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-sakura/5 border-sakura/20 shadow-soft">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-sakura text-white shadow-sakura">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Đã hoàn thành</p>
                <h3 className="text-2xl font-bold font-display">12 Đề</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-indigo-500/5 border-indigo-500/20 shadow-soft">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500 text-white shadow-indigo">
                <BarChart className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Điểm trung bình</p>
                <h3 className="text-2xl font-bold font-display">145/180</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gold/5 border-gold/20 shadow-soft">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gold text-white shadow-gold">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Thời gian học luyện</p>
                <h3 className="text-2xl font-bold font-display">24h 45m</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tests List */}
        <div className="grid gap-6">
          {filteredTests.map((test, index) => (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-elevated transition-all group border-l-4 border-l-primary/20 overflow-hidden">
                <CardContent className="p-0 flex flex-col md:flex-row">
                  <div className="p-6 flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-white font-bold">{test.level}</Badge>
                      <Badge variant="outline">{test.difficulty}</Badge>
                      {test.completed && (
                        <Badge variant="secondary" className="bg-matcha/10 text-matcha gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Đã làm
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                      {test.title}
                    </h3>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" /> {test.duration} phút
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" /> {test.questions} câu hỏi
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> {test.participants.toLocaleString()} người đã làm
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                       {test.sections.map((s, i) => (
                         <span key={i} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-muted rounded">
                           {s}
                         </span>
                       ))}
                    </div>
                  </div>

                  <div className="bg-muted/30 p-6 md:w-64 border-l flex flex-col justify-center gap-4 text-center">
                    {test.completed ? (
                      <div className="space-y-3">
                         <div className="space-y-1">
                           <p className="text-xs text-muted-foreground uppercase font-bold">Điểm gần nhất</p>
                           <h4 className="text-2xl font-bold text-matcha">{test.lastScore}/{test.maxScore}</h4>
                         </div>
                         <Button className="w-full gap-2" variant="outline">
                           Xem kết quả
                         </Button>
                      </div>
                    ) : (
                      <Link to={`/mock-exam/${test.id}`} className="w-full">
                        <Button className="w-full gap-2 h-12 text-lg font-bold shadow-soft">
                          Bắt đầu ngay
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Info Box */}
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="p-6 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-gold shrink-0 mt-1" />
            <div className="space-y-1">
              <h4 className="font-bold">Lưu ý khi làm đề thi thử</h4>
              <p className="text-sm text-muted-foreground">
                Đề thi sẽ được tính giờ như khi đi thi thật. Bạn không thể tạm dừng một khi đã bắt đầu. Hãy đảm bảo bạn có đủ thời gian và không bị làm phiền trong suốt quá trình làm bài.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
