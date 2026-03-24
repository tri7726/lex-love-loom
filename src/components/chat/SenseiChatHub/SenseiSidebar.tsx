import React, { useState } from 'react';
import { Plus, Search, MessageSquare, Pin, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { SenseiConversation } from './types';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface SenseiSidebarProps {
  conversations: SenseiConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SenseiSidebar: React.FC<SenseiSidebarProps> = ({
  conversations, activeId, onSelect, onNew, onPin, onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filtered = conversations.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pinned = filtered.filter(c => c.is_pinned);
  const others = filtered.filter(c => !c.is_pinned);

  const renderItem = (c: SenseiConversation) => {
    const isActive = activeId === c.id;
    const isOld = (new Date().getTime() - new Date(c.updated_at).getTime()) > 12 * 24 * 60 * 60 * 1000; // 12+ days warning

    return (
      <div
        key={c.id}
        className={cn(
          "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
          isActive ? "bg-sakura text-white shadow-md shadow-sakura/20 scale-[1.02]" : "hover:bg-sakura/5 text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onSelect(c.id)}
      >
        <MessageSquare className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-sakura/60")} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate uppercase tracking-wider">{c.title || "Hội thoại mới"}</p>
          <p className={cn("text-[9px] opacity-70", isActive ? "text-white" : "text-muted-foreground")}>
            {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true, locale: vi })}
          </p>
        </div>
        
        <div className="hidden group-hover:flex items-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-black/10"
            onClick={(e) => { e.stopPropagation(); onPin(c.id); }}
            title={c.is_pinned ? "Bỏ ghim" : "Ghim hội thoại"}
          >
            <Pin className={cn("h-3 w-3", c.is_pinned && "fill-current text-white")} />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-red-500/20 text-red-500"
            onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        
        {isOld && !c.is_pinned && !isActive && (
           <div className="absolute top-2 right-2" title="Sắp hết hạn (15 ngày)">
             <Clock className="h-2.5 w-2.5 text-amber-500 animate-pulse" />
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-r border-sakura/10 p-4 space-y-4">
      <Button 
        onClick={onNew}
        className="w-full justify-start gap-2 bg-gradient-to-r from-sakura to-pink-500 text-white rounded-2xl shadow-lg shadow-sakura/20 font-black uppercase tracking-widest text-[10px] h-11"
      >
        <Plus className="h-4 w-4" />
        Hội thoại mới
      </Button>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm..." 
          className="pl-9 h-9 bg-background/50 border-sakura/10 rounded-xl text-xs"
        />
      </div>

      <ScrollArea className="flex-1 -mx-2 h-[calc(100vh-250px)]">
        <div className="px-2 space-y-6">
          {pinned.length > 0 && (
            <div className="space-y-2">
              <p className="px-2 text-[9px] font-black uppercase tracking-[0.2em] text-sakura/60">Đã ghim ({pinned.length}/4)</p>
              <div className="space-y-1">{pinned.map(renderItem)}</div>
            </div>
          )}

          <div className="space-y-2">
             <p className="px-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Gần đây</p>
             <div className="space-y-1">
               {others.length > 0 ? others.map(renderItem) : (
                 <p className="px-2 py-4 text-[10px] text-center italic text-muted-foreground opacity-60">Chưa có hội thoại nào</p>
               )}
             </div>
          </div>
        </div>
      </ScrollArea>

      <div className="pt-4 border-t border-sakura/5 text-[9px] text-center text-muted-foreground font-medium uppercase tracking-widest opacity-60">
        Tự động dọn dẹp sau 15 ngày
      </div>
    </div>
  );
};
