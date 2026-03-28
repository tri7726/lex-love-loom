import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LearningStep {
  type: 'warmup' | 'practice' | 'challenge';
  label: string;
  prompt: string;
  icon: string;
}

export interface LearningPath {
  focus_topic: string;
  reason: string;
  steps: LearningStep[];
  generated_at: string;
}

const GENERATE_PATH_PROMPT = `Bạn là chuyên gia sư phạm tiếng Nhật. Dựa trên hồ sơ và lịch sử học dưới đây, hãy tạo một "Lộ trình học hôm nay" ngắn gọn và thực tế.

Trả về JSON với đúng format này (không kèm markdown):
{
  "focus_topic": "Tên chủ đề trọng tâm hôm nay",
  "reason": "Lý do ngắn gọn tại sao chọn chủ đề này (1 câu)",
  "steps": [
    { "type": "warmup", "label": "Khởi động", "icon": "🌸", "prompt": "Câu gửi cho Sensei để bắt đầu phần khởi động" },
    { "type": "practice", "label": "Luyện tập", "icon": "⚡", "prompt": "Câu gửi cho Sensei để bắt đầu phần luyện tập" },
    { "type": "challenge", "label": "Thử thách", "icon": "🏆", "prompt": "Câu gửi cho Sensei để bắt đầu phần thử thách" }
  ]
}

Lưu ý: prompt phải là câu tự nhiên, ngắn gọn bằng tiếng Việt mà người dùng sẽ nhắn cho Sensei.`;

const CACHE_KEY_PREFIX = 'sensei_learning_path_';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

export const useLearningPath = () => {
  const { user } = useAuth();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const getCachedPath = useCallback((): LearningPath | null => {
    if (!user?.id) return null;
    try {
      const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${user.id}`);
      if (!cached) return null;
      const data: LearningPath = JSON.parse(cached);
      const age = Date.now() - new Date(data.generated_at).getTime();
      if (age > CACHE_TTL_MS) return null; // Cache expired
      return data;
    } catch {
      return null;
    }
  }, [user?.id]);

  const generatePath = useCallback(async () => {
    if (!user?.id || isGenerating) return;

    // 1. Check cache first
    const cached = getCachedPath();
    if (cached) {
      setPath(cached);
      return;
    }

    setIsGenerating(true);
    try {
      // 2. Fetch user's profile + recent mistakes from knowledge base
      const { data: knowledge } = await supabase
        .from('sensei_knowledge' as any)
        .select('content, source_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!knowledge || knowledge.length < 2) {
        setIsGenerating(false);
        return; // Not enough data yet
      }

      const historyText = (knowledge as any[])
        .map(k => `[${k.source_type}] ${k.content}`)
        .join('\n');

      // 3. Call Groq via the sensei-rag approach (using japanese-chat as proxy)
      const { data, error } = await supabase.functions.invoke('japanese-chat', {
        body: {
          messages: [{ role: 'user', content: `${GENERATE_PATH_PROMPT}\n\nDữ liệu:\n${historyText}` }],
          systemPrompt: 'Bạn là hệ thống sư phạm AI. Chỉ trả về JSON, không có markdown, không có giải thích thêm.',
        },
      });

      if (error || !data?.content) throw new Error('Generation failed');

      const raw = data.content.replace(/```json|```/g, '').trim();
      const parsed: Omit<LearningPath, 'generated_at'> = JSON.parse(raw);
      const newPath: LearningPath = { ...parsed, generated_at: new Date().toISOString() };

      // 4. Cache and set
      localStorage.setItem(`${CACHE_KEY_PREFIX}${user.id}`, JSON.stringify(newPath));
      setPath(newPath);
    } catch (e) {
      console.warn('Learning path generation failed:', e);
    } finally {
      setIsGenerating(false);
    }
  }, [user?.id, isGenerating, getCachedPath]);

  const clearPath = useCallback(() => {
    if (user?.id) localStorage.removeItem(`${CACHE_KEY_PREFIX}${user.id}`);
    setPath(null);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) generatePath();
  }, [user?.id]); // eslint-disable-line

  return { path, isGenerating, generatePath, clearPath };
};
