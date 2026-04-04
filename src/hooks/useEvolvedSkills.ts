import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
    questions?: Array<{
      question: string;
      options: string[];
      correct_answer: string;
      explanation: string;
    }>;
    target_words?: string[];
    context?: string;
    suggested_prompt?: string;
  };
  xp_reward: number;
  expires_at: string;
}

export const useEvolvedSkills = () => {
  const { user } = useAuth();
  const [skills, setSkills] = useState<EvolvedSkill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchSkills = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('user_evolved_skills')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['discovered', 'in_progress'])
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSkills(data as any as EvolvedSkill[]);
    } catch (e) {
      console.error('Lỗi khi lấy Evolved Skills:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const generateSkills = async () => {
    if (!user?.id || isGenerating) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolve-skills', {
        body: { user_id: user.id }
      });

      if (error) throw error;
      
      if (data) {
        setSkills(prev => [data as EvolvedSkill, ...prev]);
        toast.success(`Sensei vừa tạo thử thách mới cho bạn! 🌟`);
      }
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

      // 1. Update status in DB
      const { error: updateError } = await supabase
        .from('user_evolved_skills')
        .update({ status: 'mastered' })
        .eq('id', skillId);

      if (updateError) throw updateError;

      // 2. Award XP via RPC
      const xpAmount = skill.xp_reward || 50;
      await supabase.rpc('earn_xp', { 
        p_amount: xpAmount, 
        p_source: 'evolved_skill' 
      });

      // Optimistic UI update
      setSkills(prev => prev.filter(s => s.id !== skillId));

      return xpAmount;
    } catch (e) {
      console.error('Lỗi hoàn thành skill:', e);
      return 0;
    }
  };

  return { skills, isLoading, isGenerating, fetchSkills, generateSkills, markSkillAsMastered };
};
