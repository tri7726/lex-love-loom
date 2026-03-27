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

  const STORAGE_KEY = `sensei_active_conv_${user?.id || 'guest'}`;

  // Helper to change active conversation and load its messages
  const setActiveConversationId = useCallback(async (id: string | null) => {
    setActiveConversationIdState(id);
    if (!id || id === 'new') {
      setMessages([]);
      return;
    }

    // Load messages immediately from the existing conversations state first for speed
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      const messages = (conv.analysis as any)?.messages || [];
      setMessages(messages);
    } else {
      // If not in cache, fetch from DB
      const { data } = await supabase
        .from('analysis_history')
        .select('analysis')
        .eq('id', id)
        .single();
      
      if (data) {
        setMessages((data.analysis as any)?.messages || []);
      }
    }
  }, [conversations]);

  // Initialize activeConversationId from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId && !activeConversationId && savedId !== 'new') {
      setActiveConversationId(savedId);
    }
  }, [user, setActiveConversationId, activeConversationId, STORAGE_KEY]);

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

  const createNewConversation = (title: string = 'Cuộc hội thoại mới', mode: SenseiMode = 'tutor', systemPrompt?: string) => {
    setActiveConversationId(null);
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

    // Use latest messages state via functional update
    let currentMessages: SenseiMessage[] = [];
    setMessages(prev => {
      currentMessages = [...prev, userMsg];
      return currentMessages;
    });

    try {
      let aiResponse = "";
      let aiMeta = {};

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
          const chatHistory = currentMessages.map(m => ({ role: m.role, content: m.content }));
          
          // Fetch user mistakes for personalization
          const { data: mistakes } = await (supabase as any)
            .from('user_mistakes')
            .select('word')
            .eq('user_id', user.id)
            .order('last_mistake_at', { ascending: false })
            .limit(5);
          
          const mistakeContext = mistakes && mistakes.length > 0 
            ? `\nLưu ý: Bạn hay gặp khó khăn với: ${mistakes.map(m => m.word).join(', ')}.`
            : "";

          const activeConv = conversations.find(c => c.id === activeConversationId);
          const currentMode = pendingMeta?.mode || (activeConv?.mode || 'tutor');
          const customSystemPrompt = pendingMeta?.systemPrompt || (activeConv as any)?.analysis?.system_prompt;

          let systemPrompt = `Bạn là Sensei, phiên bản "Pro Max Ultra Plus" - Bậc thầy tối cao.
          :::vocab{漢字|読み|Nghĩa}::: cho mọi từ mới.
          Tuyệt đối không dùng dấu backtick (\`).${mistakeContext}`;
          
          if (currentMode === 'roleplay' && customSystemPrompt) {
            systemPrompt = `Nhập vai: ${customSystemPrompt}. ${mistakeContext}`;
          } else if (currentMode === 'speaking') {
            systemPrompt = "Bạn là Sensei giúp người dùng luyện phát âm. Hãy phản hồi ngắn gọn bằng tiếng Nhật kèm dịch nghĩa tiếng Việt và nhận xét về ngữ điệu. Khuyến khích người dùng thử lại hoặc học thêm từ vựng liên quan. " + mistakeContext;
          }

          try {
            const result = await chat(chatHistory, systemPrompt);
            aiResponse = typeof result === 'string' ? result : (result?.content || result?.text || "Sensei đã sẵn sàng!");
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
        metadata: { ...aiMeta, source: 'Sensei Hub' } as any,
        created_at: new Date().toISOString()
      };

      // update local state again
      let finalMessages: SenseiMessage[] = [];
      setMessages(prev => {
        finalMessages = [...prev, aiMsg];
        return finalMessages;
      });

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
              messages: finalMessages as any 
            } as Json,
            engine: 'gemini'
          })
          .select()
          .single();

        if (!error && data) {
          setActiveConversationIdState(data.id);
          setPendingMeta(null); // Clear pending meta after saving
          fetchConversations();
        }
      } else {
        // If it's an existing conversation, update with the current local messages state
        const updatedAnalysis = {
          ...(conversations.find(c => c.id === activeConversationId)?.analysis as any) || {},
          messages: finalMessages
        };
        
        await supabase
          .from('analysis_history')
          .update({ analysis: updatedAnalysis as Json })
          .eq('id', activeConversationId);
        
        // Refresh local conversations to keep everything in sync
        fetchConversations();
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
