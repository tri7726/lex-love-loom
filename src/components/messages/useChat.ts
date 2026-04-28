import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChatRealtime } from './useChatRealtime';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  jlpt_level: string | null;
  total_xp: number;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  partnerLevel: string | null;
  lastMessage: string;
  lastTime: string;
  unread: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return date.toLocaleDateString('vi-VN', { weekday: 'short' });
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat(user: { id: string } | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [sending, setSending] = useState(false);

  // ── Fetch conversations ──────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvs(true);

    try {
      const { data: msgs } = await (supabase.from('messages' as any) as any)
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      const partnerMap = new Map<string, { lastMsg: Message; unread: number }>();
      for (const msg of (msgs as Message[]) ?? []) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!partnerMap.has(partnerId)) {
          partnerMap.set(partnerId, {
            lastMsg: msg,
            unread: !msg.is_read && msg.receiver_id === user.id ? 1 : 0,
          });
        } else {
          const entry = partnerMap.get(partnerId)!;
          if (!msg.is_read && msg.receiver_id === user.id) entry.unread += 1;
        }
      }

      if (partnerMap.size === 0) {
        setConversations([]);
        setLoadingConvs(false);
        return;
      }

      const partnerIds = Array.from(partnerMap.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, jlpt_level, total_xp')
        .in('user_id', partnerIds);

      const profileMap = new Map<string, Profile>();
      for (const p of (profiles as Profile[]) ?? []) profileMap.set(p.user_id, p);

      const convList: Conversation[] = partnerIds.map((pid) => {
        const { lastMsg, unread } = partnerMap.get(pid)!;
        const profile = profileMap.get(pid);
        return {
          partnerId: pid,
          partnerName: profile?.display_name ?? 'Người dùng',
          partnerAvatar: profile?.avatar_url ?? null,
          partnerLevel: profile?.jlpt_level ?? null,
          lastMessage: lastMsg.content,
          lastTime: formatTime(lastMsg.created_at),
          unread,
        };
      });

      setConversations(convList);
    } catch (err) {
      console.error('fetchConversations error:', err);
    } finally {
      setLoadingConvs(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ── Fetch messages for selected conversation ─────────────────────────────────
  const fetchMessages = useCallback(async (partnerId: string) => {
    if (!user) return;
    const { data } = await (supabase.from('messages' as any) as any)
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`,
      )
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
  }, [user]);

  // ── Mark as read ─────────────────────────────────────────────────────────────
  const markAsRead = useCallback(
    async (partnerId: string) => {
      if (!user) return;
      await (supabase.from('messages' as any) as any)
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', partnerId)
        .eq('is_read', false);
      setConversations((prev) =>
        prev.map((c) => (c.partnerId === partnerId ? { ...c, unread: 0 } : c)),
      );
    },
    [user],
  );

  // ── Real-time ────────────────────────────────────────────────────────────────
  const handleNewGlobalMessage = useCallback(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleNewMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.find((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const { subscribeToConversation } = useChatRealtime(
    user,
    selectedConv?.partnerId ?? null,
    handleNewGlobalMessage,
    handleNewMessage,
  );

  // ── Select conversation ──────────────────────────────────────────────────────
  const handleSelectConv = useCallback(
    async (conv: Conversation) => {
      setSelectedConv(conv);
      await fetchMessages(conv.partnerId);
      await markAsRead(conv.partnerId);
      subscribeToConversation(conv.partnerId);
    },
    [fetchMessages, markAsRead, subscribeToConversation],
  );

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = async (content: string) => {
    if (!user || !selectedConv || sending) return;
    setSending(true);
    const { error } = await (supabase.from('messages' as any) as any).insert({
      sender_id: user.id,
      receiver_id: selectedConv.partnerId,
      content,
      is_read: false,
    });
    if (error) console.error('Send message error:', error);
    setSending(false);
  };

  return {
    conversations,
    selectedConv,
    messages,
    search,
    loadingConvs,
    sending,
    setSelectedConv,
    setSearch,
    handleSelectConv,
    handleSend,
  };
}
