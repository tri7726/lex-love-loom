import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Gamepad2, 
  Shuffle, 
  CheckCircle2, 
  Keyboard, 
  Headphones, 
  Zap,
  ArrowLeft,
  Trophy,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MatchGame } from '@/components/games/MatchGame';
import { MultipleChoiceGame } from '@/components/games/MultipleChoiceGame';
import { WriteGame } from '@/components/games/WriteGame';
import { ListeningGame } from '@/components/games/ListeningGame';
import { TypingGame } from '@/components/games/TypingGame';
import { SpeedGame } from '@/components/games/SpeedGame';
import { useToast } from '@/hooks/use-toast';
import { VocabularyItem } from '@/types/vocabulary';


type GameMode = 'hub' | 'match' | 'quiz' | 'write' | 'listening' | 'speed' | 'typing';

const gameModes = [
  {
    id: 'match' as GameMode,
    title: 'Match Game',
    titleVi: 'Ghép Cặp',
    description: 'Ghép từ tiếng Nhật với nghĩa tiếng Việt',
    icon: Shuffle,
    color: 'bg-blue-500',
    difficulty: 'Dễ',
  },
  {
    id: 'quiz' as GameMode,
    title: 'Multiple Choice',
    titleVi: 'Trắc Nghiệm',
    description: 'Chọn đáp án đúng từ 4 lựa chọn',
    icon: CheckCircle2,
    color: 'bg-green-500',
    difficulty: 'Trung bình',
  },
  {
    id: 'typing' as GameMode,
    title: 'Typing Practice',
    titleVi: 'Luyện Gõ Từ',
    description: 'Luyện gõ từ tiếng Nhật theo nghĩa',
    icon: Keyboard,
    color: 'bg-indigo-500',
    difficulty: 'Trung bình',
  },
  {
    id: 'write' as GameMode,
    title: 'Write Answer',
    titleVi: 'Gõ Đáp Án',
    description: 'Gõ câu trả lời bằng Hiragana hoặc Kanji',
    icon: Keyboard,
    color: 'bg-purple-500',
    difficulty: 'Khó',
  },
  {
    id: 'listening' as GameMode,
    title: 'Listening Challenge',
    titleVi: 'Nghe Hiểu',
    description: 'Nghe và chọn đáp án đúng',
    icon: Headphones,
    color: 'bg-orange-500',
    difficulty: 'Trung bình',
  },
  {
    id: 'speed' as GameMode,
    title: 'Speed Mode',
    titleVi: 'Tốc Độ',
    description: 'Trả lời nhanh để tăng combo điểm',
    icon: Zap,
    color: 'bg-red-500',
    difficulty: 'Thử thách',
  },
];

export const FlashcardGames = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentGame, setCurrentGame] = useState<GameMode>('hub');
  const [gameStats, setGameStats] = useState({
    totalPlayed: 0,
    correctAnswers: 0,
    streak: 0,
  });

  const fetchVocabulary = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('saved_vocabulary')
        .select('id, word, reading, meaning, mastery_level')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVocabulary(data || []);
    } catch (error) {
      console.error('Error fetching vocabulary:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchVocabulary();
    } else {
      setLoading(false);
    }
  }, [user, fetchVocabulary]);

  const updateMasteryLevel = async (wordId: string, correct: boolean) => {
    const word = vocabulary.find(v => v.id === wordId);
    if (!word) return;

    const currentLevel = word.mastery_level || 0;
    const newLevel = correct 
      ? Math.min(currentLevel + 1, 5) 
      : Math.max(currentLevel - 1, 0);

    try {
      await supabase
        .from('saved_vocabulary')
        .update({ mastery_level: newLevel })
        .eq('id', wordId);

      setVocabulary(prev => 
        prev.map(v => v.id === wordId ? { ...v, mastery_level: newLevel } : v)
      );
    } catch (error) {
      console.error('Error updating mastery level:', error);
    }
  };

  const handleGameComplete = (results: { correct: number; total: number }) => {
    setGameStats(prev => ({
      totalPlayed: prev.totalPlayed + results.total,
      correctAnswers: prev.correctAnswers + results.correct,
      streak: results.correct === results.total ? prev.streak + 1 : 0,
    }));

    toast({
      title: '🎉 Hoàn thành!',
      description: `Bạn đã trả lời đúng ${results.correct}/${results.total} câu!`,
    });
  };

  const renderGameHub = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-2">
          <Gamepad2 className="h-8 w-8 text-primary" />
          Flashcard Games
        </h1>
        <p className="text-muted-foreground">
          Học từ vựng qua các trò chơi thú vị
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="pt-4">
            <Trophy className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">{vocabulary.length}</p>
            <p className="text-xs text-muted-foreground">Từ vựng</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <Star className="h-6 w-6 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{gameStats.correctAnswers}</p>
            <p className="text-xs text-muted-foreground">Đúng</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <Zap className="h-6 w-6 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold">{gameStats.streak}</p>
            <p className="text-xs text-muted-foreground">Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Check if user has vocabulary */}
      {!user ? (
        <Card className="bg-muted/50">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Vui lòng đăng nhập để chơi game học từ vựng
            </p>
            <Button className="mt-4" onClick={() => window.location.href = '/auth'}>
              Đăng nhập
            </Button>
          </CardContent>
        </Card>
      ) : vocabulary.length < 4 ? (
        <Card className="bg-muted/50">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Bạn cần ít nhất 4 từ vựng để chơi game.
              <br />
              Hiện có: {vocabulary.length} từ
            </p>
            <Button className="mt-4" onClick={() => window.location.href = '/video-learning'}>
              Học từ mới
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Game Modes */
        <div className="grid gap-4 md:grid-cols-2">
          {gameModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <motion.div
                key={mode.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary/30"
                  onClick={() => setCurrentGame(mode.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${mode.color} text-white`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{mode.titleVi}</CardTitle>
                        <CardDescription className="text-xs">{mode.title}</CardDescription>
                      </div>
                      <Badge variant="outline">{mode.difficulty}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">{mode.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderGame = () => {
    const gameProps = {
      vocabulary,
      onComplete: handleGameComplete,
      onUpdateMastery: updateMasteryLevel,
      onBack: () => setCurrentGame('hub'),
    };

    switch (currentGame) {
      case 'match':
        return <MatchGame {...gameProps} />;
      case 'quiz':
        return <MultipleChoiceGame {...gameProps} />;
      case 'typing':
        return <TypingGame {...gameProps} />;
      case 'write':
        return <WriteGame {...gameProps} />;
      case 'listening':
        return <ListeningGame {...gameProps} />;
      case 'speed':
        return <SpeedGame {...gameProps} />;
      default:
        return renderGameHub();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navigation />
        <main className="container py-6">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <main className="container py-6">
        <div className="max-w-3xl mx-auto">
          {currentGame !== 'hub' && (
            <Button 
              variant="ghost" 
              onClick={() => setCurrentGame('hub')}
              className="mb-4 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
          )}
          {renderGame()}
        </div>
      </main>
    </div>
  );
};

// export default FlashcardGames;
