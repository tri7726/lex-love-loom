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
import { MATERIAL_MAP, PET_RECIPES, SPECIAL_EFFECT_LABELS, type PetRecipe, type RecipeIngredient } from '@/data/pet-recipes';
import { Hammer, Loader2, Sparkles, Zap, Heart, Coins } from 'lucide-react';

interface PetCraftingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userCoins: number;
  getMaterialQuantity: (matId: string) => number;
  onCraft: (recipeId: string) => Promise<boolean>;
}

export const PetCrafting = ({ open, onOpenChange, userCoins, getMaterialQuantity, onCraft }: PetCraftingProps) => {
  const [crafting, setCrafting] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canAfford = (recipe: PetRecipe) => userCoins >= recipe.craftCoinCost;
  const hasIngredients = (recipe: PetRecipe) =>
    recipe.ingredients.every((ing) => getMaterialQuantity(ing.itemId) >= ing.quantity);

  const handleCraft = async (recipe: PetRecipe) => {
    setCrafting(recipe.id);
    const ok = await onCraft(recipe.id);
    setCrafting(null);
    if (ok) {
      setSuccess(recipe.id);
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-indigo-500" /> Xưởng Rèn Thần Kỳ
          </DialogTitle>
          <DialogDescription>
            Rèn trang bị từ nguyên liệu thám hiểm! Bạn có <strong>{userCoins}</strong> Coins.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {PET_RECIPES.map((recipe) => {
            const enoughXp = canAfford(recipe);
            const enoughIngredients = hasIngredients(recipe);
            const isCrafting = crafting === recipe.id;
            const isSuccess = success === recipe.id;

            return (
              <motion.div
                key={recipe.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'p-4 rounded-xl border transition-all',
                  isSuccess
                    ? 'bg-green-50 border-green-300 shadow-md'
                    : 'bg-card hover:shadow-sm',
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl shrink-0">{recipe.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{recipe.name}</p>
                      {recipe.specialEffect && (
                        <Badge className="bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full border-0">
                          {SPECIAL_EFFECT_LABELS[recipe.specialEffect].label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{recipe.description}</p>

                    {/* Ingredients */}
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Nguyên liệu rèn:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {recipe.ingredients.map((ing: RecipeIngredient) => {
                          const owned = getMaterialQuantity(ing.itemId);
                          const mat = MATERIAL_MAP[ing.itemId];
                          const enough = owned >= ing.quantity;
                          return (
                            <Badge
                              key={ing.itemId}
                              variant="outline"
                              className={cn(
                                'text-[9px] font-bold rounded-full px-2 py-0',
                                enough ? 'border-green-200 text-green-700' : 'border-red-200 text-red-500',
                              )}
                            >
                              {mat?.emoji || '?'} {mat?.name || ing.itemId} x{ing.quantity}
                              <span className={cn('ml-1', enough ? 'text-green-500' : 'text-red-400')}>
                                ({owned})
                              </span>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {/* Effect description */}
                    {recipe.specialEffect && (
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Sparkles className="h-3 w-3 text-amber-400" />
                        {SPECIAL_EFFECT_LABELS[recipe.specialEffect].desc}
                      </div>
                    )}
                  </div>

                  {/* Craft button */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="text-right flex items-center gap-1">
                      <span className="text-xs font-bold">{recipe.craftCoinCost}</span>
                      <Coins className="h-3 w-3 text-amber-500" />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCraft(recipe)}
                      disabled={isCrafting || !enoughXp || !enoughIngredients}
                      className={cn(
                        'h-8 text-xs rounded-lg px-3',
                        isSuccess ? 'bg-green-500 hover:bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700',
                      )}
                    >
                      {isCrafting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isSuccess ? (
                        <Sparkles className="h-3 w-3" />
                      ) : (
                        'Rèn'
                      )}
                    </Button>
                    {isSuccess && (
                      <span className="text-[9px] text-green-600 font-bold animate-pulse">Thành công!</span>
                    )}
                  </div>
                </div>

                {/* Success sparkle animation */}
                {isSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0 pointer-events-none flex items-center justify-center"
                  >
                    <Sparkles className="h-12 w-12 text-yellow-400" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
