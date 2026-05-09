import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface AdventureArea {
  id: string;
  name: string;
  description: string;
  min_level: number;
  stamina_cost: number;
  duration_minutes: number;
  base_xp_reward: number;
  base_coin_reward: number;
  biome: string;
}

export interface Expedition {
  id: string;
  area_id: string;
  status: 'active' | 'completed' | 'claimed';
  start_at: string;
  end_at: string;
  rewards: any;
}

export const usePetAdventure = () => {
  const { user } = useAuth();
  const [areas, setAreas] = useState<AdventureArea[]>([]);
  const [activeExpedition, setActiveExpedition] = useState<Expedition | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAreas = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('pet_adventure_areas')
      .select('*')
      .order('level_req', { ascending: true });

    if (error) console.error('Error fetching areas:', error);
    else setAreas((data as AdventureArea[]) || []);
  }, []);

  const fetchActiveExpedition = useCallback(async () => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from('pet_expeditions')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'claimed')
      .single();

    if (error && error.code !== 'PGRST116') console.error('Error fetching expedition:', error);
    else setActiveExpedition((data as Expedition) || null);
  }, [user]);

  const startExpedition = async (petId: string, areaId: string, staminaCost: number) => {
    if (!user) return;
    setLoading(true);

    try {
      const area = areas.find(a => a.id === areaId);
      if (!area) throw new Error('Area not found');

      const endAt = new Date(Date.now() + area.duration_minutes * 60000).toISOString();

      // 1. Check stamina before doing anything
      const { data: pet } = await (supabase as any)
        .from('user_pets')
        .select('stamina')
        .eq('id', petId)
        .single();
      if (!pet || pet.stamina < staminaCost) throw new Error('Không đủ thể lực!');

      // 2. Create expedition FIRST — no stamina cost if this fails
      const { data: expedition, error: expError } = await (supabase as any)
        .from('pet_expeditions')
        .insert({
          user_id: user.id,
          pet_id: petId,
          area_id: areaId,
          end_at: endAt,
          status: 'active'
        })
        .select()
        .single();

      if (expError) throw expError;

      // 3. Expedition created — now deduct stamina (with guard for concurrency)
      const { error: staminaError } = await (supabase as any)
        .from('user_pets')
        .update({
          stamina: pet.stamina - staminaCost,
          last_stamina_update_at: new Date().toISOString()
        })
        .eq('id', petId)
        .gte('stamina', staminaCost);

      if (staminaError) {
        // Expeditions without stamina deduction can be recovered by a cleanup job
        console.warn('Expedition created but stamina deduction failed:', staminaError);
      }

      setActiveExpedition(expedition);
      toast.success(`Đã bắt đầu viễn chinh tại ${area.name}!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const claimRewards = async () => {
    if (!user || !activeExpedition) return;
    
    const now = new Date();
    const endAt = new Date(activeExpedition.end_at);
    
    if (now < endAt) {
      toast.error('Chưa hoàn thành thám hiểm!');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('claim_expedition_rewards', { p_expedition_id: activeExpedition.id });
      if (error) throw error;
      
      const res = data as any;
      setActiveExpedition(null);
      
      let msg = `Bạn nhận được ${res.xp} Pet XP và ${res.coins} Coins!`;
      if (res.loot_id) {
        msg += ` Tìm thấy vật phẩm: ${res.loot_id}!`;
      }
      toast.success(msg);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
    fetchActiveExpedition();
  }, [fetchAreas, fetchActiveExpedition]);

  return {
    areas,
    activeExpedition,
    loading,
    startExpedition,
    claimRewards,
    refresh: fetchActiveExpedition
  };
};
