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
  Filter
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Tất cả', 'Xã hội', 'Kinh tế', 'Văn hóa', 'Thể thao', 'Học tập'];

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
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
          {MOCK_NEWS.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="group overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all hover:shadow-elevated h-full flex flex-col bg-card/60">
                <div className="relative h-48 overflow-hidden">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-foreground border-0 font-bold">
                      {item.difficulty}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <Badge className="bg-primary text-primary-foreground font-black text-[10px] uppercase border-0">
                      {item.category}
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="p-5 space-y-3 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Calendar className="h-3 w-3" /> {item.date}
                    <Clock className="h-3 w-3 ml-2" /> {item.time}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-primary font-jp font-bold text-sm line-clamp-1">
                      {item.japaneseTitle}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </CardHeader>
                
                <CardFooter className="px-5 pb-5 pt-0">
                  <Button className="w-full gap-2 font-bold text-xs uppercase tracking-widest bg-muted text-foreground hover:bg-primary hover:text-white transition-all group/btn">
                    Đọc chi tiết
                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
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
