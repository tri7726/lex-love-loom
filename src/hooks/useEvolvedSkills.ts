import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useXP } from '@/hooks/useXP';
import { toast } from 'sonner';

export type QuestType = 'multiple-choice' | 'particle-fill' | 'translation' | 'word-distinction';
export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'master';
export type SkillJLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface QuestQuestion {
  quest_type: QuestType;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: QuestDifficulty;
  /** For translation quests: nuance breakdown */
  nuance?: string;
  /** For word-distinction: similar words compared */
  word_compare?: Array<{ word: string; meaning: string }>;
}

export interface ChallengeData {
  questions?: QuestQuestion[];
  target_words?: string[];
  context?: string;
  suggested_prompt?: string;
}

export interface EvolvedSkill {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: 'vocabulary' | 'grammar' | 'pronunciation';
  status: 'discovered' | 'in_progress' | 'mastered';
  challenge_data: ChallengeData;
  jlpt_level?: SkillJLPTLevel;
  xp_reward: number;
  expires_at: string;
  created_at?: string;
  last_reviewed_at?: string;
}

export const useEvolvedSkills = () => {
  const { user } = useAuth();
  const { awardXP } = useXP();
  const [skills, setSkills] = useState<EvolvedSkill[]>([]);
  const [reviewSkills, setReviewSkills] = useState<EvolvedSkill[]>([]);
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
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const all = (data || []) as EvolvedSkill[];
      // Active skills: discovered/in_progress
      const active = all.filter(s => s.status === 'discovered' || s.status === 'in_progress');
      // Review skills: mastered for > 7 days, has questions
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const forReview = all.filter(s =>
        s.status === 'mastered'
        && s.last_reviewed_at
        && s.last_reviewed_at < sevenDaysAgo
        && s.challenge_data?.questions
        && s.challenge_data.questions.length > 0
      );

      setSkills(active);
      setReviewSkills(forReview);
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
    } catch (e: any) {
      // Supabase Functions errors: the actual HTTP response body may be in
      // e.context (FunctionsHttpError) or e (FunctionsRelayError / generic)
      const httpStatus = e?.context?.status ?? e?.status;
      let bodyData: Record<string, unknown> = {};
      try {
        // FunctionsHttpError exposes the raw Response via e.context
        const raw = e?.context instanceof Response
          ? await e.context.json()
          : (typeof e?.context === 'object' && e?.context?.body ? e.context.body : null);
        if (raw) bodyData = raw;
      } catch { /* ignore parse errors */ }

      if (httpStatus === 429 || bodyData?.error === 'cooldown') {
        const nextAt = bodyData?.next_available_at as string | undefined;
        const timeStr = nextAt
          ? new Date(nextAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : '';
        toast.info(
          timeStr
            ? `EvoSkill đang hồi chiêu. Có thể tạo lúc ${timeStr} nhé!`
            : (bodyData?.message as string) ?? 'EvoSkill đang hồi chiêu. Thử lại sau nhé!'
        );
      } else {
        console.error('Lỗi tạo skills:', e);
        toast.error('Không thể tạo thử thách lúc này. Thử lại sau nhé!');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const markSkillAsMastered = async (skillId: string, score: number = 100) => {
    if (!user?.id) return 0;
    try {
      const skill = skills.find(s => s.id === skillId) || reviewSkills.find(s => s.id === skillId);
      if (!skill) return 0;

      const pct = Math.max(0, Math.min(100, score));
      const xpAmount = pct >= 70
        ? (skill.xp_reward || 50)
        : pct >= 30
          ? Math.round((skill.xp_reward || 50) * 0.5)
          : 0;

      // Award XP FIRST — if this fails, skill stays active for retry
      if (xpAmount > 0) {
        await awardXP('evolved_skill', xpAmount, {
          skill_id: skillId,
          score: pct,
        });
      }

      // Then mark as mastered in DB
      const { error: updateError } = await (supabase as any)
        .from('user_evolved_skills')
        .update({
          status: 'mastered',
          last_reviewed_at: new Date().toISOString(),
        })
        .eq('id', skillId);

      if (updateError) throw updateError;

      // Always remove from UI regardless of XP amount
      setSkills(prev => prev.filter(s => s.id !== skillId));
      setReviewSkills(prev => prev.filter(s => s.id !== skillId));

      return xpAmount;
    } catch (e) {
      console.error('Lỗi hoàn thành skill:', e);
      return 0;
    }
  };

  const reactivateSkill = async (skill: EvolvedSkill) => {
    // Move a mastered review skill back to active in DB
    try {
      await (supabase as any)
        .from('user_evolved_skills')
        .update({ status: 'discovered', last_reviewed_at: null })
        .eq('id', skill.id);
    } catch (e) {
      console.error('Lỗi reactivate skill:', e);
      return;
    }
    setReviewSkills(prev => prev.filter(s => s.id !== skill.id));
    setSkills(prev => [skill, ...prev]);
  };

  return { skills, reviewSkills, isLoading, isGenerating, fetchSkills, generateSkills, markSkillAsMastered, reactivateSkill };
};
