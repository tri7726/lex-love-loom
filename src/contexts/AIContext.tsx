import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIContextType {
  isAnalyzing: boolean;
  isChatting: boolean;
  analyzeText: (content: string, mode?: string, customPrompt?: string) => Promise<any>;
  chat: (messages: { role: string; content: string }[], systemPrompt: string, user_id?: string) => Promise<any>;
  streamChat: (messages: { role: string; content: string }[], systemPrompt: string, user_id?: string, onChunk?: (chunk: string) => void) => Promise<void>;
  checkGrammar: (text: string) => Promise<any>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);

  /**
   * Complex text analysis (Grammar, Vocab, Nuance)
   */
  const analyzeText = useCallback(async (content: string, mode: string = 'translation', customPrompt?: string) => {
    if (!content.trim()) return null;
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: { 
          content,
          prompt: customPrompt,
          mode,
          engine: 'gemini'
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    } catch (err) {
      console.error('AI Analysis error:', err);
      toast.error('Không thể phân tích nội dung. Vui lòng thử lại.');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * General purpose chat (Roleplay, Tutor)
   */
  const chat = useCallback(async (messages: { role: string; content: string }[], systemPrompt: string, user_id?: string) => {
    setIsChatting(true);
    try {
      const { data, error } = await supabase.functions.invoke('japanese-chat', {
        body: {
          messages,
          systemPrompt,
          user_id,
          engine: 'gemini'
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('AI Chat error:', err);
      toast.error('Lỗi kết nối với Sensei.');
      return null;
    } finally {
      setIsChatting(false);
    }
  }, []);

  /**
   * Streaming chat for real-time response
   */
  const streamChat = useCallback(async (
    messages: { role: string; content: string }[], 
    systemPrompt: string, 
    user_id?: string,
    onChunk?: (chunk: string) => void
  ) => {
    setIsChatting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/japanese-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          messages,
          systemPrompt,
          user_id,
          engine: 'gemini'
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices?.[0]?.delta?.content || "";
              if (content) {
                fullContent += content;
                if (onChunk) onChunk(content);
              }
            } catch (e) {
              // Not a JSON chunk or incomplete
              console.warn("Error parsing chunk:", e);
            }
          }
        }
      }
    } catch (err) {
      console.error('AI Stream Chat error:', err);
      toast.error('Lỗi kết nối streaming với Sensei.');
    } finally {
      setIsChatting(false);
    }
  }, []);

  /**
   * Specialized grammar check
   */
  const checkGrammar = useCallback(async (text: string) => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: { 
          content: text,
          mode: 'grammar',
          engine: 'gemini'
        },
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('AI Grammar check error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return (
    <AIContext.Provider value={{
      isAnalyzing,
      isChatting,
      analyzeText,
      chat,
      streamChat,
      checkGrammar
    }}>
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};
