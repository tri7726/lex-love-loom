import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, GraduationCap, BookOpen, Languages, TrendingUp, Plus, FolderOpen, Trash2, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getLevelGradient } from './utils';
import { TextbookSeries, JLPTLevel } from './types';
import { CustomFolder, VocabWord } from '@/hooks/useFlashcardFolders';
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 via-pink-50 to-white p-8 md:p-10 border border-rose-100">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-rose-300/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-tr from-pink-300/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] font-jp text-rose-300/[0.08] select-none">
            語
          </div>
        </div>
        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-rose-400" />
              <span className="text-rose-400 text-sm font-medium">Premium Learning 🌸</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-rose-800">
              Từ vựng
            </h1>
            <p className="text-rose-400 max-w-md">
              Học bản chất – không học vẹt. Hệ thống SRS giúp bạn nhớ lâu hơn, mỗi ngày một ít, thành công lớn.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-rose-500">
                <BookOpen className="h-4 w-4" /> 2 bộ sách
              </div>
              <div className="flex items-center gap-2 text-sm text-rose-500">
                <Languages className="h-4 w-4" /> 7 trình độ
              </div>
              <div className="flex items-center gap-2 text-sm text-rose-500">
                <TrendingUp className="h-4 w-4" /> 11,500+ từ
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-rose-200 text-rose-500 hover:bg-rose-100/60 bg-white/60 backdrop-blur-sm"
            onClick={() => setShowKanji(true)}
          >
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Chế độ Kanji</span>
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
                  'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full',
                  series.id === 'mina'
                    ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400'
                    : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: seriesIdx * 0.15 + idx * 0.07 }}
                  whileHover={{ scale: 1.04, y: -6 }}
                  whileTap={{ scale: 0.96 }}
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

      {/* Sổ tay của tôi */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="space-y-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 px-4 py-3 rounded-2xl border bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40 min-w-0">
            <span className="text-3xl">📝</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">Sổ tay của tôi</h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                  ✏️ Cá nhân
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Tự tạo folder để học từ vựng riêng</p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow flex-shrink-0"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4" />
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
