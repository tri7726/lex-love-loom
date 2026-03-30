import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SenseiConversation, SenseiMessage, SenseiMessageType, SenseiMode } from './types';
import { useAI } from '@/contexts/AIContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { CORE_RULES, getContextualGreeting, getNonRepeatingCulturalFact, getRandomNextStep, getTimeOfDay } from './prompt_repository';

const assembleSystemPrompt = (mode: SenseiMode, mistakeContext?: string | null) => {
  const greeting = getContextualGreeting(mode);
  const culturalFact = getNonRepeatingCulturalFact();
  const nextStep = getRandomNextStep();

  return `Bạn là **Sensei Pro Max** – chuyên gia Nhật ngữ & văn hóa Nhật Bản đẳng cấp cao.

${greeting}

💡 *Kiến thức văn hóa hôm nay*: ${culturalFact}

${CORE_RULES}

${mistakeContext ? `\n⚠️ **Lưu ý lỗi trước đó**: ${mistakeContext}. Hãy phân tích nguyên nhân sâu và giúp người học điều chỉnh tư duy.` : ''}

${nextStep}`;
};

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
      const messages = (conv.analysis as { messages?: SenseiMessage[] })?.messages || [];
      setMessages(messages);
    } else {
      const { data } = await supabase
        .from('analysis_history')
        .select('analysis')
        .eq('id', id)
        .single();
      
      if (data) {
        setMessages((data.analysis as { messages?: SenseiMessage[] })?.messages || []);
      }
    }
  }, [conversations, isGuest]);

  // Initialize activeConversationId from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (savedId && !activeConversationId && savedId !== 'new') {
      setActiveConversationId(savedId);
    }
  }, [user, STORAGE_KEY_ACTIVE, activeConversationId, setActiveConversationId]);

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

    const mapped: SenseiConversation[] = (data || []).map(item => {
      const analysis = item.analysis as { 
        title?: string; 
        mode?: SenseiMode; 
        is_pinned?: boolean;
      } | null;
      
      return {
        id: item.id,
        user_id: item.user_id,
        title: analysis?.title || (item.content ? item.content.substring(0, 30) : "Hội thoại mới"),
        mode: analysis?.mode || 'tutor',
        is_pinned: analysis?.is_pinned || false,
        analysis: item.analysis as Json,
        updated_at: item.created_at,
        created_at: item.created_at
      };
    });

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
      
      // Initialize assistant message for streaming
      const assistantMsgId = generateId();
      const initialAssistantMsg: SenseiMessage = {
        id: assistantMsgId,
        conversation_id: activeConversationId || 'new',
        role: 'assistant',
        content: "",
        type,
        metadata: { source: 'Sensei Hub' } as any,
        created_at: new Date().toISOString()
      };

      if (type !== 'text') {
        // Fallback for non-text types (analysis, correction) - streaming not yet implemented for these
        let result;
        if (type === 'analysis') {
            result = await analyzeText(content);
            aiResponse = typeof result === 'string' ? result : (result?.analysis || JSON.stringify(result));
        } else if (type === 'correction') {
            result = await checkGrammar(content);
            aiResponse = typeof result === 'string' ? result : (result?.result || JSON.stringify(result));
        }
        
        setMessages(prev => [...prev, { ...initialAssistantMsg, content: aiResponse }]);
      } else {
          // Streaming implementation for text/chat
          setMessages(prev => [...prev, initialAssistantMsg]);

          const chatHistory = currentMessages.map(m => {
            if (m.type === 'image' && m.metadata && (m.metadata as any).imageUrl) {
              return {
                role: m.role,
                content: [
                  { type: "text", text: m.content || "Analyze this image." },
                  { type: "image_url", image_url: { url: (m.metadata as any).imageUrl } }
                ]
              };
            }
            return { role: m.role, content: m.content };
          });
          
          let mistakeContext = "";
          if (!isGuest && user?.id) {
            const { data: mistakes } = await (supabase as any)
              .from('user_mistakes')
              .select('word, context')
              .eq('user_id', user.id)
              .order('last_mistake_at', { ascending: false })
              .limit(5);
            
            if (mistakes && mistakes.length > 0) {
              const mistakeList = mistakes
                .map((m: { word: string; context?: string }) => {
                  const ctx = m.context && m.context !== 'N/A' ? ` (trong ngữ cảnh: ${m.context})` : '';
                  return `${m.word}${ctx}`;
                })
                .join(', ');
              mistakeContext = `\nLưu ý: Bạn hay gặp khó khăn với: ${mistakeList}. Hãy ưu tiên đặt câu hỏi hoặc tạo widget liên quan đến các điểm yếu này.`;
            }
          }

          const activeConv = conversations.find(c => c.id === activeConversationId);
          const currentMode = pendingMeta?.mode || (activeConv?.mode || 'tutor');
          const customSystemPrompt = pendingMeta?.systemPrompt || (activeConv as any)?.analysis?.system_prompt;

          let systemPrompt = assembleSystemPrompt(currentMode, mistakeContext);
          
          if (currentMode === 'roleplay' && customSystemPrompt) {
            systemPrompt = `Bạn là **Sensei Pro Max** trong chế độ nhập vai.
\n\n🎭 **Nhập vai**: ${customSystemPrompt}
\n\n${CORE_RULES}
\nDù đang nhập vai, bạn vẫn CÓ THỂ và NÊN tạo :::vocab::: và :::widget::: khi phù hợp để giúp người học.
${mistakeContext ? `\n⚠️ Lưu ý nhẹ: Người học đang yếu: ${mistakeContext}. Lồng ghép ôn tập tự nhiên vào nhập vai.` : ''}`;
          }

          let accumulatedResponse = "";
          await (useAI() as any).streamChat(chatHistory, systemPrompt, user?.id, (chunk: string) => {
            accumulatedResponse += chunk;
            setMessages(prev => prev.map(m => 
              m.id === assistantMsgId ? { ...m, content: accumulatedResponse } : m
            ));
          });
          aiResponse = accumulatedResponse;
      }

      const finalMessages = [...currentMessages, { ...initialAssistantMsg, content: aiResponse }];

      // ── RAG Persistence Layer (Deferred until after stream) ──
      if (!isGuest && user?.id) {
        const RAG_COUNT_KEY = `sensei_rag_msg_count_${user.id}`;
        const ragCount = parseInt(localStorage.getItem(RAG_COUNT_KEY) || '0') + 1;
        localStorage.setItem(RAG_COUNT_KEY, ragCount.toString());

        supabase.functions.invoke('sensei-rag', {
          body: {
            action: 'summarize_and_index',
            user_id: user.id,
            content: `User: ${content}\nSensei: ${aiResponse}`,
            source_type: 'conversation',
            metadata: { type, conversation_id: activeConversationId || 'new' }
          }
        }).catch(e => console.warn('RAG Smart Chunk failed:', e));

        if (ragCount % 10 === 0) {
          supabase.functions.invoke('sensei-rag', {
            body: { action: 'update_profile', user_id: user.id }
          }).catch(e => console.warn('RAG Profile Update failed:', e));
        }
      }

      // Persistence Layer (Supabase / LocalStorage)
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
      console.error("SendMessage error:", err);
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
    if (activeConversationId === id) {
      setActiveConversationIdState(null);
      setPendingMeta(null);
      setMessages([]);
    }
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
    startProactiveSession: async () => {
      if (isGuest) return;
      setIsLoading(true);
      try {
        const { data: mistakes } = await supabase
          .from('sensei_knowledge')
          .select('content, metadata')
          .eq('user_id', user?.id)
          .eq('source_type', 'mistake')
          .order('created_at', { ascending: false })
          .limit(3);

        if ((mistakes as any[]) && (mistakes as any[]).length > 0) {
          const contents = (mistakes as any[]).map(m => m.content).join('、');
          const timeOfDay = getTimeOfDay();
          const timeGreeting = {
            morning: 'Buổi sáng tốt lành',
            afternoon: 'Buổi chiều năng động',
            evening: 'Buổi tối thư thái',
            night: 'Đêm khuya chăm chỉ'
          }[timeOfDay];

          const proactivePrompt = `${timeGreeting}! Bạn vừa mở chat, Sensei đã chuẩn bị sẵn bài ôn tập cá nhân hóa dành cho bạn.

Gần đây bạn có một số nhầm lẫn: **${contents}**.

${CORE_RULES}

Nhiệm vụ của bạn trong phiên này:
1. Mở đầu bằng cách nhắc lại nhẹ nhàng và khích lệ về các điểm yếu trên.
2. Ngay lập tức tạo một widget (Quiz HOẶC Fill-blank) về một trong những từ/cấu trúc đó.
3. Kết thúc bằng câu hỏi gợi mở để người học tự phản tư.`;

          createNewConversation(`Ôn tập cùng Sensei`, 'tutor', proactivePrompt);
          await sendMessage("Chào Sensei, mình muốn ôn tập lại những gì mình còn yếu.", 'text');
        } else {
          createNewConversation();
        }
      } catch (e) {
        createNewConversation();
      } finally {
        setIsLoading(false);
      }
    },
    logMistake: async (content: string, metadata?: any) => {
      if (isGuest || !user?.id) return;
      try {
        await supabase.functions.invoke('sensei-rag', {
          body: {
            action: 'index',
            user_id: user.id,
            content: `Lỗi sai của người dùng: ${content}`,
            source_type: 'mistake',
            metadata: metadata || {}
          }
        });
      } catch (e) {
        console.warn('Failed to log mistake for RAG:', e);
      }
    },
    isGuest,
    guestMessageCount
  };
};
