import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Volume2,
  Trash2,
  Search,
  Filter,
  ArrowUpDown,
  Loader2,
  BookMarked,
  Calendar,
  Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Navigation from '@/components/Navigation';
import { useWordHistory } from '@/hooks/useWordHistory';
import { useTTS } from '@/hooks/useTTS';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type SortOption = 'newest' | 'oldest' | 'alphabetical' | 'mastery';

const SavedVocabulary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const { history, isLoading, removeWord, refreshHistory } = useWordHistory();
  const { speak, isSpeaking } = useTTS({ lang: 'ja-JP' });
  const { user } = useAuth();

  // Filter and sort vocabulary
  const filteredVocabulary = React.useMemo(() => {
    let filtered = history.filter((item) => {
      const query = searchQuery.toLowerCase();
      return (
        item.word.toLowerCase().includes(query) ||
        item.meaning.toLowerCase().includes(query) ||
        (item.reading?.toLowerCase().includes(query) ?? false)
      );
    });

    // Sort
    switch (sortBy) {
      case 'oldest':
        filtered = [...filtered].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case 'alphabetical':
        filtered = [...filtered].sort((a, b) => a.word.localeCompare(b.word));
        break;
      case 'mastery':
        filtered = [...filtered].sort(
          (a, b) => (b.mastery_level || 0) - (a.mastery_level || 0)
        );
        break;
      case 'newest':
      default:
        // Already sorted by newest from the hook
        break;
    }

    return filtered;
  }, [history, searchQuery, sortBy]);

  const getMasteryBadge = (level: number | null) => {
    const masteryLevel = level || 0;
    if (masteryLevel >= 80) {
      return <Badge className="bg-matcha text-white">Thành thạo</Badge>;
    } else if (masteryLevel >= 50) {
      return <Badge className="bg-gold text-gold-foreground">Đang học</Badge>;
    }
    return <Badge variant="secondary">Mới</Badge>;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <BookMarked className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Đăng nhập để xem từ vựng</h2>
              <p className="text-muted-foreground mb-4">
                Bạn cần đăng nhập để lưu và quản lý từ vựng cá nhân
              </p>
              <Button asChild>
                <a href="/auth">Đăng nhập</a>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookMarked className="h-6 w-6 text-primary" />
              Từ vựng đã lưu
            </h1>
            <p className="text-muted-foreground">
              {history.length} từ vựng trong bộ sưu tập
            </p>
          </div>
          <Button variant="outline" onClick={refreshHistory} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Làm mới'
            )}
          </Button>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm từ vựng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-full sm:w-48">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Mới nhất</SelectItem>
                  <SelectItem value="oldest">Cũ nhất</SelectItem>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                  <SelectItem value="mastery">Độ thành thạo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Vocabulary List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredVocabulary.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              {searchQuery ? (
                <>
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Không tìm thấy từ vựng</h3>
                  <p className="text-muted-foreground">
                    Thử tìm kiếm với từ khóa khác
                  </p>
                </>
              ) : (
                <>
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Chưa có từ vựng nào</h3>
                  <p className="text-muted-foreground">
                    Lưu từ vựng khi học qua video để xem lại tại đây
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredVocabulary.map((vocab) => (
                <motion.div
                  key={vocab.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="shadow-card hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          {/* Word and Reading */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={() => speak(vocab.word)}
                              className="flex items-center gap-2 hover:text-primary transition-colors"
                              title="Nhấn để nghe phát âm"
                            >
                              <Volume2 className={`h-5 w-5 ${isSpeaking ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                              <span className="font-jp text-xl font-bold">{vocab.word}</span>
                            </button>
                            {vocab.reading && (
                              <span className="font-jp text-muted-foreground">
                                ({vocab.reading})
                              </span>
                            )}
                            {getMasteryBadge(vocab.mastery_level)}
                          </div>

                          {/* Meaning */}
                          <p className="text-foreground">{vocab.meaning}</p>

                          {/* Date */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Đã lưu {format(new Date(vocab.created_at), 'dd MMM yyyy', { locale: vi })}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => speak(vocab.word)}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Volume2 className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Xóa từ vựng?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bạn có chắc muốn xóa "{vocab.word}" khỏi danh sách từ vựng đã lưu?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeWord(vocab.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Xóa
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Stats Summary */}
        {history.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-gold" />
                Thống kê học tập
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{history.length}</p>
                  <p className="text-sm text-muted-foreground">Tổng từ vựng</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-matcha">
                    {history.filter((v) => (v.mastery_level || 0) >= 80).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Thành thạo</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gold">
                    {history.filter((v) => (v.mastery_level || 0) < 80 && (v.mastery_level || 0) >= 50).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Đang học</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default SavedVocabulary;
