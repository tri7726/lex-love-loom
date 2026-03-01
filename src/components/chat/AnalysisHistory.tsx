import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, User as UserIcon, Loader2, Sparkles, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface AnalysisItem {
  id: string;
  content: string;
  created_at: string;
  engine: string | null;
  analysis: unknown;
  user_id: string;
}

interface AnalysisHistoryProps {
  onSelect: (item: AnalysisItem) => void;
  title?: string;
  maxItems?: number;
  className?: string;
  variant?: 'vertical' | 'horizontal';
}

export const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({ 
  onSelect, 
  title = "Lịch sử phân tích gần đây",
  maxItems = 20,
  className,
  variant = 'vertical'
}) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = React.useCallback(async () => {
    if (!user) {
      setHistory([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('analysis_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching analysis history:', error);
    } finally {
      setLoading(false);
    }
  }, [user, maxItems]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const { error } = await (supabase as any).from('analysis_history').delete().eq('id', id);
      if (error) throw error;
      setHistory(prev => prev.filter(item => item.id !== id));
      toast.success('Đã xóa lịch sử');
    } catch (error) {
      toast.error('Không thể xóa lịch sử');
    }
  };

  if (!user) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className={cn("py-6 text-center", variant === 'horizontal' && "flex items-center gap-4 py-3 text-left")}>
          <UserIcon className={cn("h-8 w-8 mx-auto mb-2 text-muted-foreground/30", variant === 'horizontal' && "mx-0 mb-0 h-6 w-6")} />
          <div className={cn(variant === 'horizontal' && "flex-1")}>
            <p className="text-xs font-bold mb-1">Chưa đăng nhập</p>
            {variant === 'vertical' && <p className="text-[10px] text-muted-foreground mb-3">Đăng nhập để xem lịch sử.</p>}
          </div>
          <Link to="/auth">
            <Button size="sm" variant="outline" className="h-7 text-[10px] px-3">Đăng nhập</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <History className="h-3 w-3 text-primary" />
          {title}
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchHistory} disabled={loading} 
          className="h-6 px-2 text-[9px] uppercase font-black text-primary hover:bg-primary/5">
          Refresh
        </Button>
      </div>

      <div className={cn(
        "scrollbar-hide", 
        variant === 'vertical' ? "space-y-2 max-h-[400px] overflow-y-auto pr-1" : "flex gap-3 overflow-x-auto pb-2 min-h-[90px] items-center"
      )}>
        {loading ? (
          [1, 2, 3].map(i => (
            <Skeleton key={i} className={cn(
              "rounded-xl shrink-0", 
              variant === 'vertical' ? "h-16 w-full" : "h-20 w-56"
            )} />
          ))
        ) : history.length === 0 ? (
          <div className={cn(
            "text-center py-6 border-2 border-dashed rounded-xl bg-muted/5",
            variant === 'horizontal' && "flex-1 py-4"
          )}>
            <p className="text-[10px] text-muted-foreground italic font-medium">Chưa có dữ liệu phân tích.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {history.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                className={cn(
                  "group relative p-3 rounded-xl border bg-card hover:border-primary/40 hover:shadow-soft cursor-pointer transition-all overflow-hidden shrink-0",
                  variant === 'vertical' ? "w-full" : "w-64 h-20 flex flex-col justify-center"
                )}
                onClick={() => onSelect(item)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-[11px] font-bold font-jp line-clamp-1 group-hover:text-primary transition-colors">
                      {item.content}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground font-medium italic">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <Badge variant="secondary" className="text-[8px] h-3.5 px-1 py-0 uppercase font-black bg-muted/50">
                        {item.engine || 'AI'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-lg text-destructive/50 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                    onClick={(e) => handleDelete(e, item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
