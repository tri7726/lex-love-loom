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
import { Navigation } from '@/components/Navigation';

interface PublicDeck {
  id: string;
  name: string;
  description?: string;
  card_count: number;
  clone_count: number;
  owner_name: string;
  jlpt_level?: string;
  tags?: string[];
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
      const { data, error } = await (supabase as any)
        .from('flashcard_folders')
        .select(`
          id, name, description, clone_count,
          profiles!inner(display_name),
          flashcards(count)
        `)
        .eq('is_public', true)
        .order('clone_count', { ascending: false })
        .limit(24);

      if (error) throw error;

      const formatted: PublicDeck[] = (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        card_count: d.flashcards?.[0]?.count ?? 0,
        clone_count: d.clone_count ?? 0,
        owner_name: d.profiles?.display_name ?? 'Ẩn danh',
        jlpt_level: d.name.match(/N[1-5]/)?.[0],
        tags: [],
        created_at: d.created_at,
      }));

      setDecks(formatted);
    } catch (e) {
      // Use demo data if DB query fails
      setDecks(DEMO_DECKS);
    } finally {
      setLoading(false);
    }
  };

  const cloneDeck = async (deck: PublicDeck) => {
    if (!user) { toast.error('Đăng nhập để clone bộ thẻ!'); return; }
    setCloning(deck.id);

    try {
      // 1. Get all flashcards in the source folder
      const { data: cards } = await (supabase as any)
        .from('flashcards')
        .select('word, reading, meaning, example_sentence, jlpt_level')
        .eq('folder_id', deck.id);

      // 2. Create new folder for current user
      const { data: newFolder, error: folderErr } = await (supabase as any)
        .from('flashcard_folders')
        .insert({ name: `${deck.name} (clone)`, user_id: user.id, is_public: false })
        .select('id').single();

      if (folderErr) throw folderErr;

      // 3. Clone cards into new folder
      if (cards && cards.length > 0) {
        await (supabase as any).from('flashcards').insert(
          cards.map((c: any) => ({ ...c, id: undefined, user_id: user.id, folder_id: newFolder.id }))
        );
      }

      // 4. Increment clone_count
      await (supabase as any)
        .from('flashcard_folders')
        .update({ clone_count: (deck.clone_count ?? 0) + 1 })
        .eq('id', deck.id);

      toast.success(`✅ Đã clone "${deck.name}" — Kiểm tra Folder Manager!`);
    } catch (e) {
      toast.error('Clone thất bại. Thử lại nhé!');
    } finally {
      setCloning(null);
    }
  };

  const filtered = decks.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
      || d.description?.toLowerCase().includes(search.toLowerCase());
    const matchLevel = !filterLevel || d.jlpt_level === filterLevel;
    return matchSearch && matchLevel;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50/20 pb-24">
      <Navigation />
      <div className="container max-w-5xl py-8 space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sakura to-pink-400 flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">Community Decks</h1>
              <p className="text-sm text-slate-500">Bộ thẻ được chia sẻ bởi cộng đồng học tiếng Nhật</p>
            </div>
          </div>
        </motion.div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm bộ thẻ..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-sakura/40 text-slate-700"
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
                    : 'bg-white text-slate-500 border-slate-200 hover:border-sakura/30'
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
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden"
                >
                  {/* Card top accent */}
                  <div className="h-1 bg-gradient-to-r from-sakura to-pink-300" />

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-slate-800 text-sm leading-snug group-hover:text-sakura transition-colors">
                        {deck.name}
                      </h3>
                      {deck.jlpt_level && (
                        <span className={cn('text-[8px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0', JLPT_COLORS[deck.jlpt_level])}>
                          {deck.jlpt_level}
                        </span>
                      )}
                    </div>

                    {deck.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{deck.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {deck.card_count} thẻ
                      </span>
                      <span className="flex items-center gap-1">
                        <Copy className="h-3 w-3" /> {deck.clone_count} clone
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400">bởi <strong>{deck.owner_name}</strong></span>
                      <button
                        onClick={() => cloneDeck(deck)}
                        disabled={cloning === deck.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sakura/10 text-sakura text-[10px] font-black hover:bg-sakura/20 transition-colors disabled:opacity-50"
                      >
                        {cloning === deck.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Copy className="h-3 w-3" />
                        }
                        Clone
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
            <Sparkles className="h-10 w-10 text-slate-200 mx-auto" />
            <p className="text-slate-400 font-bold">Chưa có bộ thẻ nào. Hãy là người đầu tiên chia sẻ!</p>
            <Button variant="outline" onClick={() => navigate('/folder-manager')} className="gap-2">
              <ArrowRight className="h-4 w-4" /> Đến Folder Manager
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Demo data for when DB query fails
const DEMO_DECKS: PublicDeck[] = [
  { id: '1', name: 'N5 Minna no Nihongo Bài 1-10', description: 'Từ vựng cơ bản bài 1 đến 10 của Minna no Nihongo', card_count: 120, clone_count: 48, owner_name: 'Sakura_Learner', jlpt_level: 'N5', created_at: '' },
  { id: '2', name: 'N4 Động từ thông dụng', description: 'Tổng hợp 150 động từ N4 được dùng nhiều nhất', card_count: 150, clone_count: 35, owner_name: 'TokyoDreamer', jlpt_level: 'N4', created_at: '' },
  { id: '3', name: 'Ẩm thực Nhật Bản', description: 'Từ vựng về các món ăn, nhà hàng, và văn hóa ẩm thực', card_count: 80, clone_count: 29, owner_name: 'FoodieJP', jlpt_level: undefined, created_at: '' },
  { id: '4', name: 'N3 Ngữ pháp nâng cao', description: 'Các cấu trúc ngữ pháp N3 thường xuất hiện trong đề thi', card_count: 60, clone_count: 22, owner_name: 'JLPT_Hunter', jlpt_level: 'N3', created_at: '' },
  { id: '5', name: 'Anime & Manga Vocabulary', description: 'Từ vựng phổ biến trong anime và manga', card_count: 200, clone_count: 91, owner_name: 'OtakuSensei', jlpt_level: undefined, created_at: '' },
  { id: '6', name: 'N5 Kanji cơ bản', description: '80 Kanji N5 bắt buộc với ví dụ và cách nhớ', card_count: 80, clone_count: 67, owner_name: 'KanjiMaster', jlpt_level: 'N5', created_at: '' },
];
