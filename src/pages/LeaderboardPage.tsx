import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Leaderboard } from '@/components/Leaderboard';
import { useAuth } from '@/hooks/useAuth';
import { SakuraPageLayout } from '@/components/layout/SakuraPageLayout';

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, total_xp, current_streak')
        .order('total_xp', { ascending: false })
        .limit(50);

      if (data) {
        setEntries(data.map((p, i) => ({
          rank: i + 1,
          userId: p.user_id,
          username: p.display_name || 'Ẩn danh',
          avatar: p.avatar_url || undefined,
          xp: p.total_xp || 0,
          streak: p.current_streak || 0,
          isCurrentUser: p.user_id === user?.id,
        })));
      }
      setLoading(false);
    };
    fetchLeaderboard();
  }, [user]);

  return (
    <SakuraPageLayout title="Bảng xếp hạng" subtitle="Top người học chăm chỉ nhất">
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-sakura border-t-transparent rounded-full" />
        </div>
      ) : (
        <Leaderboard entries={entries} title="Bảng xếp hạng XP" />
      )}
    </SakuraPageLayout>
  );
};

export default LeaderboardPage;
