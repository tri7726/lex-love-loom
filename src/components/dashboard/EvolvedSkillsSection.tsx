import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, ArrowRight, Loader2, Target, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEvolvedSkills, EvolvedSkill, SkillJLPTLevel } from '@/hooks/useEvolvedSkills';
import { SkillQuestPlayer } from '@/components/skills/SkillQuestPlayer';
import { cn } from '@/lib/utils';

const JLPT_BADGE: Record<SkillJLPTLevel, { label: string; color: string }> = {
  N5: { label: 'N5', color: 'bg-green-100 text-green-700 border-green-200' },
  N4: { label: 'N4', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  N3: { label: 'N3', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  N2: { label: 'N2', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  N1: { label: 'N1', color: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export const EvolvedSkillsSection = () => {
  const {
    skills: activeSkills, reviewSkills, isGenerating, isLoading,
    generateSkills: generateNewSkill, markSkillAsMastered, reactivateSkill
  } = useEvolvedSkills();
  const [activeSkill, setActiveSkill] = useState<EvolvedSkill | null>(null);

  const handleStartSkill = (skill: EvolvedSkill) => setActiveSkill(skill);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2 bg-gradient-to-r from-sakura-dark to-indigo-jp bg-clip-text text-transparent">
            <Sparkles className="h-5 w-5 text-sakura" />
            EvoSkills (Mới)
          </h2>
          <p className="text-xs text-muted-foreground font-medium">Kỹ năng AI tạo thiết kế riêng cho bạn dựa trên lịch sử học.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-sakura/30 text-sakura hover:bg-sakura/10 font-bold"
          onClick={generateNewSkill}
          disabled={isGenerating || isLoading}
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          Tìm kỹ năng mới
        </Button>
      </div>

      {/* ── Active Skills ──────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isGenerating && activeSkills.length === 0 ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 rounded-[2rem] border border-dashed border-border flex flex-col items-center justify-center text-center space-y-3 bg-card/20"
          >
            <div className="w-12 h-12 rounded-full bg-sakura/10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-sakura animate-spin" />
            </div>
            <div>
              <p className="font-bold text-sm">Sensei đang thiết kế thử thách...</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">Đang phân tích lịch sử học của bạn để tạo kỹ năng phù hợp.</p>
            </div>
          </motion.div>
        ) : activeSkills.length === 0 && !isLoading ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 rounded-[2rem] border border-dashed border-border flex flex-col items-center justify-center text-center space-y-3 bg-card/20"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm">Bạn đã hoàn thành mọi EvoSkills!</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">Sensei cần thêm dữ liệu (qua việc bạn tự luyện tập) để thiết kế thử thách mới.</p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSkills.map((skill, index) => {
              const jlptBadge = skill.jlpt_level ? JLPT_BADGE[skill.jlpt_level] : null;
              return (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={cn(
                    "overflow-hidden border-0 relative group cursor-pointer h-full transition-all duration-300 hover:shadow-elevated",
                    "bg-gradient-to-br from-white/60 to-white/30 backdrop-blur-md shadow-soft"
                  )}
                    onClick={() => handleStartSkill(skill)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-sakura/5 to-transparent pointer-events-none" />
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-sakura/10 rounded-full blur-2xl group-hover:bg-sakura/20 transition-all pointer-events-none" />

                    <CardContent className="p-5 relative z-10 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={cn(
                            "font-bold text-[9px] uppercase tracking-widest px-2.5 py-0.5",
                            skill.status === 'discovered' ? "bg-sakura text-white" : "bg-indigo-500 text-white"
                          )}>
                            {skill.status === 'discovered' ? 'MỚI' : 'ĐANG HỌC'}
                          </Badge>
                          {jlptBadge && (
                            <Badge variant="outline" className={cn('text-[9px] font-black px-2 py-0', jlptBadge.color)}>
                              {jlptBadge.label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-black text-gold">
                          <span>+{skill.xp_reward}</span>
                          <span>XP</span>
                        </div>
                      </div>

                      <div className="mb-4 flex-1">
                        <h3 className="font-bold text-lg leading-tight mb-1 group-hover:text-sakura transition-colors">
                          {skill.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {skill.description}
                        </p>
                      </div>

                      <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                          <Target className="h-3.5 w-3.5" />
                          <span className="capitalize">{skill.type}</span>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full group-hover:bg-sakura group-hover:text-white transition-all">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* ── Review Skills (mastered > 7 days) ─────────────── */}
      {reviewSkills.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2 pt-2">
            <RefreshCw className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-black text-indigo-500 uppercase tracking-wider">Ôn tập định kỳ</h3>
            <span className="text-[10px] font-bold text-muted-foreground/50">(đã master &gt; 7 ngày)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewSkills.map((skill) => {
              const jlptBadge = skill.jlpt_level ? JLPT_BADGE[skill.jlpt_level] : null;
              return (
                <Card key={skill.id} className={cn(
                  "overflow-hidden border border-dashed border-indigo-200/50 relative group cursor-pointer h-full transition-all duration-300 hover:shadow-elevated",
                  "bg-gradient-to-br from-indigo-50/60 to-white/30 backdrop-blur-md shadow-soft"
                )}
                  onClick={() => {
                    reactivateSkill(skill);
                    handleStartSkill(skill);
                  }}
                >
                  <CardContent className="p-5 relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className="font-bold text-[9px] uppercase tracking-widest px-2.5 py-0.5 bg-indigo-100 text-indigo-700">
                          ÔN TẬP
                        </Badge>
                        {jlptBadge && (
                          <Badge variant="outline" className={cn('text-[9px] font-black px-2 py-0', jlptBadge.color)}>
                            {jlptBadge.label}
                          </Badge>
                        )}
                      </div>
                      <Zap className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="mb-4 flex-1">
                      <h3 className="font-bold text-sm leading-tight mb-1">{skill.title}</h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{skill.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-500">
                      <RefreshCw className="h-3.5 w-3.5" /> Ôn lại
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quest Player ───────────────────────────────────── */}
      {activeSkill && (
        <SkillQuestPlayer
          skill={activeSkill}
          isOpen={true}
          onClose={() => setActiveSkill(null)}
          onComplete={markSkillAsMastered}
        />
      )}
    </div>
  );
};
