import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, BookOpen, Copy, Search, Filter, Star,
  ArrowRight, Sparkles, ChevronLeft, Loader2, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Navigation } from '@/components/navigation/Navigation';

interface PublicDeck {
  id: string;
  name: string;
  description?: string;
  card_count: number;
  clone_count: number;
  owner_name: string;
  jlpt_level?: string;
  tags?: string[];
  is_premium: boolean;
  price_xp: number;
  avg_rating: number;
  created_at: string;
}

const JLPT_COLORS: Record<string, string> = {
  N1: 'bg-rose-100 text-rose-700',
  N2: 'bg-pink-100 text-pink-700',
  N3: 'bg-indigo-100 text-indigo-700',
  N4: 'bg-emerald-100 text-emerald-700',
  N5: 'bg-lime-100 text-lime-700',
};

export default function CommunityDecks() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [decks, setDecks] = useState<PublicDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  const [cloning, setCloning] = useState<string | null>(null);

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_community_decks');

      if (error) throw error;

      if (data && data.length > 0) {
        const formatted: PublicDeck[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          card_count: Number(d.card_count) || 0,
          clone_count: d.clone_count ?? 0,
          owner_name: d.owner_name ?? 'Ẩn danh',
          jlpt_level: d.jlpt_level || d.name.match(/N[1-5]/)?.[0],
          tags: d.tags || [],
          is_premium: !!d.is_premium,
          price_xp: d.price_xp || 0,
          avg_rating: Number(d.avg_rating) || 0,
          created_at: d.created_at,
        }));
        setDecks(formatted);
      } else {
        setDecks(DEMO_DECKS);
      }
    } catch (e) {
      console.warn('Failed to load community decks, using demo data', e);
      // Use demo data if DB query fails or RPC not applied yet
      setDecks(DEMO_DECKS);
    } finally {
      setLoading(false);
    }
  };

  const cloneDeck = async (deck: PublicDeck) => {
    if (!user) { toast.error('Đăng nhập để clone bộ thẻ!'); return; }
    setCloning(deck.id);

    try {
      const { error } = await (supabase as any).rpc('clone_public_deck_v2', {
        p_public_id: deck.id
      });

      if (error) throw error;

      toast.success(`✅ Đã clone "${deck.name}" — Kiểm tra Folder Manager!`, {
        description: deck.is_premium ? `Bạn đã thanh toán ${deck.price_xp} XP cho bộ thẻ này.` : undefined
      });
      // Reload decks to update clone count
      loadDecks();
    } catch (e: any) {
      toast.error('Clone thất bại', { description: e.message || 'Thử tải lại trang nhé!' });
      console.error("Clone error:", e);
    } finally {
      setCloning(null);
    }
  };

  const handleRateDeck = async (deckId: string, rating: number) => {
    if (!user) { toast.error('Đăng nhập để đánh giá!'); return; }
    try {
      const { error } = await (supabase as any).rpc('rate_public_deck', {
        p_deck_id: deckId,
        p_rating: rating
      });
      if (error) throw error;
      toast.success('Cảm ơn bạn đã đánh giá! ✨');
      loadDecks();
    } catch (e) {
      toast.error('Không thể gửi đánh giá.');
    }
  };

  const filtered = decks.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
      || d.description?.toLowerCase().includes(search.toLowerCase());
    const matchLevel = !filterLevel || d.jlpt_level === filterLevel;
    return matchSearch && matchLevel;
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-10 space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sakura to-pink-400 flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground">Community Decks</h1>
              <p className="text-sm text-muted-foreground">Bộ thẻ được chia sẻ bởi cộng đồng học tiếng Nhật</p>
            </div>
          </div>
        </motion.div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm bộ thẻ..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-sakura/40 text-foreground/80"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[null, 'N5', 'N4', 'N3', 'N2', 'N1'].map(level => (
              <button
                key={level ?? 'all'}
                onClick={() => setFilterLevel(level)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-black transition-all border',
                  filterLevel === level
                    ? 'bg-sakura text-white border-sakura shadow-sm'
                    : 'bg-white text-muted-foreground border-border hover:border-sakura/30'
                )}
              >
                {level ?? 'Tất cả'}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-sakura" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((deck, i) => (
                <motion.div
                  key={deck.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all group overflow-hidden"
                >
                  {/* Card top accent */}
                  <div className="h-1 bg-gradient-to-r from-sakura to-pink-300" />

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-foreground text-sm leading-snug group-hover:text-sakura transition-colors">
                        {deck.name}
                      </h3>
                      {deck.jlpt_level && (
                        <span className={cn('text-[8px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0', JLPT_COLORS[deck.jlpt_level])}>
                          {deck.jlpt_level}
                        </span>
                      )}
                    </div>

                    {deck.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{deck.description}</p>
                    )}

                    {deck.tags && deck.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {deck.tags.map(tag => (
                          <span key={tag} className="text-[8px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 font-bold">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {deck.card_count} thẻ
                      </span>
                      <div className="flex items-center gap-1 group/rate relative">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> 
                        <span>{deck.avg_rating.toFixed(1)}</span>
                        
                        {/* Hover to rate mini UI */}
                        <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg p-1 shadow-xl opacity-0 group-hover/rate:opacity-100 pointer-events-none group-hover/rate:pointer-events-auto transition-opacity z-30 flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button 
                              key={star} 
                              onClick={() => handleRateDeck(deck.id, star)}
                              className="hover:scale-125 transition-transform p-0.5"
                            >
                              <Star className={cn("h-3 w-3", star <= Math.round(deck.avg_rating) ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground/70">bởi <strong>{deck.owner_name}</strong></span>
                      <button
                        onClick={() => cloneDeck(deck)}
                        disabled={cloning === deck.id}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black transition-colors disabled:opacity-50",
                          deck.is_premium ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-sakura/10 text-sakura hover:bg-sakura/20"
                        )}
                      >
                        {cloning === deck.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : deck.is_premium ? <Sparkles className="h-3 w-3" /> : <Copy className="h-3 w-3" />
                        }
                        {deck.is_premium ? `${deck.price_xp} XP` : 'Clone Free'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-16 space-y-3">
            <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground/70 font-bold">Chưa có bộ thẻ nào. Hãy là người đầu tiên chia sẻ!</p>
            <Button variant="outline" onClick={() => navigate('/folder-manager')} className="gap-2">
              <ArrowRight className="h-4 w-4" /> Đến Folder Manager
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

// Demo data for when DB query fails
const DEMO_DECKS: PublicDeck[] = [
  { id: '1', name: 'N5 Minna no Nihongo Bài 1-10', description: 'Từ vựng cơ bản bài 1 đến 10 của Minna no Nihongo', card_count: 120, clone_count: 48, owner_name: 'Sakura_Learner', jlpt_level: 'N5', created_at: '', is_premium: false, price_xp: 0, avg_rating: 4.8 },
  { id: '2', name: 'N4 Động từ thông dụng', description: 'Tổng hợp 150 động từ N4 được dùng nhiều nhất', card_count: 150, clone_count: 35, owner_name: 'TokyoDreamer', jlpt_level: 'N4', created_at: '', is_premium: false, price_xp: 0, avg_rating: 4.5 },
  { id: '3', name: 'Ẩm thực Nhật Bản', description: 'Từ vựng về các món ăn, nhà hàng, và văn hóa ẩm thực', card_count: 80, clone_count: 29, owner_name: 'FoodieJP', jlpt_level: 'N5', created_at: '', is_premium: false, price_xp: 0, avg_rating: 4.2 },
  { id: '4', name: 'N3 Ngữ pháp nâng cao', description: 'Các cấu trúc ngữ pháp N3 thường xuất hiện trong đề thi', card_count: 60, clone_count: 22, owner_name: 'JLPT_Hunter', jlpt_level: 'N3', created_at: '', is_premium: true, price_xp: 500, avg_rating: 4.9 },
  { id: '5', name: 'Anime & Manga Vocabulary', description: 'Từ vựng phổ biến trong anime và manga', card_count: 200, clone_count: 91, owner_name: 'OtakuSensei', jlpt_level: 'N5', created_at: '', is_premium: false, price_xp: 0, avg_rating: 4.7 },
  { id: '6', name: 'N5 Kanji cơ bản', description: '80 Kanji N5 bắt buộc với ví dụ và cách nhớ', card_count: 80, clone_count: 67, owner_name: 'KanjiMaster', jlpt_level: 'N5', created_at: '', is_premium: false, price_xp: 0, avg_rating: 4.6 },
];
