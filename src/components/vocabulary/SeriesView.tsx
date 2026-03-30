import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, GraduationCap, BookOpen, Languages, TrendingUp, Plus, FolderOpen, Trash2, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getLevelGradient } from './utils';
import { TextbookSeries, JLPTLevel } from './types';
import { CustomFolder } from '@/hooks/useFlashcardFolders';
import { VocabWord } from '@/types/vocabulary';
import { textbookSeries } from './data';

interface SeriesViewProps {
  customFolders: CustomFolder[];
  savedHistory: VocabWord[];
  user: { id: string; email?: string } | null;
  setShowKanji: (show: boolean) => void;
  navigateToLessons: (series: TextbookSeries, level: JLPTLevel) => void;
  navigateToCustomFolder: (folder: CustomFolder) => void;
  setShowCreateDialog: (show: boolean) => void;
  deleteFolder: (folderId: string) => void;
}

export const SeriesView: React.FC<SeriesViewProps> = ({
  customFolders,
  savedHistory,
  user,
  setShowKanji,
  navigateToLessons,
  navigateToCustomFolder,
  setShowCreateDialog,
  deleteFolder,
}) => {
  return (
    <motion.div
      key="series"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -30 }}
      className="space-y-10"
    >
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-hero p-8 md:p-12 border border-sakura-light/50 shadow-soft">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-sakura-light/40 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-gold-light/20 rounded-full blur-3xl opacity-30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[240px] font-jp text-sakura-dark/[0.03] select-none pointer-events-none">
            語
          </div>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-sakura-light rounded-lg">
                <Sparkles className="h-4 w-4 text-sakura" />
              </div>
              <span className="text-sakura text-sm font-bold tracking-wider uppercase">Premium Learning 🌸</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-bold text-sumi tracking-tight">
              Từ vựng
            </h1>
            <p className="text-muted-foreground max-w-md text-lg leading-relaxed">
              Học bản chất – không học vẹt. Hệ thống <span className="text-sakura font-bold">SRS</span> giúp bạn nhớ lâu hơn, mỗi ngày một ít, thành công lớn.
            </p>
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm font-medium text-sumi/70">
                <BookOpen className="h-4 w-4 text-sakura" /> 2 bộ sách
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-sumi/70">
                <Languages className="h-4 w-4 text-matcha" /> 7 trình độ
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-sumi/70">
                <TrendingUp className="h-4 w-4 text-gold" /> 11,500+ từ
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="gap-2 border-sakura-light text-sakura hover:bg-sakura-light/60 bg-white/40 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-md transition-all self-start md:self-center"
            onClick={() => setShowKanji(true)}
          >
            <GraduationCap className="h-5 w-5" />
            <span className="font-bold">Chế độ Kanji</span>
          </Button>
        </div>
      </div>

      {/* Series */}
      {textbookSeries.map((series, seriesIdx) => (
        <motion.section
          key={series.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: seriesIdx * 0.15 }}
          className="space-y-5"
        >
          <div className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-2xl border',
            series.id === 'mina'
              ? 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-200/60 dark:border-sky-800/40'
              : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/40'
          )}>
            <span className="text-3xl">{series.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{series.name}</h2>
                <span className={cn(
                  'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full',
                  series.id === 'mina'
                    ? 'bg-indigo-jp/10 text-indigo-jp'
                    : 'bg-sakura-light text-sakura'
                )}>
                  {series.id === 'mina' ? '📖 Giáo trình' : '🎯 JLPT'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-jp">{series.nameJp}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {series.levels.map((level, idx) => {
              const grad = getLevelGradient(series.id, level.level);
              return (
                <motion.div
                  key={`${series.id}-${level.level}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(seriesIdx * 0.1 + idx * 0.05, 0.3) }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className="cursor-pointer group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300"
                    onClick={() => navigateToLessons(series, level)}
                  >
                    <div className={cn('h-2 bg-gradient-to-r', grad)} />
                    <CardContent className="p-5 text-center space-y-2 relative">
                      <div className={cn('absolute inset-0 bg-gradient-to-b opacity-[0.06]', grad)} />
                      <div className="relative z-10">
                        <p className="text-[10px] text-muted-foreground font-jp leading-tight truncate">
                          {series.nameJp}
                        </p>
                        <p className={cn('text-5xl font-black my-2 bg-gradient-to-br bg-clip-text text-transparent', grad)}>
                          {level.level}
                        </p>
                        <p className="text-sm font-bold">{level.totalWords.toLocaleString()} từ</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{level.description}</p>
                        <div className="mt-3">
                          <div className="h-1 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className={cn('h-full rounded-full bg-gradient-to-r', grad)}
                              initial={{ width: 0 }}
                              animate={{ width: '0%' }}
                              transition={{ delay: 0.5, duration: 0.8 }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">0% hoàn thành</p>
                        </div>
                        {/* Quick Quiz button */}
                        <Button
                          size="sm"
                          className="mt-3 w-full h-8 rounded-xl text-[10px] font-black uppercase tracking-wider gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 text-foreground hover:bg-white border border-border shadow-sm"
                          onClick={e => {
                            e.stopPropagation();
                            navigateToLessons(series, level);
                          }}
                        >
                          <Zap className="h-3 w-3 text-amber-500" /> Quick Quiz
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      ))}

      <motion.section
        variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
        className="space-y-5"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 px-5 py-4 rounded-[2rem] border bg-gold-light/10 border-gold-light/30 min-w-0 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-gold-light/30 flex items-center justify-center text-2xl shadow-inner">
              📝
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-sumi">Sổ tay của tôi</h2>
                <Badge className="bg-gold text-gold-foreground uppercase tracking-wider text-[9px] px-2 py-0">✏️ Cá nhân</Badge>
              </div>
              <p className="text-sm text-muted-foreground font-medium">Tự tạo folder để học từ vựng riêng</p>
            </div>
          </div>
          <Button
            size="lg"
            className="gap-2 bg-gold hover:bg-gold-light text-gold-foreground shadow-md hover:shadow-lg rounded-2xl flex-shrink-0 font-bold"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-5 w-5" />
            Tạo folder
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              whileHover={{ scale: 1.04, y: -6 }}
              whileTap={{ scale: 0.96 }}
            >
              <Card
                className="cursor-pointer group relative overflow-hidden border-2 border-amber-200 hover:border-amber-400 shadow-md hover:shadow-xl transition-all duration-300"
                onClick={() => {
                  const savedFolder: CustomFolder = {
                    id: 'supabase-saved',
                    name: 'Mục đã lưu từ hệ thống',
                    emoji: '⭐',
                    words: savedHistory.map((w) => ({
                      id: w.id,
                      word: w.word,
                      reading: w.reading,
                      meaning: w.meaning,
                      hanviet: null,
                      mastery_level: w.mastery_level
                    })),
                    createdAt: new Date().toISOString()
                  };
                  navigateToCustomFolder(savedFolder);
                }}
              >
                <div className="h-2 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400" />
                <CardContent className="p-5 text-center space-y-2 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-50/40 to-transparent" />
                  <div className="relative z-10">
                    <span className="text-4xl text-amber-500">⭐</span>
                    <p className="text-sm font-bold mt-2 truncate text-amber-800">Mục đã lưu</p>
                    <p className="text-xs text-amber-600 font-medium">{savedHistory.length} từ</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {customFolders.map((folder, idx) => (
            <motion.div
              key={folder.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + idx * 0.07 }}
              whileHover={{ scale: 1.04, y: -6 }}
              whileTap={{ scale: 0.96 }}
            >
              <Card
                className="cursor-pointer group relative overflow-hidden border-2 border-rose-200 hover:border-rose-400 shadow-md hover:shadow-xl transition-all duration-300"
                onClick={() => navigateToCustomFolder(folder)}
              >
                <div className="h-2 bg-gradient-to-r from-rose-300 via-pink-300 to-rose-400" />
                <CardContent className="p-5 text-center space-y-2 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-rose-50/40 to-transparent" />
                  <div className="relative z-10">
                    <span className="text-4xl">{folder.emoji}</span>
                    <p className="text-sm font-bold mt-2 truncate">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">{folder.words.length} từ</p>
                  </div>
                  {folder.id !== 'sample-folder' && folder.id !== 'supabase-saved' && (
                    <button
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-red-100 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 hover:text-red-600 z-20"
                      onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + customFolders.length * 0.07 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <Card
              className="cursor-pointer border-2 border-dashed border-amber-300 hover:border-amber-400 transition-all duration-300 h-full min-h-[140px] flex items-center justify-center"
              onClick={() => setShowCreateDialog(true)}
            >
              <CardContent className="p-5 text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                  className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-2"
                >
                  <Plus className="h-6 w-6 text-amber-500" />
                </motion.div>
                <p className="text-sm font-medium text-amber-500">Tạo folder mới</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.section>
    </motion.div>
  );
};
