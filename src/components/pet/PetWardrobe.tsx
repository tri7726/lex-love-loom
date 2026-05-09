import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shirt, X, Sparkles, Shield, Zap, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PetWardrobeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equippedItems: Record<string, string>;
  onEquip: (itemType: string, imageUrl: string | null) => Promise<any>;
}

export const PetWardrobe: React.FC<PetWardrobeProps> = ({ 
  open, 
  onOpenChange, 
  equippedItems, 
  onEquip 
}) => {
  const { user } = useAuth();
  const [gear, setGear] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const fetchGear = async () => {
      const { data, error } = await supabase.from('pet_gear').select('*');
      if (error) console.error(error);
      else setGear(data || []);
      setLoading(false);
    };
    fetchGear();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <Shirt className="h-6 w-6" /> TỦ ĐỒ CỦA PET
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {gear.map((item) => {
              const isEquipped = equippedItems[item.type] === item.image_url;
              
              return (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={React.useMemo(() => `
                    relative group border-2 rounded-2xl p-4 transition-all duration-300 cursor-pointer
                    ${isEquipped ? 'border-primary bg-primary/5 shadow-lg' : 'border-slate-100 hover:border-slate-200 bg-white'}
                  `.trim(), [isEquipped])}
                  onClick={() => onEquip(item.type, item.image_url)}
                >
                  {isEquipped && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className="bg-primary text-white font-black text-[10px]">ĐANG MẶC</Badge>
                    </div>
                  )}

                  <div className="aspect-square w-full mb-3 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-slate-50 rounded-xl group-hover:bg-slate-100 transition-colors" />
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-4/5 h-4/5 object-contain relative z-10 drop-shadow-md group-hover:scale-110 transition-transform duration-500" 
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-tight text-slate-800">{item.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{item.type.toUpperCase()}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
