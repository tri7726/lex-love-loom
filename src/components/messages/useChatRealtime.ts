import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Manages real-time subscriptions for chat conversations.
 * - Global channel: refreshes conversation list on any new message
 * - Per-conversation channel: appends new messages to the active conversation
 */
export function useChatRealtime(
  user: { id: string } | null,
  selectedPartnerId: string | null,
  onNewGlobalMessage: () => void,
  onNewMessage: (msg: Message) => void,
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Global subscription (always active)
  useEffect(() => {
    if (!user) return;

    const globalChannel = supabase
      .channel('global_messages')
      .on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: { new: Message }) => {
          const msg = payload.new;
          if (msg.sender_id === user.id || msg.receiver_id === user.id) {
            onNewGlobalMessage();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [user, onNewGlobalMessage]);

  // Per-conversation subscription
  const subscribeToConversation = useCallback(
    (partnerId: string) => {
      if (!user) return;

      // Clean up previous channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`active_messages:${[user.id, partnerId].sort().join('-')}`)
        .on(
          'postgres_changes' as never,
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload: { new: Message }) => {
            const msg = payload.new;
            const isRelevant =
              (msg.sender_id === user.id && msg.receiver_id === partnerId) ||
              (msg.sender_id === partnerId && msg.receiver_id === user.id);
            if (!isRelevant) return;

            onNewMessage(msg);

            // Auto-mark as read if received
            if (msg.receiver_id === user.id) {
              (supabase.from('messages' as any) as any)
                .update({ is_read: true })
                .eq('id', msg.id);
            }
          },
        )
        .subscribe();

      channelRef.current = channel;
    },
    [user, onNewMessage],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return { subscribeToConversation };
}
