import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  current_streak: number;
  longest_streak: number | null;
  jlpt_level: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  last_activity_date: string | null;
  role: string | null;
  onboarded?: boolean;
  target_jlpt_level?: string | null;
  daily_goal_minutes?: number | null;
  learning_goal?: string | null;
  // Convenience aliases
  full_name: string | null;
  level: string | null;
  xp: number;
  streak: number;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
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
          .eq('user_id', user.id)
      ]);

      // --- Streak Protection Check ---
      const { data: protectionResult } = await (supabase as any).rpc('check_and_apply_streak_protection');
      if (protectionResult?.status === 'protected') {
        toast.success("🛡️ Streak Protection!", {
          description: protectionResult.message,
          duration: 5000,
        });
      } else if (protectionResult?.status === 'lost') {
         toast.error("💔 Streak Reset", {
           description: protectionResult.message,
           duration: 5000,
         });
      }

      if (profileResult.error) {
        if (profileResult.error.code === 'PGRST116') {
          console.log('Profile not found');
        } else {
          throw profileResult.error;
        }
      } else {
        const raw = profileResult.data as Record<string, any>;
        const roles = (rolesResult.data || []).map((r: { role: string }) => r.role);
        const topRole = roles.includes('admin') ? 'admin'
          : roles.includes('teacher') ? 'teacher'
          : roles.includes('moderator') ? 'moderator'
          : 'user';
        
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
        .channel(`profile_updates_${user.id}`)
        .on(
          'postgres_changes' as never,
          { 
            event: '*', 
            schema: 'public', 
            table: 'profiles', 
            filter: `user_id=eq.${user.id}` 
          },
          () => fetchProfile()
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

  return (
    <ProfileContext.Provider value={{ profile, loading, refreshProfile: fetchProfile }}>
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
