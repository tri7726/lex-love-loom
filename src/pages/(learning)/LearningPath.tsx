import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Check, Sparkles, BookOpen, Brain, Edit3, Headphones, Mic, Trophy, Loader2, ChevronRight } from "lucide-react";
import { PageSkeleton } from "@/components/common";
import { cn } from "@/lib/utils";

interface LevelNode {
  id: string;
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  title: string;
  description: string;
  xpRequired: number;
  modules: { icon: React.ElementType; label: string; href: string }[];
}

const LEVELS: LevelNode[] = [
  {
    id: "n5",
    level: "N5",
    title: "Khởi đầu hành trình",
    description: "Hiragana, Katakana, 100 kanji & 800 từ vựng cơ bản",
    xpRequired: 0,
    modules: [
      { icon: BookOpen, label: "Từ vựng N5", href: "/vocabulary?level=N5" },
      { icon: Brain, label: "Kanji N5", href: "/kanji-by-level/N5" },
      { icon: Edit3, label: "Ngữ pháp N5", href: "/grammar?level=N5" },
    ],
  },
  {
    id: "n4",
    level: "N4",
    title: "Hội thoại đời thường",
    description: "300 kanji & 1500 từ — đủ cho sinh hoạt cơ bản tại Nhật",
    xpRequired: 1000,
    modules: [
      { icon: BookOpen, label: "Từ vựng N4", href: "/vocabulary?level=N4" },
      { icon: Brain, label: "Kanji N4", href: "/kanji-by-level/N4" },
      { icon: Headphones, label: "Nghe N4", href: "/listening-lab?level=N4" },
    ],
  },
  {
    id: "n3",
    level: "N3",
    title: "Cầu nối trung cấp",
    description: "650 kanji & 3700 từ — đọc báo, hội thoại trung cấp",
    xpRequired: 3000,
    modules: [
      { icon: BookOpen, label: "Từ vựng N3", href: "/vocabulary?level=N3" },
      { icon: Edit3, label: "Đọc hiểu N3", href: "/reading?level=N3" },
      { icon: Mic, label: "Nói N3", href: "/speaking-practice?level=N3" },
    ],
  },
  {
    id: "n2",
    level: "N2",
    title: "Sẵn sàng đi làm",
    description: "1000 kanji & 6000 từ — làm việc tại công ty Nhật",
    xpRequired: 7000,
    modules: [
      { icon: BookOpen, label: "Từ vựng N2", href: "/vocabulary?level=N2" },
      { icon: Trophy, label: "Đề thi thử N2", href: "/mock-tests" },
    ],
  },
  {
    id: "n1",
    level: "N1",
    title: "Đỉnh cao bản xứ",
    description: "2000 kanji & 10000 từ — thành thạo gần như người Nhật",
    xpRequired: 15000,
    modules: [
      { icon: BookOpen, label: "Từ vựng N1", href: "/vocabulary?level=N1" },
      { icon: Trophy, label: "Đề thi thử N1", href: "/mock-tests" },
    ],
  },
];

export const LearningPath: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const totalXP = profile?.total_xp ?? 0;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancel = false;

    const loadProgress = async () => {
      // Đếm số từ đã học theo level
      const { data } = await supabase
        .from("user_vocabulary_progress" as any)
        .select("flashcard_id, flashcards!inner(jlpt_level)" as any)
        .eq("user_id", user.id)
        .limit(5000);

      if (cancel) return;

      const counts: Record<string, number> = {};
      (data as any[] | null)?.forEach((row: any) => {
        const lvl = row.flashcards?.jlpt_level;
        if (lvl) counts[lvl] = (counts[lvl] || 0) + 1;
      });
      setProgress(counts);
      setLoading(false);
    };

    loadProgress().catch(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [user]);

  const TARGET_PER_LEVEL: Record<string, number> = {
    N5: 800, N4: 700, N3: 2200, N2: 2300, N1: 4000,
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="text-5xl">🗾</div>
        <h1 className="text-3xl md:text-4xl font-black font-display">Lộ trình JLPT</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Hành trình từ N5 đến N1. Hoàn thành mục tiêu XP để mở khoá level tiếp theo.
        </p>
      </div>

      {loading ? (
        <PageSkeleton variant="list" rows={5} />
      ) : (
        <div className="relative">
          {/* Đường nối dọc */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-sakura/40 via-sakura/20 to-transparent -translate-x-1/2 hidden md:block" />

          <div className="space-y-6">
            {LEVELS.map((node, idx) => {
              const unlocked = totalXP >= node.xpRequired;
              const learned = progress[node.level] || 0;
              const target = TARGET_PER_LEVEL[node.level];
              const pct = Math.min(100, Math.round((learned / target) * 100));
              const completed = pct >= 100;
              const isCurrent =
                unlocked &&
                !completed &&
                LEVELS.slice(0, idx).every((l) => (progress[l.level] || 0) >= TARGET_PER_LEVEL[l.level]);

              return (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="relative"
                >
                  <Link to={`/learning-path/${node.level.toLowerCase()}`}>
                    <Card
                      className={cn(
                        "border-none rounded-[2.5rem] overflow-hidden transition-all cursor-pointer group shadow-card hover:shadow-elevated bg-white",
                        !unlocked && "opacity-70 grayscale-[0.5]"
                      )}
                    >
                    <CardContent className="p-8 space-y-8">
                      {/* Level Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-5">
                          <div
                            className={cn(
                              "w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shrink-0 shadow-sm",
                              completed
                                ? "bg-green-500 text-white"
                                : unlocked
                                ? "bg-sakura-light/10 text-sakura border-2 border-sakura-light/20"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {completed ? <Check className="h-8 w-8" /> : !unlocked ? <Lock className="h-7 w-7" /> : node.level}
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-sumi mb-1">{node.title}</h3>
                            <p className="text-xs font-black text-sakura tracking-widest uppercase">25 Bài học</p>
                          </div>
                        </div>
                        {isCurrent && (
                          <Badge className="bg-sakura text-white border-0 py-1.5 px-4 rounded-full gap-2 shadow-sakura animate-pulse">
                            <Sparkles className="h-3.5 w-3.5 fill-white" /> Đang học
                          </Badge>
                        )}
                      </div>

                      <p className="text-muted-foreground font-medium text-lg leading-relaxed line-clamp-2">
                        {node.description}
                      </p>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-50">
                        <div className="text-center space-y-1">
                          <p className="text-xl font-black text-sumi">{idx === 0 ? '800+' : idx === 1 ? '1500+' : '3000+'}</p>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Từ vựng</p>
                        </div>
                        <div className="text-center space-y-1 border-x border-slate-100">
                          <p className="text-xl font-black text-sumi">{idx === 0 ? '100+' : idx === 1 ? '300+' : '600+'}</p>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Kanji</p>
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-xl font-black text-sumi">10+</p>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mock Test</p>
                        </div>
                      </div>

                      {unlocked && (
                        <div className="space-y-6">
                          {/* Progress bar */}
                          <div className="space-y-3">
                            <div className="flex justify-between text-xs font-black">
                              <span className="text-muted-foreground uppercase tracking-tighter">{learned} / {target} từ đã học</span>
                              <span className="text-sakura">{pct}%</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all duration-700 rounded-full",
                                  completed ? "bg-green-500" : "bg-sakura shadow-sakura"
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          {/* Action Button */}
                          <Button 
                            className={cn(
                              "w-full h-14 rounded-2xl text-lg font-black transition-all group-hover:scale-[1.02]",
                              completed ? "bg-green-500 hover:bg-green-600" : "bg-sakura hover:bg-sakura-dark shadow-sakura"
                            )}
                          >
                            Tiếp tục học tập <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                          </Button>
                        </div>
                      )}

                      {!unlocked && (
                        <div className="pt-4">
                           <Button variant="secondary" disabled className="w-full h-14 rounded-2xl font-black text-muted-foreground bg-slate-100">
                              Cần {node.xpRequired.toLocaleString()} XP để mở khóa
                           </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningPath;
