import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Search, BookOpen, PenTool, Volume2, Filter,
  Grid3X3, List, Trophy, Zap, Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/Navigation';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useTTS } from '@/hooks/useTTS';
import { cn } from '@/lib/utils';

interface KanjiItem {
  id: string;
  character: string;
  meaning_vi: string;
  onyomi: string[] | null;
  kunyomi: string[] | null;
  stroke_count: number;
  jlpt_level: string | null;
  hanviet: string | null;
}

const LEVEL_INFO: Record<string, { count: number; color: string; description: string }> = {
  N5: { count: 100,  color: 'sakura',  description: 'Kanji cơ bản nhất — bắt buộc cho người mới bắt đầu' },
  N4: { count: 300,  color: 'indigo',  description: 'Mở rộng từ N5, dùng trong giao tiếp hàng ngày' },
  N3: { count: 650,  color: 'matcha',  description: 'Trung cấp — đọc báo đơn giản và văn bản thông thường' },
  N2: { count: 1000, color: 'gold',    description: 'Gần như thành thạo — báo chí và văn bản chuyên ngành' },
  N1: { count: 2000, color: 'crimson', description: 'Toàn bộ Joyo Kanji — thành thạo hoàn toàn' },
};

export const KanjiByLevel: React.FC = () => {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const { speak } = useTTS({ lang: 'ja-JP' });

  const [kanji, setKanji] = useState<KanjiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'default' | 'stroke' | 'alpha'>('default');

  const lvl = level?.toUpperCase() || 'N5';
  const info = LEVEL_INFO[lvl];

  const fetchKanji = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kanji')
        .select('id, character, meaning_vi, onyomi, kunyomi, stroke_count, jlpt_level, hanviet')
        .eq('jlpt_level', lvl)
        .order('frequency', { ascending: true })
        .limit(500);

      if (error) throw error;
      setKanji((data ?? []) as KanjiItem[]);
    } catch (err) {
      console.error('Error fetching kanji:', err);
    } finally {
      setLoading(false);
    }
  }, [lvl]);

  useEffect(() => { fetchKanji(); }, [fetchKanji]);

  const filtered = kanji
    .filter(k =>
      !search ||
      k.character.includes(search) ||
      k.meaning_vi?.toLowerCase().includes(search.toLowerCase()) ||
      k.hanviet?.toLowerCase().includes(search.toLowerCase()) ||
      k.onyomi?.some(r => r.includes(search)) ||
      k.kunyomi?.some(r => r.includes(search))
    )
    .sort((a, b) => {
      if (sortBy === 'stroke') return a.stroke_count - b.stroke_count;
      if (sortBy === 'alpha') return a.character.localeCompare(b.character);
      return 0;
    });

  if (!info) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-20 text-center">
          <p className="text-xl text-muted-foreground">Cấp độ "{level}" không tồn tại.</p>
          <Link to="/learning-path"><Button className="mt-4 gap-2"><ChevronLeft className="h-4 w-4" />Quay lại</Button></Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      <main className="container py-8 space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <Link to={`/learning-path/${level?.toLowerCase()}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Quay lại {lvl}
            </Button>
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary">{lvl}</span>
                Kanji {lvl}
              </h1>
              <p className="text-muted-foreground mt-1">{info.description}</p>
            </div>
            <div className="flex gap-3">
              <Link to={`/kanji-worksheet?level=${lvl}`}>
                <Button variant="outline" className="gap-2">
                  <PenTool className="h-4 w-4" /> Tập viết
                </Button>
              </Link>
              <Link to="/mock-tests">
                <Button className="gap-2 bg-primary text-white">
                  <Trophy className="h-4 w-4" /> Thi thử {lvl}
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <Card className="border-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{kanji.length}</p>
                  <p className="text-xs text-muted-foreground">Kanji trong DB</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gold">{info.count}</p>
                  <p className="text-xs text-muted-foreground">Mục tiêu {lvl}</p>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Dữ liệu</span>
                    <span>{kanji.length > 0 ? Math.min(100, Math.round((kanji.length / info.count) * 100)) : 0}%</span>
                  </div>
                  <Progress value={kanji.length > 0 ? Math.min(100, (kanji.length / info.count) * 100) : 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm Kanji, nghĩa, Hán Việt, âm đọc..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
            >
              <option value="default">Mặc định</option>
              <option value="stroke">Số nét</option>
              <option value="alpha">A-Z</option>
            </select>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Kanji grid/list */}
        {loading ? (
          <div className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3'
              : 'space-y-2'
          )}>
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className={cn(
                'rounded-xl bg-muted/40 animate-pulse',
                viewMode === 'grid' ? 'h-20' : 'h-16'
              )} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{search ? 'Không tìm thấy Kanji phù hợp.' : `Chưa có dữ liệu Kanji ${lvl} trong DB.`}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
            {filtered.map((k, idx) => (
              <motion.div
                key={k.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(idx * 0.01, 0.3) }}
              >
                <Link to={`/kanji/${encodeURIComponent(k.character)}`}>
                  <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group border-border/50">
                    <CardContent className="p-2 text-center space-y-1">
                      <p className="text-2xl font-jp group-hover:text-primary transition-colors">{k.character}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{k.meaning_vi}</p>
                      {k.stroke_count && (
                        <p className="text-[9px] text-muted-foreground/60">{k.stroke_count}nét</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((k, idx) => (
              <motion.div
                key={k.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(idx * 0.01, 0.3) }}
              >
                <Link to={`/kanji/${encodeURIComponent(k.character)}`}>
                  <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                    <CardContent className="p-4 flex items-center gap-4">
                      <span className="text-4xl font-jp w-14 text-center group-hover:text-primary transition-colors shrink-0">
                        {k.character}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold">{k.meaning_vi}</p>
                          {k.hanviet && (
                            <Badge variant="outline" className="text-xs">{k.hanviet}</Badge>
                          )}
                          {k.stroke_count && (
                            <Badge variant="secondary" className="text-xs">{k.stroke_count} nét</Badge>
                          )}
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          {k.onyomi && k.onyomi.length > 0 && (
                            <span>音: {k.onyomi.slice(0, 3).join('、')}</span>
                          )}
                          {k.kunyomi && k.kunyomi.length > 0 && (
                            <span>訓: {k.kunyomi.slice(0, 3).join('、')}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => { e.preventDefault(); speak(k.character); }}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Bottom count */}
        {!loading && filtered.length > 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Hiển thị {filtered.length} / {kanji.length} Kanji {lvl}
          </p>
        )}
      </main>
    </div>
  );
};
