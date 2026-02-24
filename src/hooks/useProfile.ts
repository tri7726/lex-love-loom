import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  xp: number;
  streak: number;
  level: string;
  last_active_at: string | null;
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
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found, wait for trigger or manually create
          console.log('Profile not found, might be still creating...');
        } else {
          throw error;
        }
      } else {
        setProfile(data as Profile);
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
            filter: `id=eq.${user.id}` 
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
      const newXp = profile.xp + amount;
      const { error } = await supabase
        .from('profiles')
        .update({ xp: newXp })
        .eq('id', user.id);

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

    const lastActive = profile.last_active_at ? new Date(profile.last_active_at) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (lastActive) {
      const lastDate = new Date(lastActive);
      lastDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Daily streak continued
        const { error } = await supabase
          .from('profiles')
          .update({ 
            streak: profile.streak + 1,
            last_active_at: new Date().toISOString()
          })
          .eq('id', user.id);
        if (error) throw error;
      } else if (diffDays > 1) {
        // Streak broken
        const { error } = await supabase
          .from('profiles')
          .update({ 
            streak: 1,
            last_active_at: new Date().toISOString()
          })
          .eq('id', user.id);
        if (error) throw error;
      } else if (diffDays === 0) {
        // Already updated today, just update last_active_at if needed
        await supabase
          .from('profiles')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', user.id);
      }
    } else {
      // First time active
      await supabase
        .from('profiles')
        .update({ 
          streak: 1,
          last_active_at: new Date().toISOString()
        })
        .eq('id', user.id);
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
