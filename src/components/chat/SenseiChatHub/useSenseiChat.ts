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
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
  const [messages, setMessages] = useState<SenseiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMeta, setPendingMeta] = useState<{ title: string; mode: SenseiMode; systemPrompt?: string } | null>(null);
  const [guestMessageCount, setGuestMessageCount] = useState<number>(0);

  const isGuest = !user;
  const STORAGE_KEY_ACTIVE = `sensei_active_conv_${user?.id || 'guest'}`;
  const STORAGE_KEY_GUEST_CONVS = 'sensei_guest_conversations';
  const STORAGE_KEY_GUEST_COUNT = 'sensei_guest_message_count';

  // Load guest count on init
  useEffect(() => {
    if (isGuest) {
      const savedCount = localStorage.getItem(STORAGE_KEY_GUEST_COUNT);
      if (savedCount) setGuestMessageCount(parseInt(savedCount));
    }
  }, [isGuest]);

  // Helper to change active conversation and load its messages
  const setActiveConversationId = useCallback(async (id: string | null) => {
    setActiveConversationIdState(id);
    if (!id || id === 'new') {
      setMessages([]);
      return;
    }

    if (isGuest) {
      const guestMessagesKey = `sensei_guest_messages_${id}`;
      const savedMessages = localStorage.getItem(guestMessagesKey);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        setMessages([]);
      }
      return;
    }

    // Load messages immediately from the existing conversations state first for speed (Logged in)
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      const messages = (conv.analysis as any)?.messages || [];
      setMessages(messages);
    } else {
      const { data } = await supabase
        .from('analysis_history')
        .select('analysis')
        .eq('id', id)
        .single();
      
      if (data) {
        setMessages((data.analysis as any)?.messages || []);
      }
    }
  }, [conversations, isGuest]);

  // Initialize activeConversationId from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (savedId && !activeConversationId && savedId !== 'new') {
      setActiveConversationId(savedId);
    }
  }, [user, STORAGE_KEY_ACTIVE]);

  // Sync activeConversationId to localStorage
  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE, activeConversationId);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    }
  }, [activeConversationId, STORAGE_KEY_ACTIVE]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (isGuest) {
      const saved = localStorage.getItem(STORAGE_KEY_GUEST_CONVS);
      if (saved) {
        setConversations(JSON.parse(saved));
      }
      return;
    }
    
    const { data, error } = await supabase
      .from('analysis_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return;

    const mapped: SenseiConversation[] = (data || []).map(item => ({
      id: item.id,
      user_id: item.user_id,
      title: (item.analysis as any)?.title || (item.content ? item.content.substring(0, 30) : "Hội thoại mới"),
      mode: (item.analysis as any)?.mode || 'tutor',
      is_pinned: (item.analysis as any)?.is_pinned || false,
      analysis: item.analysis as Json,
      updated_at: item.created_at,
      created_at: item.created_at
    }));

    setConversations(mapped);
  }, [user, isGuest]);

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

  const createNewConversation = (title: string = 'Cuộc hội thoại mới', mode: SenseiMode = 'tutor', systemPrompt?: string) => {
    setActiveConversationId(null);
    setPendingMeta({ title, mode, systemPrompt });
  };

  const sendMessage = async (content: string, type: SenseiMessageType, metadata?: any) => {
    if (isGuest && guestMessageCount >= 5) {
      toast.error("Bạn đã hết lượt dùng thử. Đăng nhập để tiếp tục nhé!");
      return;
    }

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

    let currentMessages: SenseiMessage[] = [];
    setMessages(prev => {
      currentMessages = [...prev, userMsg];
      return currentMessages;
    });

    try {
      let aiResponse = "";
      let aiMeta = {};

      // AI Logic (Identical for Guest and User)
      if (type === 'analysis') {
          const result = await analyzeText(content);
          aiResponse = typeof result === 'string' ? result : (result?.analysis || JSON.stringify(result));
      } else if (type === 'correction') {
          const result = await checkGrammar(content);
          aiResponse = typeof result === 'string' ? result : (result?.result || JSON.stringify(result));
      } else {
          const chatHistory = currentMessages.map(m => ({ role: m.role, content: m.content }));
          
          let mistakeContext = "";
          if (!isGuest) {
            const { data: mistakes } = await (supabase as any)
              .from('user_mistakes')
              .select('word')
              .eq('user_id', user.id)
              .order('last_mistake_at', { ascending: false })
              .limit(5);
            
            if (mistakes && mistakes.length > 0) {
              mistakeContext = `\nLưu ý: Bạn hay gặp khó khăn với: ${mistakes.map((m: any) => m.word).join(', ')}.`;
            }
          }

          const activeConv = conversations.find(c => c.id === activeConversationId);
          const currentMode = pendingMeta?.mode || (activeConv?.mode || 'tutor');
          const customSystemPrompt = pendingMeta?.systemPrompt || (activeConv as any)?.analysis?.system_prompt;

          let systemPrompt = `Bạn là Sensei, phiên bản "Pro Max Ultra Plus" - Bậc thầy tối cao về Nhật ngữ và Văn hóa tinh hoa.
          CẤU TRÚC PHẢN HỒI "PRO MAX ULTRA PLUS":
          1. 🎐 **Tư duy & Văn hóa**: Giải thích sâu sắc cách người Nhật cảm nhận và sử dụng ngôn ngữ.
          2. 🔥 **Teachable Moment**: Cung cấp :::vocab{漢字|読み|Nghĩa}::: cho từ mới. Không dùng backtick.
          3. 🌸 **Câu hỏi Gợi mở**: Kết thúc bằng một câu hỏi mang tính suy ngẫm.${mistakeContext}`;
          
          if (currentMode === 'roleplay' && customSystemPrompt) {
            systemPrompt = `Nhập vai: ${customSystemPrompt}. ${mistakeContext}`;
          }

          const result = await chat(chatHistory, systemPrompt);
          aiResponse = typeof result === 'string' ? result : (result?.content || "Sensei đã sẵn sàng!");
      }

      const aiMsg: SenseiMessage = {
        id: generateId(),
        conversation_id: activeConversationId || 'new',
        role: 'assistant',
        content: aiResponse,
        type,
        metadata: { ...aiMeta, source: 'Sensei Hub' } as any,
        created_at: new Date().toISOString()
      };

      let finalMessages: SenseiMessage[] = [];
      setMessages(prev => {
        finalMessages = [...prev, aiMsg];
        return finalMessages;
      });

      // Persistence Layer
      if (isGuest) {
        const newCount = guestMessageCount + 1;
        setGuestMessageCount(newCount);
        localStorage.setItem(STORAGE_KEY_GUEST_COUNT, newCount.toString());

        if (!activeConversationId) {
          const newId = generateId();
          const newConv: SenseiConversation = {
            id: newId,
            user_id: 'guest',
            title: pendingMeta?.title || content.substring(0, 20),
            mode: pendingMeta?.mode || 'tutor',
            is_pinned: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          const updatedConvs = [newConv, ...conversations];
          setConversations(updatedConvs);
          localStorage.setItem(STORAGE_KEY_GUEST_CONVS, JSON.stringify(updatedConvs));
          localStorage.setItem(`sensei_guest_messages_${newId}`, JSON.stringify(finalMessages));
          setActiveConversationIdState(newId);
          setPendingMeta(null);
        } else {
          localStorage.setItem(`sensei_guest_messages_${activeConversationId}`, JSON.stringify(finalMessages));
        }
      } else {
        // Authenticated Persistence (User)
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
                messages: finalMessages as any 
              } as Json,
              engine: 'gemini'
            })
            .select().single();

          if (!error && data) {
            setActiveConversationIdState(data.id);
            setPendingMeta(null);
            fetchConversations();
          }
        } else {
          const updatedAnalysis = {
            ...(conversations.find(c => c.id === activeConversationId)?.analysis as any) || {},
            messages: finalMessages
          };
          await supabase.from('analysis_history').update({ analysis: updatedAnalysis as Json }).eq('id', activeConversationId);
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
    if (isGuest) return; // Feature for VIPs
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    const newMetadata = { ...((conv as any).analysis || {}), is_pinned: !conv.is_pinned };
    await supabase.from('analysis_history').update({ analysis: newMetadata }).eq('id', id);
    fetchConversations();
  };

  const deleteConversation = async (id: string) => {
    if (isGuest) {
      const updated = conversations.filter(c => c.id !== id);
      setConversations(updated);
      localStorage.setItem(STORAGE_KEY_GUEST_CONVS, JSON.stringify(updated));
      localStorage.removeItem(`sensei_guest_messages_${id}`);
    } else {
      await supabase.from('analysis_history').delete().eq('id', id);
    }
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
    deleteConversation,
    isGuest,
    guestMessageCount
  };
};
