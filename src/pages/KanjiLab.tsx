import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PenTool, 
  Search, 
  Trophy, 
  ArrowLeft, 
  ChevronRight, 
  Info, 
  Star,
  BookOpen
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WordWritingLab } from '@/components/kanji/WordWritingLab';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Sample common Kanji by JLPT level
const KANJI_SAMPLES = {
  'N5': ['水', '火', '山', '川', '人', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'],
  'N4': ['安', '飲', '右', '雨', '駅', '円', '火', '花', '何', '会', '海', '学', '間', '気', '九'],
  'N3': ['暗', '意', '運', '駅', '園', '遠', '屋', '温', '化', '荷', '歌', '画', '界', '皆', '絵'],
};

export const KanjiLab = () => {
  const [searchParams] = useSearchParams();
  const initialWord = searchParams.get('word') || '水';
  
  const [selectedWord, setSelectedWord] = useState<string>(initialWord);
  const [searchInput, setSearchInput] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('N5');
  const [stats, setStats] = useState({ learned: 0, accuracy: 0 });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSelectedWord(searchInput.trim());
      setSearchInput('');
    }
  };

  const onWritingSuccess = (score: number) => {
     setStats(prev => ({ 
       learned: prev.learned + 1,
       accuracy: Math.round((prev.accuracy * prev.learned + score) / (prev.learned + 1))
     }));
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <main className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2 mb-2 p-0 h-auto font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-sakura transition-colors">
                <ArrowLeft className="h-3 w-3" /> Quay lại Home
              </Button>
            </Link>
            <h1 className="text-3xl font-display font-black flex items-center gap-3">
              <div className="p-2 bg-sakura/10 rounded-2xl">
                 <PenTool className="h-8 w-8 text-sakura" />
              </div>
              Phòng Lab Kanji (v2)
            </h1>
            <p className="text-muted-foreground text-sm font-medium">Học viết Hán tự với AI kiểm tra thứ tự nét chuẩn xác.</p>
          </div>

          <div className="flex items-center gap-4 bg-white p-2 rounded-3xl shadow-soft border border-sakura/5">
             <div className="px-4 py-2 border-r border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã luyện</p>
                <p className="text-xl font-black text-sakura">{stats.learned}</p>
             </div>
             <div className="px-4 py-2 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Độ chuẩn</p>
                <p className="text-xl font-black text-indigo-jp">{stats.learned > 0 ? stats.accuracy : 0}%</p>
             </div>
             <div className="bg-sakura p-2 rounded-2xl shadow-lg shadow-sakura/20">
                <Trophy className="h-6 w-6 text-white" />
             </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left: Selector & List */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="rounded-[2.5rem] border-2 border-sakura/5 shadow-soft overflow-hidden">
              <CardHeader className="bg-sakura/5 border-b border-sakura/5">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Search className="h-5 w-5 text-sakura" />
                  Tìm Kanji mới
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input 
                    placeholder="Nhập chữ Kanji bất kỳ..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="rounded-xl border-2 focus-visible:ring-sakura"
                  />
                  <Button type="submit" className="bg-sakura hover:bg-sakura/90 rounded-xl px-6">
                    Học
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-2 border-sakura/5 shadow-soft overflow-hidden">
               <CardHeader className="border-b border-sakura/5 flex flex-row items-center justify-between py-4">
                 <CardTitle className="text-lg font-black">Thư viện JLPT</CardTitle>
                 <div className="flex gap-1 bg-muted/30 p-1 rounded-xl">
                   {['N5', 'N4', 'N3'].map(lvl => (
                     <Button 
                       key={lvl} 
                       variant={selectedLevel === lvl ? 'default' : 'ghost'}
                       size="sm"
                       onClick={() => setSelectedLevel(lvl)}
                       className={cn(
                        "h-7 px-3 text-[10px] font-black rounded-lg transition-all",
                        selectedLevel === lvl ? "bg-sakura text-white shadow-md shadow-sakura/20" : "text-muted-foreground"
                       )}
                     >
                       {lvl}
                     </Button>
                   ))}
                 </div>
               </CardHeader>
               <CardContent className="p-6">
                 <div className="grid grid-cols-5 gap-3">
                    {KANJI_SAMPLES[selectedLevel as keyof typeof KANJI_SAMPLES].map(k => (
                      <button
                        key={k}
                        onClick={() => setSelectedWord(k)}
                        className={cn(
                          "aspect-square rounded-2xl border-2 font-jp text-xl flex items-center justify-center transition-all duration-300",
                          selectedWord === k 
                            ? "bg-sakura text-white border-sakura shadow-lg shadow-sakura/20 scale-110" 
                            : "bg-white border-slate-100 hover:border-sakura/30 hover:bg-sakura/5"
                        )}
                      >
                        {k}
                      </button>
                    ))}
                 </div>
               </CardContent>
            </Card>

            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2.5rem] p-8 text-white space-y-4 relative overflow-hidden group">
               <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Info className="h-32 w-32" />
               </div>
               <div className="relative z-10 flex items-center gap-2">
                  <Star className="h-4 w-4 text-gold fill-gold" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gợi ý AI Sensei</span>
               </div>
               <h4 className="text-xl font-bold font-display relative z-10">Tầm quan trọng của Stroke Order</h4>
               <p className="text-sm text-slate-400 leading-relaxed font-medium relative z-10">
                 Viết đúng thứ tự nét giúp chữ Kanji của bạn cân đối và dễ đọc hơn. Trong kỳ thi năng lực tiếng Nhật, điều này cũng gián tiếp giúp bạn ghi nhớ mặt chữ lâu hơn 40%.
               </p>
            </div>
          </div>

          {/* Right: Writing Area */}
          <div className="lg:col-span-8">
            <motion.div
              key={selectedWord}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="rounded-[3rem] border-none shadow-elevated bg-white/50 backdrop-blur-sm overflow-hidden p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                         <Badge className="bg-sakura/10 text-sakura border-none hover:bg-sakura/20 px-4 py-1 font-black">Word Mode</Badge>
                         <div className="h-1 w-1 rounded-full bg-slate-300" />
                         <span className="text-xs font-bold text-muted-foreground">Viết từng chữ một</span>
                      </div>
                      <h2 className="text-6xl md:text-8xl font-jp font-black text-slate-900 break-all">{selectedWord}</h2>
                      <div className="flex gap-4">
                        <div className="h-1 w-12 bg-sakura rounded-full" />
                        <div className="h-1 w-6 bg-sakura/30 rounded-full" />
                        <div className="h-1 w-4 bg-sakura/10 rounded-full" />
                      </div>
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-start gap-4 p-5 bg-sakura-light/5 rounded-3xl border border-sakura/10">
                          <BookOpen className="h-6 w-6 text-sakura mt-1 shrink-0" />
                          <div>
                             <h4 className="font-bold text-slate-800">Cơ chế Lab v3</h4>
                             <p className="text-sm text-muted-foreground font-medium">Hệ thống tự động tách từ và bỏ qua Hiragana để tập trung vào Hán tự chính.</p>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <WordWritingLab 
                      word={selectedWord} 
                      onComplete={onWritingSuccess}
                      size={340}
                    />
                  </div>
                </div>
              </Card>

              {/* Achievement Placeholder */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Thứ tự nét', score: 'Hợp lệ', color: 'text-emerald-500' },
                  { label: 'Cân đối', score: '98/100', color: 'text-indigo-500' },
                  { label: 'Tốc độ', score: 'Đạt yêu cầu', color: 'text-amber-500' },
                ].map((s, i) => (
                  <Card key={i} className="rounded-3xl border-2 border-slate-50 bg-white/40 p-6 flex flex-col items-center gap-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                     <p className={cn("text-lg font-black", s.color)}>{s.score}</p>
                  </Card>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};
