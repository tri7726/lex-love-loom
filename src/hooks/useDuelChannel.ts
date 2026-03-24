import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DuelState {
  myScore: number;
  opponentScore: number;
  opponentConnected: boolean;
  currentQuestion: number;
}

interface AnswerPayload {
  playerId: string;
  questionIndex: number;
  score: number;
}

export function useDuelChannel(challengeId: string, userId: string) {
  const [duelState, setDuelState] = useState<DuelState>({
    myScore: 0,
    opponentScore: 0,
    opponentConnected: false,
    currentQuestion: 0,
  });
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const broadcastAnswer = useCallback(
    (questionIndex: number, score: number) => {
      setDuelState((prev) => ({ ...prev, myScore: prev.myScore + score, currentQuestion: questionIndex + 1 }));
      channelRef.current?.send({
        type: 'broadcast',
        event: 'player_answer',
        payload: { playerId: userId, questionIndex, score } satisfies AnswerPayload,
      });
    },
    [userId]
  );

  useEffect(() => {
    if (!challengeId || !userId) return;

    const channel = supabase.channel(`duel:${challengeId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const others = Object.keys(state).filter((k) => k !== userId);
        setDuelState((prev) => ({ ...prev, opponentConnected: others.length > 0 }));
      })
      .on('broadcast', { event: 'player_answer' }, ({ payload }: { payload: AnswerPayload }) => {
        if (payload.playerId === userId) return;
        setDuelState((prev) => ({ ...prev, opponentScore: prev.opponentScore + payload.score }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await channel.track({ userId, joinedAt: Date.now() });
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          // Fallback polling every 3s
          pollRef.current = setInterval(async () => {
            const { data } = await (supabase as any)
              .from('challenges')
              .select('challenger_score, opponent_score')
              .eq('id', challengeId)
              .single();
            if (data) {
              setDuelState((prev) => ({
                ...prev,
                opponentScore: data.opponent_score ?? prev.opponentScore,
              }));
            }
          }, 3000);
        }
      });

    channelRef.current = channel;

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(channel);
    };
  }, [challengeId, userId]);

  return { duelState, broadcastAnswer, isConnected };
}
