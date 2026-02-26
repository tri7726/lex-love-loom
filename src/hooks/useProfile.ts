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
  longest_streak: number | null;
  jlpt_level: string | null;
  created_at: string;
  updated_at: string;
  // Convenience aliases used across components
  full_name: string | null;
  level: string | null;
  xp: number;
  streak: number;
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
          // Profile not found, wait for trigger or manually create
          console.log('Profile not found, might be still creating...');
        } else {
          throw error;
        }
      } else {
        const raw = data as any;
        setProfile({
          ...raw,
          full_name: raw.display_name,
          level: raw.jlpt_level,
          xp: raw.total_xp || 0,
          streak: raw.current_streak || 0,
        } as Profile);
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
      
      // Subscribe to profile changes
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
              setProfile(payload.new as Profile);
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

    // Simple streak update - just increment current_streak
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          current_streak: (profile.current_streak || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      if (error) console.error('Error updating streak:', error);
    } catch (e) {
      console.error('Streak update error:', e);
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
