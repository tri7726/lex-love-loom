import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

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

const GENERATE_SKILLS_PROMPT = `Bạn là hệ thống Sư phạm AI của Lex-Love-Loom (EvoSkill Engine).
Dựa trên các lỗi sai gần đây của học viên (cung cấp dưới dạng JSON), hãy phân tích và tạo ra các thử thách khắc phục (Evolved Skills).
Nhiệm vụ: Trả về một mảng JSON (không bọc trong markdown hay text giải thích) chứa 1 đến 2 thử thách phù hợp nhất.
Schema mạng JSON:
[
  {
    "title": "Tên thử thách (ngắn gọn, thu hút)",
    "description": "Lý do và lợi ích của thử thách này (1 câu ngắn)",
    "type": "vocabulary" | "grammar" | "pronunciation",
    "challenge_data": {
      "target_words": ["các", "từ", "liên quan"],
      "suggested_prompt": "Câu ra lệnh để đưa cho Sensei bắt đầu thử thách"
    },
    "xp_reward": 50 // từ 50 đến 150 tùy độ khó
  }
]`;

export const useEvolvedSkills = () => {
  const { user } = useAuth();
  const [skills, setSkills] = useState<EvolvedSkill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchSkills = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
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
      // 1. Fetch recent mistakes
      const { data: mistakes } = await supabase
        .from('user_mistakes')
        .select('word, mistake_count, last_mistake_at, context')
        .eq('user_id', user.id)
        .order('last_mistake_at', { ascending: false })
        .limit(10);

      if (!mistakes || mistakes.length === 0) {
        toast.info("Bạn dạo này không mắc lỗi nào! Rất xuất sắc 🎉");
        return;
      }

      // 2. Call Sensei AI via Edge Function
      const { data, error } = await supabase.functions.invoke('japanese-chat', {
        body: {
          messages: [{ role: 'user', content: JSON.stringify(mistakes) }],
          systemPrompt: GENERATE_SKILLS_PROMPT,
        },
      });

      if (error || !data?.content) throw new Error('AI Generation failed');

      const raw = data.content.replace(/```json|```/g, '').trim();
      let generatedSkills: Partial<EvolvedSkill>[];
      try {
        generatedSkills = JSON.parse(raw);
      } catch (e) {
        console.error("Lỗi parse JSON từ AI:", raw);
        throw new Error("Dữ liệu AI trả về không hợp lệ");
      }

      // 3. Save to database
      const skillsToInsert = generatedSkills.map(skill => ({
        user_id: user.id,
        title: skill.title,
        description: skill.description,
        type: skill.type || 'vocabulary',
        challenge_data: skill.challenge_data as unknown as Json,
        xp_reward: skill.xp_reward || 50,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('user_evolved_skills')
        .insert(skillsToInsert)
        .select();

      if (insertError) throw insertError;

      if (inserted && inserted.length > 0) {
        setSkills(prev => [...(inserted as any as EvolvedSkill[]), ...prev]);
        toast.success(`Sensei vừa tạo ${inserted.length} thử thách mới cho bạn! 🌟`);
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
      // 1. Get the skill
      const skill = skills.find(s => s.id === skillId);
      if (!skill) return;

      // 2. Update status
      const { error } = await supabase
        .from('user_evolved_skills')
        .update({ status: 'mastered' })
        .eq('id', skillId);

      if (error) throw error;

      // 3. Award XP
      await supabase.from('xp_events').insert({
        user_id: user.id,
        amount: skill.xp_reward,
        source: 'evolved_skill',
        description: `Hoàn thành thử thách: ${skill.title}`
      });

      // Optimistic update
      setSkills(prev => prev.filter(s => s.id !== skillId));
      
      return skill.xp_reward;
    } catch (e) {
      console.error('Lỗi hoàn thành skill:', e);
      return 0;
    }
  };

  return { skills, isLoading, isGenerating, fetchSkills, generateSkills, markSkillAsMastered };
};
