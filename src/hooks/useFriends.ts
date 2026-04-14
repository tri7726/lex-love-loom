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

const PAGE_SIZE = 20;

export const useFriends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetchFriends = useCallback(async (reset = true) => {
    if (!user) return;
    
    if (reset) {
      setLoading(true);
      setPage(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentPage = reset ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // An toàn khi ép kiểu những fields mà mình chủ ý pick ở query
      const formattedFriends = (data || []).map((f: any) => f.profiles as FriendProfile).filter(Boolean);
      
      if (reset) {
        setFriends(formattedFriends);
      } else {
        setFriends(prev => {
          // Prevent duplicates
          const existingIds = new Set(prev.map(p => p.user_id));
          const newUnique = formattedFriends.filter(f => !existingIds.has(f.user_id));
          return [...prev, ...newUnique];
        });
      }

      setHasMore(formattedFriends.length === PAGE_SIZE);
      if (!reset && formattedFriends.length > 0) {
        setPage(p => p + 1);
      } else if (reset) {
        setPage(1); // Set the next page to fetch
      }
    } catch (err: any) {
      console.error('Error fetching friends:', err);
    } finally {
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  }, [user, page]);

  useEffect(() => {
    fetchFriends();
  }, [user]); // We rely strictly on 'user' change for initial load

  // Realtime Subscriptions
  useEffect(() => {
    if (!user) return;

    // Lắng nghe thay đổi XP / Profile từ những người trong danh sách bạn bè
    const profileChannel = supabase.channel(`public:profiles:friends_${user.id}`)
      .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles' 
        }, 
        (payload: any) => {
          setFriends(prev => prev.map(f => {
            if (f.user_id === payload.new.user_id) {
              return { ...f, ...payload.new };
            }
            return f;
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  const followUser = async (friendId: string, profileMeta?: Partial<FriendProfile>) => {
    if (!user) return;

    // Optimistic UI update
    const tempFriend: FriendProfile = {
      user_id: friendId,
      display_name: profileMeta?.display_name || 'Đang tải...',
      avatar_url: profileMeta?.avatar_url || null,
      jlpt_level: profileMeta?.jlpt_level || null,
      total_xp: profileMeta?.total_xp || 0,
      ...profileMeta
    };

    setFriends(prev => [tempFriend, ...prev]);

    try {
      const { error } = await supabase
        .from('friendships')
        .insert({ user_id: user.id, friend_id: friendId });

      if (error) {
        if (error.code === '23505') { // Unique violation, đã follow rồi
            return;
        }
        throw error;
      }
      toast({ title: 'Đã theo dõi người dùng' });
    } catch (err: any) {
      // Revert Optimistic UI
      setFriends(prev => prev.filter(f => f.user_id !== friendId));
      toast({
        title: 'Lỗi khi theo dõi',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const unfollowUser = async (friendId: string) => {
    if (!user) return;

    // Lưu mảng hiện tại để đề phòng phải rollback
    const prevFriends = [...friends];
    
    // Optimistic UI update
    setFriends(prev => prev.filter(f => f.user_id !== friendId));

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendId);

      if (error) throw error;
      toast({ title: 'Đã bỏ theo dõi' });
    } catch (err: any) {
      // Rollback
      setFriends(prevFriends);
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
    loadingMore,
    hasMore,
    followUser,
    unfollowUser,
    isFollowing,
    refreshFriends: () => fetchFriends(true),
    loadMore: () => fetchFriends(false),
  };
};
