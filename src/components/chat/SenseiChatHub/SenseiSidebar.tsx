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
    const lastUpdate = c.updated_at || c.created_at || new Date().toISOString();
    const isOld = (new Date().getTime() - new Date(lastUpdate).getTime()) > 12 * 24 * 60 * 60 * 1000;

    return (
      <div
        key={c.id}
        className={cn(
          "group relative flex items-center gap-4 p-5 rounded-[2.5rem] cursor-pointer transition-all duration-500 ease-out",
          isActive 
            ? "bg-white border border-sakura/20 shadow-[0_10px_30px_rgba(255,183,197,0.15)] scale-[1.02] z-10" 
            : "bg-white/40 hover:bg-white text-slate-500 hover:text-sakura border border-transparent hover:shadow-lg"
        )}
        onClick={() => onSelect(c.id)}
      >
        <div className={cn(
          "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500",
          isActive ? "bg-sakura text-white rotate-12 shadow-inner" : "bg-sakura/5 text-sakura group-hover:bg-sakura/10"
        )}>
          <MessageSquare className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-serif font-black truncate leading-tight tracking-tight",
            isActive ? "text-slate-900" : "text-slate-600 group-hover:text-sakura"
          )}>{c.title || "Vô danh hội thoại"}</p>
          <p className="text-[10px] font-bold opacity-40 mt-1 uppercase tracking-widest">
            {(() => {
              try {
                return formatDistanceToNow(new Date(lastUpdate), { addSuffix: true, locale: vi });
              } catch (e) {
                return "vừa xong";
              }
            })()}
          </p>
        </div>
        
        <div className="hidden group-hover:flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
          <Button
            variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-sakura/10"
            onClick={(e) => { e.stopPropagation(); onPin(c.id); }}
            title={c.is_pinned ? "Bỏ ghim" : "Ghim"}
          >
            <Pin className={cn("h-3.5 w-3.5", c.is_pinned ? "fill-sakura text-sakura" : "text-sakura/40")} />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-50/50 text-red-300 hover:text-red-500"
            onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
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
    <div className="flex flex-col h-full bg-white p-7 space-y-8 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.03)] z-30">
      <div className="space-y-1 decoration-sakura/20">
        <h3 className="font-serif text-3xl font-black text-slate-800 tracking-tight">Thư viện</h3>
        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-sakura/40">Lưu ký tri thức</p>
      </div>

      <Button 
        onClick={onNew}
        className="w-full justify-center gap-4 bg-slate-900 text-white rounded-[1.5rem] shadow-xl font-black uppercase tracking-[0.2em] text-[11px] h-14 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
      >
        <Plus className="h-5 w-5" />
        Sáng khởi hội thoại
      </Button>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-sakura transition-all duration-300" />
        <Input 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm trí thức..." 
          className="pl-12 h-12 bg-cream/30 border-sakura/5 rounded-2xl text-[13px] focus-visible:ring-sakura/10 focus-visible:border-sakura/20 transition-all shadow-inner border-0"
        />
      </div>

      <ScrollArea className="flex-1 -mx-2 h-[calc(100vh-320px)]">
        <div className="px-2 space-y-10">
          {pinned.length > 0 && (
            <div className="space-y-4">
              <p className="px-4 text-[9px] font-black uppercase tracking-[0.4em] text-sakura/50">Yếu phẩm cần lưu tâm</p>
              <div className="space-y-2.5">{pinned.map(renderItem)}</div>
            </div>
          )}

          <div className="space-y-4">
             <p className="px-4 text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">Gần đây</p>
             <div className="space-y-2.5">
               {others.length > 0 ? others.map(renderItem) : (
                 <div className="px-4 py-12 text-center space-y-3 opacity-40">
                   <div className="h-px w-8 bg-slate-200 mx-auto" />
                   <p className="text-[11px] font-serif italic text-slate-400">Vạn sự khởi đầu nan</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      </ScrollArea>

      <div className="pt-4 border-t border-sakura/10 text-[9px] text-center text-sakura/40 font-black uppercase tracking-[0.3em]">
        Tự động lưu trữ sau 15 ngày
      </div>
    </div>
  );
};
