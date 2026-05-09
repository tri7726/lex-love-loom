export interface RecipeIngredient {
  itemId: string;
  quantity: number;
}

export type SpecialEffect = 'str_up' | 'int_up' | 'luk_up' | 'hp_up';

export interface PetRecipe {
  id: string;
  name: string;
  emoji: string;
  description: string;
  ingredients: RecipeIngredient[];
  resultItemId: string | null;
  specialEffect: SpecialEffect | null;
  craftCoinCost: number;
}

export const PET_RECIPES: PetRecipe[] = [
  {
    id: 'recipe_wooden_sword',
    name: 'Kiếm Gỗ',
    emoji: '🗡️',
    description: 'Vũ khí thô sơ: +2 STR',
    ingredients: [
      { itemId: 'wood_scrap', quantity: 5 },
    ],
    resultItemId: 'wooden_sword',
    specialEffect: 'str_up',
    craftCoinCost: 100,
  },
  {
    id: 'recipe_iron_shield',
    name: 'Khiên Sắt',
    emoji: '🛡️',
    description: 'Giáp sắt bền bỉ: +1 INT, +50 HP',
    ingredients: [
      { itemId: 'wood_scrap', quantity: 2 },
      { itemId: 'iron_ore', quantity: 8 },
    ],
    resultItemId: 'iron_shield',
    specialEffect: 'hp_up',
    craftCoinCost: 300,
  },
  {
    id: 'recipe_lucky_amulet',
    name: 'Bùa May Mắn',
    emoji: '🧿',
    description: 'Tăng vận may thám hiểm: +5 LUK',
    ingredients: [
      { itemId: 'magic_crystal', quantity: 3 },
      { itemId: 'wood_scrap', quantity: 5 },
    ],
    resultItemId: 'lucky_amulet',
    specialEffect: 'luk_up',
    craftCoinCost: 500,
  },
  {
    id: 'recipe_magic_wand',
    name: 'Trượng Phép',
    emoji: '🪄',
    description: 'Năng lượng ma thuật: +4 INT, +10 HP',
    ingredients: [
      { itemId: 'magic_crystal', quantity: 10 },
      { itemId: 'iron_ore', quantity: 2 },
    ],
    resultItemId: 'magic_wand',
    specialEffect: 'int_up',
    craftCoinCost: 800,
  },
];

export const SPECIAL_EFFECT_LABELS: Record<SpecialEffect, { label: string; desc: string }> = {
  str_up: { label: 'Tấn Công', desc: '+2 Sức mạnh' },
  int_up: { label: 'Phép Thuật', desc: '+4 Trí tuệ' },
  luk_up: { label: 'May Mắn', desc: '+5 May mắn' },
  hp_up: { label: 'Bền Bỉ', desc: '+50 Máu tối đa' },
};

export const MATERIAL_MAP: Record<string, { name: string, emoji: string }> = {
  wood_scrap: { name: 'Mảnh Gỗ', emoji: '🪵' },
  iron_ore: { name: 'Quặng Sắt', emoji: '🪨' },
  magic_crystal: { name: 'Tinh Thể', emoji: '🔮' },
  dragon_scale: { name: 'Vảy Rồng', emoji: '🐲' },
};
