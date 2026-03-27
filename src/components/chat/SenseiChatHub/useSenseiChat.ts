import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SenseiConversation, SenseiMessage, SenseiMessageType, SenseiMode } from './types';
import { useAI } from '@/contexts/AIContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

export const useSenseiChat = () => {
  const { user } = useAuth();
  const { analyzeText, checkGrammar, chat } = useAI();
  const [conversations, setConversations] = useState<SenseiConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SenseiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMeta, setPendingMeta] = useState<{ title: string; mode: SenseiMode; systemPrompt?: string } | null>(null);

  const STORAGE_KEY = `sensei_active_conv_${user?.id || 'guest'}`;

  // Initialize activeConversationId from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId && !activeConversationId && savedId !== 'new') {
      setActiveConversationId(savedId);
    }
  }, [user, STORAGE_KEY]);

  // Sync activeConversationId to localStorage
  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem(STORAGE_KEY, activeConversationId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeConversationId, STORAGE_KEY]);

  // Fetch conversations and cleanup old ones
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    // Using analysis_history as a proxy for conversations for now 
    // to avoid schema migration blocks, but we treat them as sessions
    const { data, error } = await supabase
      .from('analysis_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    // Transform into SenseiConversation
    // Note: This is an adaptation. In a real production app, 
    // we would use the dedicated ai_conversations table from our plan.
    const mapped: SenseiConversation[] = (data || []).map(item => ({
      id: item.id,
      user_id: item.user_id,
      title: (item.analysis as any)?.title || (item.content ? item.content.substring(0, 30) : "Hội thoại mới"),
      mode: (item.analysis as any)?.mode || 'tutor',
      is_pinned: (item.analysis as any)?.is_pinned || false,
      analysis: item.analysis as Json,
      updated_at: item.created_at, // Use created_at as updated_at for now
      created_at: item.created_at
    }));

    // Auto-cleanup logic (Client-side trigger)
    const filtered = mapped.filter(c => {
      const isPinned = c.is_pinned;
      const daysOld = (new Date().getTime() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      if (!isPinned && daysOld > 15) {
        // We could trigger a background delete here
        return false;
      }
      return true;
    });

    setConversations(filtered);
  }, [user]);

  // Combine real conversations with virtual pending one
  const allConversations = useCallback(() => {
    if (!pendingMeta) return conversations;
    const virtualConv: SenseiConversation = {
      id: 'new',
      user_id: user?.id || 'guest',
      title: pendingMeta.title,
      mode: pendingMeta.mode,
      is_pinned: false,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    return [virtualConv, ...conversations];
  }, [conversations, pendingMeta, user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversationId || activeConversationId === 'new') {
      // Don't clear messages if we are starting a new conversation
      // as they might be pre-populated by sendMessage
      return;
    }

    const loadMessages = async () => {
      // In this specialized implementation, we check if the conversation has a history in its JSON
      const conv = conversations.find(c => c.id === activeConversationId);
      if (!conv) return;

      const analysisObj = conv.analysis as any;
      if (analysisObj && Array.isArray(analysisObj.messages)) {
        setMessages(analysisObj.messages);
      }
    };

    loadMessages();
  }, [activeConversationId]); // Only trigger when the ID changes, not when conversations list updates

  const createNewConversation = (title: string = 'Cuộc hội thoại mới', mode: SenseiMode = 'tutor', systemPrompt?: string) => {
    setActiveConversationId(null);
    setMessages([]);
    setPendingMeta({ title, mode, systemPrompt });
    
    // If there's a system prompt, we might want to show a welcoming message from the AI
    // but usually we wait for user input.
  };

  const sendMessage = async (content: string, type: SenseiMessageType, metadata?: any) => {
    if (!user) return;
    setIsLoading(true);

    const userMsg: SenseiMessage = {
      id: generateId(),
      conversation_id: activeConversationId || 'new',
      role: 'user',
      content,
      type,
      metadata: metadata as Json,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      let aiResponse = "";
      let metadata = {};

      if (type === 'analysis') {
         const result = await analyzeText(content);
         // analyzeText returns an object like {format, analysis, engine} - extract text
         if (typeof result === 'string') {
           aiResponse = result;
         } else if (result?.analysis) {
           aiResponse = typeof result.analysis === 'string' 
             ? result.analysis 
             : JSON.stringify(result.analysis, null, 2);
         } else {
           aiResponse = JSON.stringify(result, null, 2);
         }
      } else if (type === 'correction') {
         const result = await checkGrammar(content);
         if (typeof result === 'string') {
           aiResponse = result;
         } else if (result?.result) {
           aiResponse = typeof result.result === 'string'
             ? result.result
             : JSON.stringify(result.result, null, 2);
         } else {
           aiResponse = JSON.stringify(result, null, 2);
         }
      } else {
          const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
          chatHistory.push({ role: 'user', content });
          
          // Fetch user mistakes for personalization
          const { data: mistakes } = await (supabase as any)
            .from('user_mistakes')
            .select('word')
            .eq('user_id', user.id)
            .order('last_mistake_at', { ascending: false })
            .limit(5);
          
          const mistakeContext = mistakes && mistakes.length > 0 
            ? `\nLưu ý: Người dùng gần đây hay gặp khó khăn với: ${mistakes.map(m => m.word).join(', ')}. Hãy lồng ghép việc ôn tập các phần này nếu phù hợp.`
            : "";

          const activeConv = conversations.find(c => c.id === activeConversationId);
          const currentMode = pendingMeta?.mode || (activeConv?.mode || 'tutor');
          const customSystemPrompt = pendingMeta?.systemPrompt || (activeConv as any)?.analysis?.system_prompt;

          let systemPrompt = `Bạn là Sensei, phiên bản "Pro Max Ultra Plus" - Bậc thầy tối cao về tiếng Nhật và văn hóa tinh hoa Nhật Bản.
          Phong cách: TRÍ TUỆ, TINH TẾ, ẤM ÁP và LUÔN ƯU TIÊN THẨM MỸ CAO CẤP.
          
          CẤU TRÚC PHẢN HỒI "PRO MAX ULTRA PLUS":
          1. 🎐 **Tư duy & Văn hóa (The Japanese Mind)**: Giải thích sâu sắc cách người Nhật cảm nhận và sử dụng ngôn ngữ trong đời sống. Đây là phần quan trọng nhất.
          2. 💡 **Ngữ cảnh & Sắc thái (Context & Nuance)**: Chỉ rõ sự khác biệt tinh tế giữa các cách dùng từ.
          3. 📝 **Từ vựng Thượng hạng (Interactive Vocab Cards)**: 
             BẮT BUỘC dùng cú pháp: :::vocab{漢字|読み|Nghĩa}::: cho mọi từ vựng quan trọng.
             (Ví dụ: :::vocab{お疲れ様|おつかれさま/Otsukaresama|Cảm ơn vì sự vất vả của bạn}::: )
          4. 🌸 **Câu hỏi Gợi mở (Reflective Questions)**: Kết thúc bằng một câu hỏi mang tính gợi mở hoặc suy ngẫm để duy trì cảm hứng học tập.
          
          KỸ THUẬT:
          - Dẫn dắt đến [Phòng Lab Kanji](/kanji-lab), [Từ vựng](/vocabulary), [Học qua Video](/video-learning) một cách tự nhiên.
          - TUYỆT ĐỐI KHÔNG dùng dấu backtick (\`).
          - Dùng **chữ đậm** cho các ý chính.
          - Đảm bảo văn bản tiếng Việt cực kỳ chuyên nghiệp và sang trọng.${mistakeContext}`;
          
          if (currentMode === 'roleplay' && customSystemPrompt) {
            systemPrompt = `Bạn đang trong chế độ Nhập vai. ${customSystemPrompt}. Hãy luôn lồng ghép kiến thực tiếng Nhật vào tình huống này. Cuối câu trả lời, hãy hỏi xem người dùng muốn tiếp tục tình huống hay muốn biết thêm về từ vựng đã dùng không. ${mistakeContext}`;
          } else if (currentMode === 'speaking') {
            systemPrompt = "Bạn là Sensei giúp người dùng luyện phát âm. Hãy phản hồi ngắn gọn bằng tiếng Nhật kèm dịch nghĩa tiếng Việt và nhận xét về ngữ điệu. Khuyến khích người dùng thử lại hoặc học thêm từ vựng liên quan. " + mistakeContext;
          }

          try {
            const result = await chat(chatHistory, systemPrompt);
            aiResponse = typeof result === 'string' ? result : (result?.content || result?.text || "");
          } catch (chatErr) {
            console.error("Chat invocation failed, using fallback:", chatErr);
          }

          if (!aiResponse) {
            aiResponse = "Sensei đã nhận được tin nhắn của bạn! Hiện tại kết nối AI đang bận một chút, nhưng tôi vẫn ở đây hỗ trợ bạn học tiếng Nhật nhé. Bạn muốn hỏi thêm gì không?";
          }
      }

      const aiMsg: SenseiMessage = {
        id: generateId(),
        conversation_id: activeConversationId || 'new',
        role: 'assistant',
        content: aiResponse,
        type,
        metadata: { ...metadata, source: 'Notebook N5' } as any,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMsg]);

      // If it's a new conversation, save it
      if (!activeConversationId) {
        const { data, error } = await supabase
          .from('analysis_history')
          .insert({
            user_id: user.id,
            content: content,
            analysis: { 
              title: pendingMeta?.title || content.substring(0, 20), 
              mode: pendingMeta?.mode || 'tutor', 
              system_prompt: pendingMeta?.systemPrompt,
              messages: [userMsg, aiMsg] as any 
            } as Json,
            engine: 'gemini'
          })
          .select()
          .single();

        if (!error && data) {
          setActiveConversationId(data.id);
          setPendingMeta(null); // Clear pending meta after saving
          fetchConversations();
        }
      } else {
        // If it's an existing conversation, update the message history in DB
        const currentConv = conversations.find(c => c.id === activeConversationId);
        if (currentConv) {
          const updatedAnalysis = {
            ...(currentConv as any).analysis || {},
            messages: [...messages, userMsg, aiMsg]
          };
          
          await supabase
            .from('analysis_history')
            .update({ analysis: updatedAnalysis as Json })
            .eq('id', activeConversationId);
          
          // Refresh local conversations to keep everything in sync
          fetchConversations();
        }
      }
    } catch (err) {
      toast.error("Sensei đang bận, vui lòng thử lại sau!");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePin = async (id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;

    const pinnedCount = conversations.filter(c => c.is_pinned).length;
    if (!conv.is_pinned && pinnedCount >= 4) {
      toast.warning("Bạn chỉ có thể ghim tối đa 4 hội thoại!");
      return;
    }

    // Update metadata in analysis_history
    const newMetadata = { ...((conv as any).analysis || {}), is_pinned: !conv.is_pinned };
    await supabase.from('analysis_history').update({ analysis: newMetadata }).eq('id', id);
    fetchConversations();
  };

  const deleteConversation = async (id: string) => {
    await supabase.from('analysis_history').delete().eq('id', id);
    if (activeConversationId === id) setActiveConversationId(null);
    fetchConversations();
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  return {
    conversations: allConversations(),
    activeConversationId: activeConversationId || (pendingMeta ? 'new' : null),
    activeConversation: activeConversation || (pendingMeta ? {
      id: 'new',
      user_id: user?.id || 'guest',
      title: pendingMeta.title,
      mode: pendingMeta.mode,
      is_pinned: false,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    } : null),
    setActiveConversationId,
    messages,
    isLoading,
    sendMessage,
    createNewConversation,
    pinConversation: togglePin,
    deleteConversation
  };
};
