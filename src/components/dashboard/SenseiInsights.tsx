import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Target, 
  Zap,
  ArrowRight,
  Brain,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InsightData {
  performance_summary: string;
  predicted_readiness: number;
  jlpt_forecast: string;
  weak_areas: Array<{
    type: string;
    content: string;
    reason: string;
  }>;
  focus_recommendations: string[];
}

export const SenseiInsights: React.FC<{ userId: string }> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InsightData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchInsights = async (force = false) => {
    setLoading(true);
    try {
      // Check cache in localStorage
      const cached = localStorage.getItem(`sensei_insights_${userId}`);
      const cachedTime = localStorage.getItem(`sensei_insights_time_${userId}`);
      
      const oneHour = 60 * 60 * 1000;
      if (!force && cached && cachedTime && (Date.now() - parseInt(cachedTime)) < oneHour) {
        setData(JSON.parse(cached));
        setLastUpdated(new Date(parseInt(cachedTime)).toLocaleTimeString());
        setLoading(false);
        return;
      }

      const { data: insights, error } = await supabase.functions.invoke('sensei-insights', {
        body: { user_id: userId }
      });

      if (error) throw error;

      setData(insights);
      setLastUpdated(new Date().toLocaleTimeString());
      localStorage.setItem(`sensei_insights_${userId}`, JSON.stringify(insights));
      localStorage.setItem(`sensei_insights_time_${userId}`, Date.now().toString());

    } catch (err) {
      console.error('Failed to fetch insights:', err);
      toast.error("Sensei không thể phân tích dữ liệu lúc này.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchInsights();
  }, [userId]);

  if (loading && !data) {
    return (
      <Card className="border-2 border-sakura/20 bg-card/60 backdrop-blur-sm overflow-hidden min-h-[400px] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 text-sakura animate-spin opacity-40" />
          <Brain className="h-6 w-6 text-sakura absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-bold text-sakura uppercase tracking-widest">Sensei đang mổ xẻ dữ liệu...</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Đang dự báo lộ trình JLPT cá nhân hóa</p>
        </div>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-2 border-sakura/20 bg-gradient-to-br from-white to-sakura-light/10 shadow-soft overflow-hidden group">
        <CardHeader className="pb-4 relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles className="h-24 w-24 text-sakura" />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-display font-bold flex items-center gap-2">
                <Brain className="h-5 w-5 text-sakura" />
                Sensei Intelligence Analysis
              </CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-wider">
                Phân tích & Dự báo hiệu suất học tập (Cập nhật lúc {lastUpdated})
              </CardDescription>
            </div>
            <Button 
                variant="ghost" size="icon" 
                onClick={() => fetchInsights(true)}
                disabled={loading}
                className="rounded-full hover:bg-sakura/10 text-sakura"
            >
                <TrendingUp className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Performance Summary & Readiness */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="bg-sakura/5 border border-sakura/10 p-5 rounded-3xl relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5">
                   <Target className="h-24 w-24" />
                </div>
                <p className="text-sm font-medium italic text-slate-700 leading-relaxed mb-4">
                  "{data.performance_summary}"
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-sakura">
                    <span>Mức độ sẵn sàng JLPT</span>
                    <span>{data.predicted_readiness}%</span>
                  </div>
                  <Progress value={data.predicted_readiness} className="h-2 bg-sakura/10" indicatorClassName="bg-gradient-to-r from-sakura to-sakura-dark" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-serif">
                <Sparkles className="h-3 w-3 inline mr-1 text-gold" />
                {data.jlpt_forecast}
              </p>
            </div>

            {/* Recommendations */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Zap className="h-3 w-3 text-gold" />
                Hành động ưu tiên
              </h4>
              <div className="space-y-2">
                {data.focus_recommendations.map((rec, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + (i * 0.1) }}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-sakura/20 transition-colors"
                  >
                    <div className="h-5 w-5 rounded-full bg-sakura/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="h-3 w-3 text-sakura" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-600">{rec}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-sakura/10 to-transparent" />

          {/* Weak Areas */}
          <div className="space-y-4">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-crimson" />
                Điểm yếu cần khắc phục
              </h4>
              <div className="grid sm:grid-cols-3 gap-4">
                {data.weak_areas.map((area, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 relative overflow-hidden group/area">
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover/area:opacity-100 transition-opacity">
                      <Badge variant="outline" className="text-[8px] uppercase tracking-tighter bg-white">{area.type}</Badge>
                    </div>
                    <p className="font-jp text-lg font-bold text-slate-800">{area.content}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic line-clamp-2">
                      {area.reason}
                    </p>
                  </div>
                ))}
              </div>
          </div>
        </CardContent>

        <CardFooter className="bg-sakura/5 border-t border-sakura/10 p-4">
           <Button variant="ghost" className="w-full text-xs font-bold text-sakura uppercase tracking-widest gap-2 hover:bg-sakura/10">
             Mở lộ trình ôn tập chi tiết <ArrowRight className="h-3 w-3" />
           </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
