import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Download, 
  Star, 
  Users, 
  Globe, 
  Filter, 
  MoreVertical,
  ChevronRight,
  BookOpen,
  Sparkles,
  Award,
  Plus,
  Loader2,
  Heart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PublicDeck {
  id: string;
  title: string;
  description: string;
  category: string;
  total_clones: number;
  avg_rating: number;
  is_premium: boolean;
  price_xp: number;
  creator_id: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
  };
}

export const CommunityLibrary = () => {
  const { toast } = useToast();
  const [decks, setDecks] = useState<PublicDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cloning, setCloning] = useState<string | null>(null);

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('public_decks')
      .select('*')
      .order('total_clones', { ascending: false });

    if (error) {
      console.error('Error fetching decks:', error);
      setDecks([]);
    } else {
      const rows = data || [];
      const ids = Array.from(new Set(rows.map((d: any) => d.creator_id).filter(Boolean)));
      let pmap = new Map<string, any>();
      if (ids.length) {
        const { data: profs } = await (supabase as any)
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', ids as string[]);
        pmap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      }
      setDecks(rows.map((d: any) => ({ ...d, profiles: pmap.get(d.creator_id) || null })));
    }
    setLoading(false);
  };

  const handleClone = async (deckId: string) => {
    setCloning(deckId);
    try {
      const { error } = await (supabase as any).rpc('clone_public_deck', { p_public_id: deckId });
      if (error) throw error;

      toast({ 
        title: "Đã tải về máy! 📚", 
        description: "Bạn có thể học bộ thẻ này ngay trong phần Từ vựng cá nhân."
      });
      fetchDecks(); // Update clone count
    } catch (err: any) {
      toast({ title: "Lỗi tải về", description: err.message, variant: "destructive" });
    } finally {
      setCloning(null);
    }
  };

  const filteredDecks = decks.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && decks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-sakura" />
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-7xl space-y-12">
      <header className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <Badge className="bg-gold/10 text-gold border-gold/20 mb-2 font-black uppercase text-[10px] tracking-widest px-4 py-1">
              <Globe className="h-3 w-3 mr-2" /> Global Knowledge Sharing
            </Badge>
            <h1 className="text-5xl font-display font-black text-sumi tracking-tight">Thư viện cộng đồng</h1>
            <p className="text-muted-foreground font-medium text-lg max-w-2xl">
              Khám phá hàng ngàn bộ thẻ từ vựng được đóng góp bởi các học viên và giáo viên trên toàn thế giới.
            </p>
          </div>
          <Button className="rounded-2xl h-14 px-8 bg-sakura hover:bg-sakura-dark text-white font-black gap-2 shadow-elevated">
            <Plus className="h-5 w-5" /> Đóng góp bộ thẻ của bạn
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 bg-white/50 backdrop-blur-md p-4 rounded-[2rem] border-2 border-sakura-light/20 shadow-soft">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Tìm kiếm theo tiêu đề, chủ đề hoặc từ khóa..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 rounded-2xl border-0 bg-transparent focus-visible:ring-sakura/20 font-medium text-lg"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-14 rounded-2xl border-2 border-sakura-light/30 text-sumi font-bold gap-2">
              <Filter className="h-4 w-4" /> Lọc
            </Button>
            <Button variant="outline" className="h-14 rounded-2xl border-2 border-sakura-light/30 text-sumi font-bold gap-2 px-6">
              Mới nhất
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {filteredDecks.map((deck, index) => (
            <motion.div
              key={deck.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full border-2 border-sakura-light/20 hover:border-sakura/40 transition-all rounded-[2.5rem] overflow-hidden group shadow-card flex flex-col bg-white/80 backdrop-blur-md">
                <CardHeader className="p-8 pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="secondary" className="bg-sakura-light/30 text-sakura border-0 font-bold px-3 py-1">
                      {deck.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-gold font-black text-sm">
                      <Star className="h-4 w-4 fill-gold" /> {deck.avg_rating || 'N/A'}
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-black text-sumi group-hover:text-sakura transition-colors line-clamp-1">{deck.title}</CardTitle>
                  <CardDescription className="font-medium text-sm line-clamp-2 min-h-[40px] leading-relaxed">{deck.description || 'Không có mô tả cho bộ thẻ này.'}</CardDescription>
                </CardHeader>

                <CardContent className="px-8 pb-4 flex-1">
                  <div className="flex items-center justify-between pt-4 border-t border-sakura-light/10 text-sumi/60 text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 rounded-xl border-2 border-white shadow-soft">
                        <AvatarImage src={deck.profiles?.avatar_url} />
                        <AvatarFallback className="bg-sakura-light text-sakura text-[10px]">LL</AvatarFallback>
                      </Avatar>
                      <span>{deck.profiles?.display_name || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {deck.total_clones}</span>
                      <span className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /> 12</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-8 pt-4">
                  <Button 
                    onClick={() => handleClone(deck.id)}
                    disabled={cloning === deck.id}
                    className="w-full h-14 rounded-2xl bg-white border-2 border-sakura-light/30 hover:border-sakura hover:bg-sakura-light/10 text-sumi font-black gap-3 transition-all active:scale-95 shadow-soft"
                  >
                    {cloning === deck.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Download className="h-5 w-5 text-sakura" />
                        Tải về cá nhân
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredDecks.length === 0 && (
        <div className="py-20 text-center space-y-4 opacity-40">
          <BookOpen className="h-20 w-20 mx-auto text-sakura" />
          <h3 className="text-2xl font-black text-sumi">Không tìm thấy kết quả</h3>
          <p className="font-medium">Thử thay đổi từ khóa tìm kiếm hoặc lọc theo chủ đề khác.</p>
        </div>
      )}
    </div>
  );
};

export default CommunityLibrary;
