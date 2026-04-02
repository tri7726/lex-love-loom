import React, { useState } from 'react';
import { EvolvedSkillCard } from './EvolvedSkillCard';
import { EvolvedSkill } from '@/hooks/useEvolvedSkills';
import { Button } from '@/components/ui/button';
import { TestTubeDiagonal, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface EvolvedSkillSectionProps {
  skills: EvolvedSkill[];
  isLoading: boolean;
  isGenerating: boolean;
  generateSkills: () => void;
  onStartChallenge: (skill: EvolvedSkill) => void;
  masteringSkillId: string | null;
}

export const EvolvedSkillSection = ({ 
  skills, isLoading, isGenerating, generateSkills, onStartChallenge, masteringSkillId 
}: EvolvedSkillSectionProps) => {
  const { user } = useAuth();
  const isGuest = !user;
  
  // Trạng thái hover cho hiệu ứng lấp lánh (sparkle) tổng thể
  const [isHovered, setIsHovered] = useState(false);

  if (isGuest) return null; // Ẩn hoàn toàn với khách

  if (isLoading) {
    return (
      <div className="w-full max-w-[80%] mx-auto mb-6 px-4">
        <div className="h-24 rounded-2xl bg-white/40 animate-pulse border border-border/20" />
      </div>
    );
  }

  // Nếu không có skill nào và không đang tải
  if (skills.length === 0) {
    return (
      <div className="w-full max-w-[80%] mx-auto mb-6 flex flex-col items-center justify-center p-6 border border-dashed border-border/50 rounded-2xl bg-white/40 backdrop-blur-sm">
        <div className="w-12 h-12 rounded-full bg-sakura/10 flex items-center justify-center mb-3">
          <TestTubeDiagonal className="w-6 h-6 text-sakura" />
        </div>
        <h3 className="text-sm font-bold text-foreground mb-1">EvoSkill - Tiến hóa kỹ năng</h3>
        <p className="text-xs text-muted-foreground text-center max-w-md mb-4">
          Hệ thống AI sẽ phân tích lỗi sai gần đây của bạn để bào chế ra các "Thử thách chữa cháy" giúp bạn tiến bộ vượt bậc.
        </p>
        <Button 
          variant="outline" 
          size="sm"
          onClick={generateSkills}
          disabled={isGenerating}
          className="rounded-xl border-sakura/30 text-sakura hover:bg-sakura/10 hover:text-sakura"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang bào chế...</>
          ) : (
            <><TestTubeDiagonal className="w-4 h-4 mr-2" /> Phân tích & Bào chế Thử Thách</>
          )}
        </Button>
      </div>
    );
  }

  // Nếu có skills để hiển thị
  return (
    <div 
      className="w-full max-w-[90%] mx-auto mb-8 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between px-2 mb-3">
        <div>
          <h2 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
            Phòng Thí Nghiệm EvoSkill
            <TestTubeDiagonal className="w-4 h-4 text-sakura" />
          </h2>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
            Thử thách cá nhân hóa đang chờ bạn
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground rounded-lg"
          onClick={generateSkills}
          disabled={isGenerating}
        >
          {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
          {isGenerating ? 'Đang bào chế...' : 'Phân tích lại'}
        </Button>
      </div>

      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-2 snap-x scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {skills.map((skill) => (
            <div key={skill.id} className="snap-start shrink-0 w-[280px]">
              <EvolvedSkillCard 
                skill={skill} 
                onStart={onStartChallenge} 
                isMastering={masteringSkillId === skill.id}
              />
            </div>
          ))}
        </div>
        
        {/* Gradients tạo hiệu ứng mờ viền khi scroll */}
        <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-[#FDFCFB]/90 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-[#FDFCFB]/90 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};
