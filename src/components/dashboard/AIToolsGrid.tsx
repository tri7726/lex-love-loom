import { memo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MessageSquare, Globe, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const AIToolsGrid = memo(function AIToolsGrid() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-6 !mt-12"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Công cụ AI nâng cao
        </h2>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Link to="/sensei?mode=roleplay">
          <Card className="group overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all hover:shadow-elevated bg-card/60">
            <CardContent className="p-0 flex flex-col sm:flex-row h-full">
              <div className="sm:w-1/3 relative h-40 sm:h-auto overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop"
                  alt="AI Roleplay"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="p-6 flex-1 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    AI Roleplay Studio
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Nhập vai vào các tình huống thực tế tại Nhật Bản. Luyện tập phản xạ giao tiếp tự nhiên với Sensei.
                  </p>
                </div>
                <Button variant="outline" className="w-full sm:w-auto font-bold text-xs uppercase tracking-widest gap-2">
                  Bắt đầu ngay <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/news">
          <Card className="group overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all hover:shadow-elevated bg-card/60">
            <CardContent className="p-0 flex flex-col sm:flex-row h-full">
              <div className="sm:w-1/3 relative h-40 sm:h-auto overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop"
                  alt="Japanese News"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="p-6 flex-1 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Globe className="h-5 w-5 text-indigo-jp" />
                    Tin tức thời gian thực
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Cập nhật tin tức Nhật Bản phiên bản dễ nghe, đọc. Vừa học từ vựng vừa nắm bắt tình hình thế giới.
                  </p>
                </div>
                <Button variant="outline" className="w-full sm:w-auto font-bold text-xs uppercase tracking-widest gap-2">
                  Đọc tin tức <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </motion.section>
  );
});
