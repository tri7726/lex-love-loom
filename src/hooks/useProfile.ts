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
  role: string | null;
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
      const [profileResult, rolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id),
      ]);

      if (profileResult.error) {
        if (profileResult.error.code === 'PGRST116') {
          console.log('Profile not found, might be still creating...');
        } else {
          throw profileResult.error;
        }
      } else {
        const raw = profileResult.data as Record<string, unknown>;
        const roles = (rolesResult.data || []).map((r: { role: string }) => r.role);
        const topRole = roles.includes('admin') ? 'admin' : roles.includes('moderator') ? 'moderator' : 'user';
        setProfile({
          ...raw,
          full_name: raw.display_name,
          level: raw.jlpt_level,
          xp: raw.total_xp || 0,
          streak: raw.current_streak || 0,
          role: topRole,
        } as Profile);
      }
    } catch (error: unknown) {
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
          'postgres_changes' as never,
          { 
            event: '*', 
            schema: 'public', 
            table: 'profiles', 
            filter: `user_id=eq.${user.id}` 
          },
          (payload: { new: Record<string, unknown> }) => {
            if (payload.new) {
              const raw = payload.new;
              setProfile({
                ...raw,
                full_name: raw.display_name,
                level: raw.jlpt_level,
                xp: raw.total_xp || 0,
                streak: raw.current_streak || 0,
                role: raw.role || 'user',
              } as Profile);
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
    } catch (error: unknown) {
      console.error('Error adding XP:', error);
      toast({
        title: 'Lỗi cập nhật XP',
        description: error instanceof Error ? error.message : 'Unknown error',
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
