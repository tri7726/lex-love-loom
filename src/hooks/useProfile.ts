import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  jlpt_level: string | null;
  created_at: string;
  updated_at: string;
  // Computed aliases for convenience
  username: string | null;
  xp: number;
  streak: number;
  level: string;
  last_active_at: string | null;
}

function mapDbToProfile(data: any): Profile {
  return {
    ...data,
    username: data.display_name,
    xp: data.total_xp || 0,
    streak: data.current_streak || 0,
    level: data.jlpt_level || 'N5',
    last_active_at: data.updated_at,
  };
}

export const useProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Profile not found, might be still creating...');
        } else {
          throw error;
        }
      } else {
        setProfile(mapDbToProfile(data));
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      
      const channel = supabase
        .channel(`profile:${user.id}`)
        .on(
          'postgres_changes' as any,
          { 
            event: '*', 
            schema: 'public', 
            table: 'profiles', 
            filter: `user_id=eq.${user.id}` 
          },
          (payload: any) => {
            if (payload.new) {
              setProfile(mapDbToProfile(payload.new));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user, fetchProfile]);

  const addXp = async (amount: number) => {
    if (!user || !profile) return;

    try {
      const newXp = (profile.total_xp || 0) + amount;
      const { error } = await supabase
        .from('profiles')
        .update({ total_xp: newXp })
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast({
        title: `+${amount} XP!`,
        description: `Bạn đã nhận thêm ${amount} kinh nghiệm.`,
      });
    } catch (error: any) {
      console.error('Error adding XP:', error);
      toast({
        title: 'Lỗi cập nhật XP',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateStreak = async () => {
    if (!user || !profile) return;

    const lastActive = profile.updated_at ? new Date(profile.updated_at) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      if (lastActive) {
        const lastDate = new Date(lastActive);
        lastDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          const newStreak = (profile.current_streak || 0) + 1;
          const { error } = await supabase
            .from('profiles')
            .update({ 
              current_streak: newStreak,
              longest_streak: Math.max(newStreak, profile.longest_streak || 0),
            })
            .eq('user_id', user.id);
          if (error) throw error;
        } else if (diffDays > 1) {
          const { error } = await supabase
            .from('profiles')
            .update({ current_streak: 1 })
            .eq('user_id', user.id);
          if (error) throw error;
        }
      } else {
        await supabase
          .from('profiles')
          .update({ current_streak: 1 })
          .eq('user_id', user.id);
      }
    } catch (error: any) {
      console.error('Error updating streak:', error);
    }
  };

  return {
    profile,
    loading,
    addXp,
    updateStreak,
    refreshProfile: fetchProfile,
  };
};
