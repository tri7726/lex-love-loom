import { Json } from "@/integrations/supabase/types";

export type SenseiMessageType = 'text' | 'analysis' | 'correction' | 'image';
export type SenseiMode = 'tutor' | 'roleplay' | 'analysis' | 'speaking';

export interface SenseiMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  type: SenseiMessageType;
  metadata?: Json & { source?: string };
  created_at: string;
}

export interface SenseiConversation {
  id: string;
  user_id: string;
  title: string;
  mode: SenseiMode;
  source?: string;
  is_pinned: boolean;
  updated_at: string;
  created_at: string;
}

export interface ChatHubState {
  conversations: SenseiConversation[];
  activeConversationId: string | null;
  messages: SenseiMessage[];
  isLoading: boolean;
}
