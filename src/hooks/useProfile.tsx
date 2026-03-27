import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  last_activity_date: string | null;
  role: string | null;
  // Convenience aliases
  full_name: string | null;
  level: string | null;
  xp: number;
  streak: number;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  addXp: (amount: number) => Promise<void>;
  updateStreak: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

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
          console.log('Profile not found');
        } else {
          throw profileResult.error;
        }
      } else {
        const raw = profileResult.data as Record<string, any>;
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
    } catch (error) {
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
          'postgres_changes' as never,
          { 
            event: '*', 
            schema: 'public', 
            table: 'profiles', 
            filter: `user_id=eq.${user.id}` 
          },
          (payload: { new: any }) => {
            if (payload.new) {
              const raw = payload.new;
              setProfile(prev => ({
                ...prev,
                ...raw,
                full_name: raw.display_name,
                level: raw.jlpt_level,
                xp: raw.total_xp || 0,
                streak: raw.current_streak || 0,
              } as Profile));
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

  const addXp = useCallback(async (amount: number) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('earn_xp', { 
        p_amount: amount, 
        p_source: 'Activity' 
      });
      if (error) throw error;
      
      toast({
        title: `+${amount} XP!`,
        description: `Bạn đã nhận thêm ${amount} kinh nghiệm.`,
      });
    } catch (error: any) {
      console.error('Error adding XP:', error);
    }
  }, [user, toast]);

  const updateStreak = useCallback(async () => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('record_activity');
      if (error) throw error;
    } catch (e) {
      console.error('Streak update error:', e);
    }
  }, [user]);

  return (
    <ProfileContext.Provider value={{ profile, loading, addXp, updateStreak, refreshProfile: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
