import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIContextType {
  isAnalyzing: boolean;
  isChatting: boolean;
  analyzeText: (content: string, mode?: string, customPrompt?: string) => Promise<any>;
  chat: (messages: { role: string; content: string }[], systemPrompt: string) => Promise<any>;
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
  const chat = useCallback(async (messages: { role: string; content: string }[], systemPrompt: string) => {
    setIsChatting(true);
    try {
      const { data, error } = await supabase.functions.invoke('japanese-chat', {
        body: {
          messages,
          systemPrompt,
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
