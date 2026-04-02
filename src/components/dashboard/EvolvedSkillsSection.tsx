import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, ArrowRight, Loader2, Target, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEvolvedSkills, EvolvedSkill } from '@/hooks/useEvolvedSkills';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export const EvolvedSkillsSection = () => {
  const { activeSkills, isGenerating, generateNewSkill } = useEvolvedSkills();
  const navigate = useNavigate();

  const handleStartSkill = (skill: EvolvedSkill) => {
    // In a real app we would navigate to a dedicated skill quest player
    // For now we'll route to Sensei or Vocabulary based on type
    navigate(skill.type === 'vocabulary' ? '/vocabulary' : '/sensei');
  };

  return (
    <div className="space-y-4">
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
          disabled={isGenerating}
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          Tìm kỹ năng mới
        </Button>
      </div>

      <AnimatePresence>
        {activeSkills.length === 0 && !isGenerating ? (
          <motion.div 
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
            {activeSkills.map((skill, index) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={cn(
                  "overflow-hidden border-0 relative group cursor-pointer h-full transition-all duration-300 hover:shadow-elevated",
                  "bg-gradient-to-br from-white/60 to-white/30 dark:from-slate-900/60 dark:to-slate-900/30 backdrop-blur-md shadow-soft"
                )}
                onClick={() => handleStartSkill(skill)}>
                  {/* Decorative Glass effects */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-sakura/5 to-transparent pointer-events-none" />
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-sakura/10 rounded-full blur-2xl group-hover:bg-sakura/20 transition-all pointer-events-none" />
                  
                  <CardContent className="p-5 relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-3">
                      <Badge className={cn(
                        "font-bold text-[9px] uppercase tracking-widest px-2.5 py-0.5",
                        skill.status === 'discovered' ? "bg-sakura text-white" : "bg-indigo-500 text-white"
                      )}>
                        {skill.status === 'discovered' ? 'MỚI TÌM THẤY' : 'ĐANG TIẾN HÀNH'}
                      </Badge>
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
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
