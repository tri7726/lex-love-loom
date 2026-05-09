import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Flame, 
  Shield, 
  Zap, 
  Apple, 
  Clock, 
  Star, 
  ChevronRight,
  Info,
  Check,
  Sparkles,
  Wallet,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price_xp: number;
  icon: string;
  item_type: string;
}

interface InventoryItem {
  item_id: string;
  quantity: number;
}

export const SakuraShop = () => {
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const { toast } = useToast();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Use (supabase as any) to bypass missing table types
      const { data: shopData } = await (supabase as any).from('shop_items').select('*');
      setItems(shopData as ShopItem[] || []);

      if (user) {
        const { data: invData } = await (supabase as any)
          .from('user_inventory')
          .select('item_id, quantity')
          .eq('user_id', user.id);
        setInventory(invData as InventoryItem[] || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handlePurchase = async (item: ShopItem) => {
    if (!user || !profile) return;
    if (profile.total_xp < item.price_xp) {
      toast({ title: "Không đủ XP", description: "Bạn cần thêm XP để sở hữu vật phẩm này.", variant: "destructive" });
      return;
    }

    setBuying(item.id);
    try {
      const { error } = await (supabase as any).rpc('purchase_item_with_xp', { p_item_id: item.id });
      if (error) throw error;

      toast({ 
        title: "Mua hàng thành công! ✨", 
        description: `Bạn đã sở hữu ${item.name}.`
      });
      
      await refreshProfile();
      // Refresh inventory
      const { data: invData } = await (supabase as any)
        .from('user_inventory')
        .select('item_id, quantity')
        .eq('user_id', user.id);
      setInventory(invData as InventoryItem[] || []);
    } catch (err: any) {
      toast({ title: "Lỗi mua hàng", description: err.message, variant: "destructive" });
    } finally {
      setBuying(null);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame': return <Flame className="h-6 w-6" />;
      case 'Shield': return <Shield className="h-6 w-6" />;
      case 'Zap': return <Zap className="h-6 w-6" />;
      case 'Apple': return <Apple className="h-6 w-6" />;
      default: return <ShoppingBag className="h-6 w-6" />;
    }
  };

  const getItemCount = (itemId: string) => {
    return inventory.find(i => i.item_id === itemId)?.quantity || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-sakura" />
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-6xl space-y-12">
      <header className="space-y-4 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <Badge className="bg-sakura/10 text-sakura border-sakura/20 mb-2 font-black uppercase text-[10px] tracking-widest px-4 py-1">
            <Sparkles className="h-3 w-3 mr-2" /> Gamification Rewards
          </Badge>
          <h1 className="text-5xl font-display font-black text-sumi tracking-tight">Sakura Shop</h1>
          <p className="text-muted-foreground font-medium text-lg">Sử dụng XP của bạn để đổi lấy những đặc quyền học tập.</p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-xl border-2 border-sakura-light/30 p-4 rounded-3xl shadow-soft flex items-center gap-6">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Ngân sách của bạn</p>
            <div className="flex items-center gap-2 text-2xl font-black text-gold">
              <Wallet className="h-6 w-6" /> {profile?.total_xp?.toLocaleString()} <span className="text-sm opacity-60">XP</span>
            </div>
          </div>
          <div className="h-10 w-px bg-sakura-light/20" />
          <Button variant="ghost" className="rounded-2xl gap-2 font-bold text-sakura hover:bg-sakura-light/50">
            Nạp thêm <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatePresence>
          {items.map((item, index) => {
            const count = getItemCount(item.id);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border-2 border-sakura-light/20 hover:border-sakura/40 transition-all rounded-[2.5rem] overflow-hidden group shadow-card flex flex-col bg-white/80 backdrop-blur-md">
                  <div className="h-32 bg-gradient-to-br from-sakura-light/20 to-white flex items-center justify-center relative">
                    <div className="h-16 w-16 rounded-3xl bg-white shadow-soft flex items-center justify-center text-sakura transition-transform group-hover:scale-110 group-hover:rotate-3 duration-500">
                      {getIcon(item.icon)}
                    </div>
                    {count > 0 && (
                      <Badge className="absolute top-4 right-4 bg-matcha text-white border-0 shadow-soft">
                        Đã có: {count}
                      </Badge>
                    )}
                  </div>
                  
                  <CardHeader className="pt-6 pb-2">
                    <CardTitle className="text-xl font-black text-sumi">{item.name}</CardTitle>
                    <CardDescription className="line-clamp-2 font-medium leading-relaxed">{item.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1" />

                  <CardFooter className="p-6 pt-0">
                    <Button 
                      onClick={() => handlePurchase(item)}
                      disabled={buying === item.id || (profile?.total_xp || 0) < item.price_xp}
                      className={cn(
                        "w-full h-14 rounded-2xl font-black gap-2 text-lg shadow-elevated transition-all active:scale-95",
                        (profile?.total_xp || 0) < item.price_xp 
                          ? "bg-muted text-muted-foreground cursor-not-allowed" 
                          : "bg-sakura hover:bg-sakura-dark text-white"
                      )}
                    >
                      {buying === item.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Star className="h-5 w-5" />
                          {item.price_xp.toLocaleString()} XP
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <section className="bg-indigo-jp rounded-[3rem] p-10 text-white relative overflow-hidden shadow-elevated">
        <Sparkles className="absolute -top-6 -right-6 h-40 w-40 opacity-10" />
        <div className="relative z-10 max-w-2xl space-y-6">
          <h2 className="text-3xl font-display font-black leading-tight">Bạn muốn nhận thêm vật phẩm đặc biệt?</h2>
          <p className="text-indigo-jp-light font-medium opacity-80 leading-relaxed">
            Hãy tham gia các sự kiện cộng đồng hoặc đạt Top 3 trong giải đấu hàng tuần để nhận được các hòm báu Sakura Legend chứa những vật phẩm không thể mua bằng XP.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Button variant="secondary" className="rounded-xl font-bold bg-white/10 hover:bg-white/20 border-white/20 text-white gap-2 backdrop-blur-md">
              <Info className="h-4 w-4" /> Tìm hiểu về hòm báu
            </Button>
            <Button variant="ghost" className="rounded-xl font-bold text-white hover:bg-white/10">
              Xem lịch sự kiện
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SakuraShop;
