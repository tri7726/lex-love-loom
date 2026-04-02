import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface EvolvedSkill {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: 'vocabulary' | 'grammar' | 'pronunciation';
  status: 'discovered' | 'in_progress' | 'mastered';
  challenge_data: {
    target_words?: string[];
    context?: string;
    suggested_prompt?: string;
  };
  xp_reward: number;
  expires_at: string;
}

const STORAGE_KEY = 'evolved_skills';

export const useEvolvedSkills = () => {
  const { user } = useAuth();
  const [skills, setSkills] = useState<EvolvedSkill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchSkills = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      if (stored) {
        const parsed: EvolvedSkill[] = JSON.parse(stored);
        const active = parsed.filter(
          s => (s.status === 'discovered' || s.status === 'in_progress') &&
               new Date(s.expires_at) > new Date()
        );
        setSkills(active);
      }
    } catch (e) {
      console.error('Lỗi khi lấy Evolved Skills:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const saveSkills = (userId: string, updatedSkills: EvolvedSkill[]) => {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(updatedSkills));
  };

  const generateSkills = async () => {
    if (!user?.id || isGenerating) return;
    setIsGenerating(true);
    try {
      // Generate sample skills based on common learning patterns
      const sampleSkills: EvolvedSkill[] = [
        {
          id: crypto.randomUUID(),
          user_id: user.id,
          title: '助詞マスター: は vs が',
          description: 'Luyện phân biệt cách dùng は và が trong ngữ cảnh thực tế',
          type: 'grammar',
          status: 'discovered',
          challenge_data: {
            target_words: ['は', 'が'],
            suggested_prompt: 'Hãy giải thích sự khác biệt giữa は và が với các ví dụ thực tế',
          },
          xp_reward: 75,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: crypto.randomUUID(),
          user_id: user.id,
          title: 'Từ vựng N5 nâng cao',
          description: 'Ôn lại các từ vựng hay nhầm lẫn trong N5',
          type: 'vocabulary',
          status: 'discovered',
          challenge_data: {
            target_words: ['食べる', '飲む', '見る', '聞く'],
            suggested_prompt: 'Cho tôi quiz về các động từ cơ bản trong N5',
          },
          xp_reward: 50,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const updated = [...sampleSkills, ...skills];
      setSkills(updated);
      saveSkills(user.id, updated);
      toast.success(`Sensei vừa tạo ${sampleSkills.length} thử thách mới cho bạn! 🌟`);
    } catch (e) {
      console.error('Lỗi tạo skills:', e);
      toast.error("Không thể tạo thử thách lúc này. Thử lại sau nhé!");
    } finally {
      setIsGenerating(false);
    }
  };

  const markSkillAsMastered = async (skillId: string) => {
    if (!user?.id) return;
    try {
      const skill = skills.find(s => s.id === skillId);
      if (!skill) return;

      const updated = skills.map(s => s.id === skillId ? { ...s, status: 'mastered' as const } : s);
      saveSkills(user.id, updated);
      setSkills(updated.filter(s => s.status !== 'mastered'));

      return skill.xp_reward;
    } catch (e) {
      console.error('Lỗi hoàn thành skill:', e);
      return 0;
    }
  };

  return { skills, isLoading, isGenerating, fetchSkills, generateSkills, markSkillAsMastered };
};
