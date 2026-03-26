import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface FriendProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  jlpt_level: string | null;
  total_xp: number;
}

export const useFriends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('friendships')
        .select(`
          friend_id,
          profiles:friend_id (
            user_id,
            display_name,
            avatar_url,
            jlpt_level,
            total_xp
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const friendList = (data || []).map((f: any) => f.profiles as FriendProfile).filter(Boolean);
      setFriends(friendList);
    } catch (err: any) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const followUser = async (friendId: string) => {
    if (!user) return;
    try {
      const { error } = await (supabase as any)
        .from('friendships')
        .insert({ user_id: user.id, friend_id: friendId });

      if (error) throw error;
      toast({ title: 'Đã theo dõi người dùng' });
      fetchFriends();
    } catch (err: any) {
      toast({
        title: 'Lỗi khi theo dõi',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const unfollowUser = async (friendId: string) => {
    if (!user) return;
    try {
      const { error } = await (supabase as any)
        .from('friendships')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendId);

      if (error) throw error;
      toast({ title: 'Đã bỏ theo dõi' });
      fetchFriends();
    } catch (err: any) {
      toast({
        title: 'Lỗi khi bỏ theo dõi',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const isFollowing = (userId: string) => {
    return friends.some((f) => f.user_id === userId);
  };

  return {
    friends,
    loading,
    followUser,
    unfollowUser,
    isFollowing,
    refreshFriends: fetchFriends,
  };
};
