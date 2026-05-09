import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface InventoryItem {
  item_id: string;
  quantity: number;
}

export const usePetShop = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async () => {
    if (!user) {
      setInventory([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_inventory' as any);
      if (error) throw error;
      setInventory((data as InventoryItem[]) || []);
    } catch (err: any) {
      console.error('get_inventory error:', err);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const buyFoodItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        const { data, error } = await supabase.rpc('buy_food_item' as any, {
          p_item_id: itemId,
        });
        if (error) throw error;
        const result = data as InventoryItem;
        setInventory((prev) => {
          const existing = prev.find((i) => i.item_id === itemId);
          if (existing) {
            return prev.map((i) => (i.item_id === itemId ? result : i));
          }
          return [...prev, result];
        });
        toast.success('🛒 Mua thành công!');
        return true;
      } catch (err: any) {
        console.error('buy_food_item error:', err);
        if (err.message?.includes('Not enough XP')) {
          toast.error('Không đủ XP để mua!');
        } else {
          toast.error('Không thể mua đồ.');
        }
        return false;
      }
    },
    [user],
  );

  const useFoodItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        const { data, error } = await supabase.rpc('use_food_item' as any, {
          p_item_id: itemId,
        });
        if (error) throw error;
        // Update pet data will happen via realtime subscription in usePet
        setInventory((prev) =>
          prev
            .map((i) => (i.item_id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
            .filter((i) => i.quantity > 0),
        );
        toast.success('🍽️ Đã dùng đồ ăn!');
        return true;
      } catch (err: any) {
        console.error('use_food_item error:', err);
        toast.error('Không thể dùng đồ ăn.');
        return false;
      }
    },
    [user],
  );

  const craftItem = useCallback(
    async (recipeId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        const { data, error } = await supabase.rpc('craft_item' as any, {
          p_recipe_id: recipeId,
        });
        if (error) throw error;
        // Refresh inventory after crafting
        await fetchInventory();
        toast.success('🍳 Chế biến thành công! Thú cưng rất thích!');
        return true;
      } catch (err: any) {
        console.error('craft_item error:', err);
        if (err.message?.includes('Not enough XP')) {
          toast.error('Không đủ XP để nấu!');
        } else if (err.message?.includes('Missing ingredient')) {
          toast.error('Thiếu nguyên liệu!');
        } else {
          toast.error('Không thể nấu món này.');
        }
        return false;
      }
    },
    [user, fetchInventory],
  );

  const getQuantity = useCallback(
    (itemId: string): number => {
      return inventory.find((i) => i.item_id === itemId)?.quantity || 0;
    },
    [inventory],
  );

  return {
    inventory,
    loading,
    fetchInventory,
    buyFoodItem,
    useFoodItem,
    craftItem,
    getQuantity,
  };
};
