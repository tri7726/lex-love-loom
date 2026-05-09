import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FOOD_ITEMS, type FoodItem } from '@/data/pet-config';
import { ShoppingCart, Zap, Heart, Utensils, Loader2 } from 'lucide-react';

interface FoodShopProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userXp: number;
  getItemQuantity: (itemId: string) => number;
  onBuy: (itemId: string) => Promise<boolean>;
  onUse: (itemId: string) => Promise<boolean>;
}

const categoryLabel: Record<string, string> = {
  main: 'Món chính',
  snack: 'Đồ ăn nhẹ',
  drink: 'Đồ uống',
  special: 'Đặc biệt',
  consumable: 'Vật phẩm',
};

export const FoodShop = ({ open, onOpenChange, userXp, getItemQuantity, onBuy, onUse }: FoodShopProps) => {
  const [buying, setBuying] = useState<string | null>(null);
  const [using, setUsing] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = ['all', ...new Set(FOOD_ITEMS.map((f) => f.category))];
  const filteredItems = activeCategory === 'all' ? FOOD_ITEMS : FOOD_ITEMS.filter((f) => f.category === activeCategory);

  const handleBuy = async (item: FoodItem) => {
    setBuying(item.id);
    await onBuy(item.id);
    setBuying(null);
  };

  const handleUse = async (item: FoodItem) => {
    setUsing(item.id);
    await onUse(item.id);
    setUsing(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-sakura" /> Cửa hàng thức ăn
          </DialogTitle>
          <DialogDescription>
            Dùng XP để mua thức ăn cho thú cưng. Bạn có <strong>{userXp}</strong> XP.
          </DialogDescription>
        </DialogHeader>

        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 shrink-0">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className="rounded-full text-xs h-8 shrink-0"
            >
              {cat === 'all' ? 'Tất cả' : categoryLabel[cat] || cat}
            </Button>
          ))}
        </div>

        {/* Food grid */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {filteredItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Không có món nào.</p>
          )}
          {filteredItems.map((item) => {
            const qty = getItemQuantity(item.id);
            const canBuy = userXp >= item.costXp;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-sm transition-shadow"
              >
                {/* Icon */}
                <span className="text-3xl shrink-0">{item.emoji}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">{item.name}</p>
                    <Badge
                      variant="secondary"
                      className="text-[9px] font-bold rounded-full px-2"
                    >
                      {categoryLabel[item.category] || item.category}
                    </Badge>
                    {qty > 0 && (
                      <Badge className="text-[9px] rounded-full px-2 bg-sakura/10 text-sakura border-0">
                        x{qty}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Heart className="h-3 w-3 text-red-400" /> +{item.happinessBonus}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Zap className="h-3 w-3 text-amber-500" /> +{item.petXpBonus} XP
                    </span>
                    <span>🍽️ +{item.hungerRestore} đói</span>
                    {item.hpRestore && (
                      <span className="flex items-center gap-0.5 text-green-500">
                        ❤️ +{item.hpRestore} HP
                      </span>
                    )}
                    {item.staminaRestore && (
                      <span className="flex items-center gap-0.5 text-blue-500">
                        ⚡ +{item.staminaRestore} Stamina
                      </span>
                    )}
                    {item.isRevive && (
                      <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                        ✨ Hồi sinh
                      </span>
                    )}
                  </div>
                </div>

                {/* Cost & actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold">{item.costXp}</span>
                    <span className="text-[10px] text-muted-foreground ml-0.5">XP</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBuy(item)}
                      disabled={buying === item.id || !canBuy}
                      className="h-8 text-xs rounded-lg px-3"
                    >
                      {buying === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Mua'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUse(item)}
                      disabled={using === item.id || qty <= 0}
                      className="h-8 text-xs rounded-lg px-3"
                    >
                      {using === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Dùng'
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
