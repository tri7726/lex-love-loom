import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, 
  Search, 
  BookOpen, 
  ExternalLink, 
  Newspaper,
  Calendar,
  Clock,
  ArrowRight,
  Filter,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { SakuraSkeleton } from '@/components/ui/SakuraSkeleton';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';

const CATEGORIES = ['Tất cả', 'N5', 'N4', 'N3', 'N2', 'N1'];

const MOCK_NEWS = [
  {
    id: '1',
    title: 'Nghỉ lễ Tuần lễ Vàng ở Nhật Bản bắt đầu',
    japaneseTitle: '日本のゴールデンウィークが始まりました',
    description: 'Năm nay kỳ nghỉ kéo dài 10 ngày với nhiều hoạt động du lịch sôi động.',
    category: 'Xã hội',
    date: '01/05/2026',
    time: '5 phút trước',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop',
    difficulty: 'N4-N3'
  },
  {
    id: '2',
    title: 'Giá cà phê tại Tokyo tăng cao kỷ lục',
    japaneseTitle: '東京のコーヒー価格が過去最高に',
    description: 'Nhiều quán cà phê tại Shibuya đã tăng giá do chi phí nhập khẩu tăng.',
    category: 'Kinh tế',
    date: '28/04/2026',
    time: '2 giờ trước',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop',
    difficulty: 'N3-N2'
  },
  {
    id: '3',
    title: 'Triển lãm Kimono hiện đại tại Kyoto',
    japaneseTitle: '京都で現代的な着物展示会',
    description: 'Sự kết hợp giữa truyền thống và công nghệ LED trên trang phục.',
    category: 'Văn hóa',
    date: '27/04/2026',
    time: '1 ngày trước',
    image: 'https://images.unsplash.com/photo-1445014164801-443657b98d97?w=800&auto=format&fit=crop',
    difficulty: 'N4'
  }
];

export const News = () => {
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const isAdmin = profile?.role === 'admin';

  // Fetch news from reading_passages table
  const { data: news, isLoading } = useQuery({
    queryKey: ['japanese-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_passages')
        .select('*')
        .eq('category', 'news')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Mutation to fetch and analyze latest news
  const fetchNewsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('japanese-news', {
        body: { action: 'fetch_and_analyze' }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['japanese-news'] });
      toast({
        title: "Thành công!",
        description: "Đã cập nhật tin tức mới nhất từ Nhật Bản.",
      });
    },
    onError: (error: any) => {
      console.error('Error fetching news:', error);
      toast({
        title: "Lỗi!",
        description: error.message || "Không thể làm mới tin tức. Vui lòng thử lại sau.",
        variant: "destructive"
      });
    }
  });

  const filteredNews = news?.filter(item => 
    selectedCategory === 'Tất cả' || item.level === selectedCategory // Simplification: using level as cat for now
  ) || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="container py-10 space-y-8">
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                News Reader
              </Badge>
              <h1 className="text-4xl font-display font-bold">Tin tức Nhật Bản</h1>
              <p className="text-muted-foreground">
                Cập nhật thông tin và luyện đọc tiếng Nhật qua các sự kiện nóng hổi.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Button 
                  variant="outline" 
                  className="rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 gap-2 font-bold"
                  onClick={() => fetchNewsMutation.mutate()}
                  disabled={fetchNewsMutation.isPending}
                >
                  {fetchNewsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Làm mới tin tức
                </Button>
              )}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Tìm kiếm tin tức..." className="pl-9 bg-card border-border rounded-xl" />
              </div>
              <Button variant="outline" size="icon" className="rounded-xl border-border">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {CATEGORIES.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "rounded-full px-5 font-semibold text-xs transition-all",
                  selectedCategory === cat ? "shadow-sakura-sm" : "hover:bg-primary/10 text-muted-foreground"
                )}
              >
                {cat}
              </Button>
            ))}
          </div>
        </section>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            <SakuraSkeleton variant="news-card" count={3} className="col-span-full grid md:grid-cols-2 lg:grid-cols-3 gap-8" />
          ) : filteredNews.length > 0 ? (
            filteredNews.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="group overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all hover:shadow-elevated h-full flex flex-col bg-card/60">
                  <div className="relative h-48 overflow-hidden bg-muted flex items-center justify-center">
                    <img 
                      src={`https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop`} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Newspaper className="h-12 w-12 text-white/50" />
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-foreground border-0 font-bold">
                        {item.level}
                      </Badge>
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <Badge className="bg-primary text-primary-foreground font-black text-[10px] uppercase border-0">
                        {item.category && item.category !== 'news' ? item.category : 'NHẬT BẢN'}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardHeader className="p-5 space-y-3 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Calendar className="h-3 w-3" /> {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                    </div>
                    <p 
                      className="text-sm text-muted-foreground line-clamp-3 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: item.content_with_furigana || item.content }}
                    />
                  </CardHeader>
                  
                  <CardFooter className="px-5 pb-5 pt-0">
                    <Button 
                      className="w-full gap-2 font-bold text-xs uppercase tracking-widest bg-muted text-foreground hover:bg-primary hover:text-white transition-all group/btn"
                      onClick={() => navigate(`/reading?id=${item.id}`)}
                    >
                      Đọc chi tiết
                      <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center space-y-6 bg-muted/20 rounded-3xl border-2 border-dashed border-border flex flex-col items-center">
              <Globe className="h-16 w-16 text-muted-foreground/30" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Chưa có bản tin nào</h3>
                <p className="text-muted-foreground max-w-md">Bấm vào nút "Làm mới tin tức" để lấy thông tin nóng hổi nhất từ Nhật Bản.</p>
              </div>
              <Button onClick={() => fetchNewsMutation.mutate()} className="rounded-xl shadow-sakura">Lấy tin tức ngay</Button>
            </div>
          )}
        </div>

        <section className="bg-primary/5 rounded-3xl p-10 mt-12 border-2 border-primary/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5">
            <Newspaper className="h-40 w-40 text-primary" />
          </div>
          <div className="max-w-xl space-y-4 relative z-10">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Globe className="h-6 w-6 text-primary" />
              Kết nối với NHK Easy News
            </h2>
            <p className="text-muted-foreground">
              Hệ thống đang được cập nhật để lấy dữ liệu trực tiếp từ các nguồn tin tức chính thống tại Nhật Bản với cấp độ tiếng Nhật được đơn giản hóa.
            </p>
            <Button className="rounded-xl shadow-sakura">Tìm hiểu thêm</Button>
          </div>
        </section>
      </main>
    </div>
  );
};
export default News;
