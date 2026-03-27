import React, { useState, useEffect, useCallback } from 'react';
import { History, Search, RefreshCw, Layers, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface AnalysisItem {
  id: string;
  content: string;
  analysis: unknown;
  created_at: string;
  engine: string;
}

interface AnalysisHistoryProps {
  onSelect: (item: AnalysisItem) => void;
  maxItems?: number;
}

export const AnalysisHistory = ({ onSelect, maxItems = 12 }: AnalysisHistoryProps) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      setLoading(false);
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

  const filteredHistory = history.filter(item => 
    (item.content || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full max-h-[600px] gap-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Bài đã lưu</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchHistory} className="h-7 w-7 rounded-full hover:bg-muted/50 transition-colors">
          <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input 
          placeholder="Tìm kiếm nội dung..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 pl-8 text-[11px] bg-sakura/5 border-sakura/10 focus-visible:ring-sakura/30 rounded-lg font-medium"
        />
      </div>

      <ScrollArea className="flex-1 -mx-1 pr-3 scrollbar-hide">
        <div className="space-y-2 pb-2">
          {loading && history.length === 0 ? (
            Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))
          ) : filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="w-full text-left p-3 rounded-xl border border-sakura/5 bg-white/50 dark:bg-slate-800/50 hover:border-sakura/30 hover:bg-sakura/5 transition-all group relative overflow-hidden active:scale-[0.98]"
              >
                <div className="space-y-1.5 relative z-10">
                  <p className="text-xs font-jp font-bold line-clamp-2 group-hover:text-sakura transition-colors">
                    {item.content}
                  </p>
                  <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                    <span>{format(new Date(item.created_at), 'd/MM/yyyy')}</span>
                    <span className="uppercase text-sakura opacity-70 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <Layers className="h-2.5 w-2.5" /> {item.engine}
                    </span>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">
                {searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có dữ liệu'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
