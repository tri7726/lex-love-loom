import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface PetData {
  id: string;
  user_id: string;
  pet_type: string;
  pet_name: string | null;
  evolution_level: number;
  pet_xp: number;
  happiness: number;
  hunger: number;
  energy: number;
  status: 'active' | 'fainted' | 'away' | 'sleeping';
  last_fed_at: string | null;
  last_interaction_at: string | null;
  last_hunger_update_at: string;
  last_energy_update_at: string;
  last_hp_update_at: string;
  last_stamina_update_at: string;
  current_environment: string;
  hp: number;
  max_hp: number;
  stamina: number;
  max_stamina: number;
  armor: number;
  equipped_items: Record<string, string>;
  status_effect: string;
  active_buffs?: { type: string, expires_at: string }[];
  attribute_points: number;
  str: number;
  int: number;
  luk: number;
  created_at: string;
  updated_at: string;
}

export interface EvolutionStage {
  pet_type: string;
  evolution_level: number;
  xp_required: number;
  form_name: string;
  emoji: string;
  image_url?: string;
}

export interface PetState {
  pet: PetData | null;
  loading: boolean;
  error: string | null;
  evolutionStages: EvolutionStage[];
}

export const usePet = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PetState>({
    pet: null,
    loading: true,
    error: null,
    evolutionStages: [],
  });

  // ── Realtime Stats Calculation ──
  const calculateRealtimeStats = (rawPet: PetData): PetData => {
    const now = new Date();
    
    // Configurable rates (per hour)
    const HUNGER_DECAY_RATE = 5;
    const ENERGY_DECAY_RATE = 3;
    const HP_RECOVERY_RATE = 5;
    const STAMINA_RECOVERY_RATE = 10;

    const hoursSinceHunger = (now.getTime() - new Date(rawPet.last_hunger_update_at).getTime()) / (1000 * 60 * 60);
    const hoursSinceEnergy = (now.getTime() - new Date(rawPet.last_energy_update_at).getTime()) / (1000 * 60 * 60);
    const hoursSinceHp = (now.getTime() - new Date(rawPet.last_hp_update_at).getTime()) / (1000 * 60 * 60);
    const hoursSinceStamina = (now.getTime() - new Date(rawPet.last_stamina_update_at).getTime()) / (1000 * 60 * 60);

    const calculatedHunger = Math.max(0, rawPet.hunger - (hoursSinceHunger * HUNGER_DECAY_RATE));
    const calculatedEnergy = Math.max(0, rawPet.energy - (hoursSinceEnergy * ENERGY_DECAY_RATE));
    
    let calculatedHp = rawPet.hp;
    let status = rawPet.status;

    if (calculatedHunger > 50 && rawPet.hp < rawPet.max_hp && rawPet.hp > 0) {
      calculatedHp = Math.min(rawPet.max_hp, rawPet.hp + (hoursSinceHp * HP_RECOVERY_RATE));
    } else if (calculatedHunger === 0) {
      // Starvation damage — use hoursSinceHunger (time since last fed),
      // not hoursSinceHp, so damage accumulates from when food ran out
      calculatedHp = Math.max(0, rawPet.hp - (hoursSinceHunger * HP_RECOVERY_RATE * 2));
    }

    if (calculatedHp <= 0) {
      calculatedHp = 0;
      status = 'fainted';
    }

    let calculatedStamina = rawPet.stamina;
    if (calculatedEnergy > 50 && rawPet.stamina < rawPet.max_stamina) {
      calculatedStamina = Math.min(rawPet.max_stamina, rawPet.stamina + (hoursSinceStamina * STAMINA_RECOVERY_RATE));
    }

    const activeBuffs = (rawPet.active_buffs || []).filter(b => new Date(b.expires_at) > now);

    return {
      ...rawPet,
      hunger: Math.round(calculatedHunger),
      energy: Math.round(calculatedEnergy),
      hp: Math.round(calculatedHp),
      stamina: Math.round(calculatedStamina),
      status: status as any,
      active_buffs: activeBuffs
    };
  };

  const fetchPet = useCallback(async () => {
    if (!user) {
      setState(s => ({ ...s, pet: null, loading: false }));
      return;
    }

    try {
      const { data, error } = await (supabase as any).rpc('get_pet');
      if (error) throw error;
      const rawPet = data as PetData | null;
      setState(s => ({ ...s, pet: rawPet ? calculateRealtimeStats(rawPet) : null, error: null }));
    } catch (err: any) {
      console.error('get_pet error:', err);
      setState(s => ({ ...s, error: err.message || 'Failed to load pet' }));
    } finally {
      setState(s => ({ ...s, loading: false }));
    }
  }, [user]);

  const fetchEvolutionConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pet_evolution_config')
        .select('pet_type, evolution_level, xp_required, form_name, emoji')
        .order('evolution_level');
      if (error) throw error;
      setState(s => ({ ...s, evolutionStages: (data as EvolutionStage[]) || [] }));
    } catch (err: any) {
      console.error('fetchEvolutionConfig error:', err);
    }
  }, []);

  useEffect(() => {
    fetchPet();
    fetchEvolutionConfig();

    // Re-calculate stats every minute while the page is open
    const interval = setInterval(() => {
      setState(s => {
        if (!s.pet) return s;
        return { ...s, pet: calculateRealtimeStats(s.pet) };
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchPet, fetchEvolutionConfig]);

  // Realtime subscription to user_pets changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user_pets:${user.id}`)
      .on(
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'public',
          table: 'user_pets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: any }) => {
          if (payload.new) {
            const rawPet = payload.new as PetData;
            setState(s => ({ ...s, pet: calculateRealtimeStats(rawPet) }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createPet = useCallback(async (petType: string = 'kitune'): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await (supabase as any).rpc('create_pet', { p_pet_type: petType });
      if (error) throw error;
      const rawPet = data as PetData | null;
      setState(s => ({ ...s, pet: rawPet ? calculateRealtimeStats(rawPet) : null, error: null }));
      toast.success('🎉 Thú cưng đã ra đời! Hãy chăm sóc bạn ấy nhé!');
      return true;
    } catch (err: any) {
      console.error('create_pet error:', err);
      toast.error('Không thể tạo thú cưng. Thử lại sau!');
      return false;
    }
  }, [user]);

  const feedPet = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await (supabase as any).rpc('feed_pet');
      if (error) {
        if (error.message?.includes('Not enough XP')) {
          toast.error('Không đủ XP! Cần 50 XP để cho thú cưng ăn.');
          return false;
        }
        throw error;
      }
      const rawPet = data as PetData | null;
      setState(s => ({ ...s, pet: rawPet ? calculateRealtimeStats(rawPet) : s.pet }));
      return true;
    } catch (err: any) {
      console.error('feed_pet error:', err);
      toast.error('Không thể cho thú cưng ăn.');
      return false;
    }
  }, [user]);

  const petInteract = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await (supabase as any).rpc('pet_interact');
      if (error) throw error;
      const rawPet = data as PetData | null;
      setState(s => ({ ...s, pet: rawPet ? calculateRealtimeStats(rawPet) : s.pet }));
      return true;
    } catch (err: any) {
      console.error('pet_interact error:', err);
      return false;
    }
  }, [user]);

  const renamePet = useCallback(async (name: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await (supabase as any).rpc('rename_pet', { p_name: name });
      if (error) throw error;
      setState(s => {
  const raw = data as PetData | null;
  return { ...s, pet: raw ? calculateRealtimeStats(raw) : s.pet };
});
      toast.success(`Đã đổi tên thành ${name}!`);
      return true;
    } catch (err: any) {
      console.error('rename_pet error:', err);
      toast.error('Không thể đổi tên thú cưng.');
      return false;
    }
  }, [user]);

  const playWithPet = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await (supabase as any).rpc('play_with_pet');
      if (error) throw error;
      setState(s => {
  const raw = data as PetData | null;
  return { ...s, pet: raw ? calculateRealtimeStats(raw) : s.pet };
});
      return true;
    } catch (err: any) {
      console.error('play_with_pet error:', err);
      if (err.message?.includes('Not enough XP')) {
        toast.error('Không đủ XP! Cần 30 XP để chơi với thú cưng.');
      } else {
        toast.error('Không thể chơi cùng thú cưng.');
      }
      return false;
    }
  }, [user]);

  const bathePet = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await (supabase as any).rpc('bathe_pet');
      if (error) throw error;
      setState(s => {
  const raw = data as PetData | null;
  return { ...s, pet: raw ? calculateRealtimeStats(raw) : s.pet };
});
      return true;
    } catch (err: any) {
      console.error('bathe_pet error:', err);
      if (err.message?.includes('Not enough XP')) {
        toast.error('Không đủ XP! Cần 40 XP để tắm cho thú cưng.');
      } else {
        toast.error('Không thể tắm cho thú cưng.');
      }
      return false;
    }
  }, [user]);

  const walkPet = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await (supabase as any).rpc('walk_pet');
      if (error) throw error;
      setState(s => {
  const raw = data as PetData | null;
  return { ...s, pet: raw ? calculateRealtimeStats(raw) : s.pet };
});
      return true;
    } catch (err: any) {
      console.error('walk_pet error:', err);
      if (err.message?.includes('Not enough XP')) {
        toast.error('Không đủ XP! Cần 20 XP để dẫn thú cưng đi dạo.');
      } else {
        toast.error('Không thể dẫn thú cưng đi dạo.');
      }
      return false;
    }
  }, [user]);

  const tickleGame = useCallback(async (score: number): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await (supabase as any).rpc('pet_tickle_game', { p_score: score });
      if (error) throw error;
      setState(s => {
  const raw = data as PetData | null;
  return { ...s, pet: raw ? calculateRealtimeStats(raw) : s.pet };
});
      return true;
    } catch (err: any) {
      console.error('pet_tickle_game error:', err);
      return false;
    }
  }, [user]);

  const petSleep = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await (supabase as any).rpc('pet_sleep');
      if (error) throw error;
      setState(s => {
  const raw = data as PetData | null;
  return { ...s, pet: raw ? calculateRealtimeStats(raw) : s.pet };
});
      toast.success('😴 Thú cưng đang ngủ... +30 Năng lượng');
      return true;
    } catch (err: any) {
      console.error('pet_sleep error:', err);
      toast.error('Không thể cho thú cưng ngủ.');
      return false;
    }
  }, [user]);

  // Helper: calculate total XP needed to reach a specific level
  const getTotalXpForLevel = (level: number): number => {
    if (level <= 0) return 0;
    if (level === 1) return 0;
    let total = 0;
    let req = 500;
    for (let i = 1; i < level; i++) {
      total += req;
      req = total + Math.floor(req * 1.5);
    }
    return total;
  };

  const getNextLevelReq = (level: number): number => {
    let total = 0;
    let req = 500;
    for (let i = 0; i < level; i++) {
      total += req;
      req = total + Math.floor(req * 1.5);
    }
    return req;
  };

  const getNextEvolutionStage = useCallback((): EvolutionStage | null => {
    const { pet, evolutionStages } = state;
    if (!pet || evolutionStages.length === 0) return null;
    return evolutionStages.find(s => s.evolution_level > pet.evolution_level) || null;
  }, [state]);

  const getCurrentEvolutionStage = useCallback((): EvolutionStage | null => {
    const { pet, evolutionStages } = state;
    if (!pet || evolutionStages.length === 0) return null;
    // Find the stage for the current level
    const stage = evolutionStages.find(s => s.evolution_level === pet.evolution_level);
    if (stage) return stage;
    // If level is higher than any defined stage, return the highest stage
    return [...evolutionStages].sort((a, b) => b.evolution_level - a.evolution_level)[0];
  }, [state]);

  const getXpProgress = useCallback((): { current: number; required: number; percentage: number } => {
    const { pet, evolutionStages } = state;
    if (!pet) return { current: 0, required: 0, percentage: 0 };

    // Calculate current level and next level boundaries
    let totalNeededForCurrent = 0;
    let currentReq = 500;
    let level = 0;

    while (pet.pet_xp >= (totalNeededForCurrent + currentReq)) {
      totalNeededForCurrent += currentReq;
      level += 1;
      currentReq = totalNeededForCurrent + Math.floor(currentReq * 1.5);
    }

    const progressInCurrentLevel = pet.pet_xp - totalNeededForCurrent;
    const requiredForNext = currentReq;
    const percentage = Math.min(100, Math.max(0, (progressInCurrentLevel / requiredForNext) * 100));

    return { 
      current: progressInCurrentLevel, 
      required: requiredForNext, 
      percentage 
    };
  }, [state]);

  const equipItem = useCallback(async (itemType: string, imageUrl: string | null): Promise<boolean> => {
    if (!user || !state.pet) return false;
    try {
      const newEquipped = { ...state.pet.equipped_items, [itemType]: imageUrl };
      if (!imageUrl) delete newEquipped[itemType];

      const { error } = await (supabase as any)
        .from('user_pets')
        .update({ equipped_items: newEquipped })
        .eq('user_id', user.id);

      if (error) throw error;
      // Realtime listener will update the state
      return true;
    } catch (err: any) {
      console.error('equipItem error:', err);
      toast.error('Không thể thay đồ.');
      return false;
    }
  }, [user, state.pet]);

  const spendAttributePoint = useCallback(async (attr: 'str' | 'int' | 'luk'): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await (supabase as any).rpc('spend_attribute_point', { p_attr: attr });
      if (error) throw error;
      setState(s => ({ ...s, pet: calculateRealtimeStats(data as PetData) }));
      return true;
    } catch (err: any) {
      console.error('spendAttributePoint error:', err);
      return false;
    }
  }, [user]);

  return {
    ...state,
    createPet,
    feedPet,
    petInteract,
    renamePet,
    playWithPet,
    bathePet,
    walkPet,
    petSleep,
    tickleGame,
    equipItem,
    refetch: fetchPet,
    getNextEvolutionStage,
    getCurrentEvolutionStage,
    getXpProgress,
    spendAttributePoint,
  };
};
