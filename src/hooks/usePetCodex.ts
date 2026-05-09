/**
 * usePetCodex — fetches all data needed for the Pet Codex:
 *  - unlock status for each pet type (based on profile/flashcards/skills)
 *  - evolution stages per pet type (from pet_evolution_config)
 *  - pet history (from pet_history table)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { PET_TYPE_LIST, PetTypeConfig } from '@/data/pet-config';
import { getLevelInfo } from '@/lib/leveling';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UnlockCondition {
  label: string;
  met: boolean;
}

export interface CodexPetEntry {
  config: PetTypeConfig;
  unlocked: boolean;
  isCurrentPet: boolean;
  conditions: UnlockCondition[];
  evolutionStages: CodexEvoStage[];
}

export interface CodexEvoStage {
  pet_type: string;       // needed to filter stages per pet type
  evolution_level: number;
  xp_required: number;
  form_name: string;
  emoji: string;
}

export interface PetHistoryEntry {
  id: string;
  pet_type: string;
  pet_name: string | null;
  evolution_level: number;
  max_pet_xp: number;
  started_at: string;
  ended_at: string;
}

// ── Unlock condition definitions ──────────────────────────────────────────────

interface UnlockRule {
  label: (vals: UnlockVals) => string;
  met: (vals: UnlockVals) => boolean;
}

interface UnlockVals {
  streak: number;
  flashcardCount: number;
  evolvedSkillCount: number;
  userLevel: number;
  mockTestCount: number;
}

const UNLOCK_RULES: Record<string, UnlockRule[]> = {
  kitune: [
    { label: () => 'Mặc định — mọi người đều có', met: () => true },
  ],
  usagi: [
    {
      label: (v) => `Streak ≥ 7 ngày (hiện tại: ${v.streak} ngày)`,
      met: (v) => v.streak >= 7,
    },
  ],
  maneki_neko: [
    {
      label: (v) => `Học ≥ 50 từ vựng (hiện tại: ${v.flashcardCount})`,
      met: (v) => v.flashcardCount >= 50,
    },
  ],
  kappa: [
    {
      label: (v) => `Hoàn thành ≥ 10 Evolved Skills (hiện tại: ${v.evolvedSkillCount})`,
      met: (v) => v.evolvedSkillCount >= 10,
    },
  ],
  karasu: [
    {
      label: (v) => `Đạt Level 20 (hiện tại: Level ${v.userLevel})`,
      met: (v) => v.userLevel >= 20,
    },
  ],
  ryu: [
    {
      label: (v) => `Hoàn thành ≥ 1 JLPT Mock Test (đã làm: ${v.mockTestCount})`,
      met: (v) => v.mockTestCount >= 1,
    },
  ],
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePetCodex(currentPetType?: string | null) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const [pets, setPets] = useState<CodexPetEntry[]>([]);
  const [history, setHistory] = useState<PetHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCodexData = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true);

    try {
      // ── Parallel data fetches ────────────────────────────────────────────
      const [
        flashcardRes,
        skillRes,
        mockTestRes,
        evolutionRes,
        historyRes,
      ] = await Promise.all([
        // Count flashcards (vocabulary saved by user)
        (supabase as any)
          .from('flashcards')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),

        // Count mastered evolved skills
        (supabase as any)
          .from('user_evolved_skills')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),

        // Count completed mock tests (table: mock_exam_results, one row per completed exam)
        (supabase as any)
          .from('mock_exam_results')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),

        // Evolution stages for all pets
        supabase
          .from('pet_evolution_config')
          .select('pet_type, evolution_level, xp_required, form_name, emoji')
          .order('evolution_level'),

        // Pet history
        (supabase as any)
          .from('pet_history')
          .select('*')
          .eq('user_id', user.id)
          .order('ended_at', { ascending: false }),
      ]);

      // ── Derived values ───────────────────────────────────────────────────
      const vals: UnlockVals = {
        streak:            profile.current_streak ?? 0,
        flashcardCount:    flashcardRes.count ?? 0,
        evolvedSkillCount: skillRes.count ?? 0,
        userLevel:         getLevelInfo(profile.total_xp ?? 0).level,
        mockTestCount:     mockTestRes.count ?? 0,
      };

      const allStages: CodexEvoStage[] = (evolutionRes.data as any[]) ?? [];

      // ── Build pet entries ────────────────────────────────────────────────
      const entries: CodexPetEntry[] = PET_TYPE_LIST.map((config) => {
        const rules = UNLOCK_RULES[config.id] ?? [];
        const conditions = rules.map((r) => ({
          label: r.label(vals),
          met: r.met(vals),
        }));
        const unlocked = conditions.every((c) => c.met);
        const stages = allStages
          .filter((s) => s.pet_type === config.id)
          .sort((a, b) => a.evolution_level - b.evolution_level);

        return {
          config,
          unlocked,
          isCurrentPet: config.id === currentPetType,
          conditions,
          evolutionStages: stages,
        };
      });

      setPets(entries);
      setHistory((historyRes.data as PetHistoryEntry[]) ?? []);
    } catch (e) {
      console.error('usePetCodex error:', e);
    } finally {
      setLoading(false);
    }
  }, [user, profile, currentPetType]);

  useEffect(() => {
    fetchCodexData();
  }, [fetchCodexData]);

  /** Archive current pet to history before replacing */
  const archivePetToHistory = useCallback(
    async (pet: { pet_type: string; pet_name: string | null; evolution_level: number; pet_xp: number; created_at: string }) => {
      if (!user) return;
      try {
        await (supabase as any).from('pet_history').insert({
          user_id:         user.id,
          pet_type:        pet.pet_type,
          pet_name:        pet.pet_name,
          evolution_level: pet.evolution_level,
          max_pet_xp:      pet.pet_xp,
          started_at:      pet.created_at,
          ended_at:        new Date().toISOString(),
        });
      } catch (e) {
        console.error('archivePetToHistory error:', e);
      }
    },
    [user]
  );

  return { pets, history, loading, refetch: fetchCodexData, archivePetToHistory };
}
