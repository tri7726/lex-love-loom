import React from 'react';
import { EvolvedSkill } from '@/hooks/useEvolvedSkills';
import { Button } from '@/components/ui/button';
import { Play, Sparkles, BookA, Mic, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface EvolvedSkillCardProps {
  skill: EvolvedSkill;
  onStart: (skill: EvolvedSkill) => void;
  className?: string;
  isMastering?: boolean; // Tín hiệu đang tiến hành gọi API mastery
}

export const EvolvedSkillCard = ({ skill, onStart, className, isMastering }: EvolvedSkillCardProps) => {
  const { user } = useAuth();
  const isGuest = !user;

  const getIconAndColor = () => {
    switch (skill.type) {
      case 'vocabulary':
        return { icon: BookA, color: 'text-amber-500', bg: 'bg-amber-500/10', gradient: 'from-amber-400/20 via-amber-200/5 to-transparent' };
      case 'pronunciation':
        return { icon: Mic, color: 'text-rose-500', bg: 'bg-rose-500/10', gradient: 'from-rose-400/20 via-rose-200/5 to-transparent' };
      default:
        return { icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-500/10', gradient: 'from-indigo-400/20 via-indigo-200/5 to-transparent' };
    }
  };

  const { icon: Icon, color, bg, gradient } = getIconAndColor();

  return (
    <div className={cn(
      "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-white/70 backdrop-blur-md p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      isMastering ? "opacity-50 blur-sm scale-95 pointer-events-none" : "",
      className
    )}>
      {/* Decorative gradients */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none transition-opacity duration-500 group-hover:opacity-100", gradient)} />
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/20 blur-3xl rounded-full pointer-events-none" />

      <div className="relative z-10 flex items-start gap-4 mb-4">
        <div className={cn("flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-inner", bg, color)}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-foreground text-sm tracking-tight truncate flex-1">
              {skill.title}
            </h3>
            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
              <Sparkles className="w-3 h-3" />
              {skill.xp_reward} XP
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {skill.description}
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-auto pt-2">
         {/* Optional: show target words as small chips if any */}
         {(skill.challenge_data?.target_words || []).length > 0 && (
             <div className="flex flex-wrap gap-1 mb-3">
                 {skill.challenge_data.target_words?.slice(0,3).map((w, i) => (
                     <span key={i} className="text-[10px] font-medium bg-black/5 text-muted-foreground px-2 py-0.5 rounded-md">
                         {w}
                     </span>
                 ))}
                 {(skill.challenge_data.target_words?.length || 0) > 3 && (
                     <span className="text-[10px] font-medium text-muted-foreground px-1 py-0.5">...</span>
                 )}
             </div>
         )}

         <Button 
            className={cn(
              "w-full h-9 rounded-xl text-xs font-bold shadow-sm transition-all duration-300",
              "bg-foreground text-background hover:bg-foreground/90 group-hover:shadow-md"
            )}
            disabled={isGuest || isMastering}
            onClick={() => onStart(skill)}
          >
            {isGuest ? 'Đăng nhập để Học' : (
              <span className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 fill-current" />
                Dấn thân thử thách
              </span>
            )}
          </Button>
      </div>

      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-shimmer pointer-events-none" />
    </div>
  );
};
