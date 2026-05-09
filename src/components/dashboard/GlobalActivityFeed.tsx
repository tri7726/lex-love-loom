import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, 
  Award, 
  Flame, 
  BookOpen, 
  Zap, 
  User, 
  Sparkles,
  ChevronRight,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  user_id: string;
  type: string;
  content: {
    title: string;
    description?: string;
    value?: string;
    link?: string;
  };
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
  };
}

export const GlobalActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('user_activities')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        // Manual join với profiles (không có FK trực tiếp)
        const userIds = Array.from(new Set((data || []).map((a: any) => a.user_id).filter(Boolean)));
        let profileMap: Record<string, { display_name: string; avatar_url: string }> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await (supabase as any)
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', userIds);
          (profiles || []).forEach((p: any) => {
            profileMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
          });
        }

        const enriched = (data || []).map((a: any) => ({
          ...a,
          profiles: profileMap[a.user_id],
        }));
        setActivities(enriched as any);
      } catch (err) {
        console.error('Error fetching activities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    const channel = supabase
      .channel('global-activities')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_activities' }, 
        () => fetchActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'achievement_unlocked': return <Award className="h-4 w-4 text-gold" />;
      case 'streak_milestone': return <Flame className="h-4 w-4 text-orange-500" />;
      case 'exam_completed': return <Zap className="h-4 w-4 text-sakura" />;
      case 'pet_evolved': return <Sparkles className="h-4 w-4 text-accent" />;
      default: return <BookOpen className="h-4 w-4 text-indigo-jp" />;
    }
  };

  if (loading && activities.length === 0) {
    return (
      <Card className="rounded-[2.5rem] border-2 border-sakura-light/30 shadow-card bg-white/50 backdrop-blur-sm h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sakura opacity-30" />
      </Card>
    );
  }

  return (
    <Card className="rounded-[2.5rem] border-2 border-sakura-light/20 shadow-card bg-white/80 backdrop-blur-md overflow-hidden">
      <CardHeader className="p-8 pb-4 bg-sakura-light/10 border-b border-sakura-light/10">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-display font-black text-sumi">
            <History className="h-6 w-6 text-sakura" /> Nhật ký học tập
          </div>
          <Badge variant="outline" className="bg-sakura/10 text-sakura border-sakura/20 animate-pulse font-black text-[10px] uppercase tracking-widest">
            Live 🔴
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          <AnimatePresence initial={false}>
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "p-6 flex gap-4 hover:bg-sakura-light/5 transition-colors group relative",
                    index !== activities.length - 1 && "border-b border-sakura-light/5"
                  )}
                >
                  <Link to={`/profile/${activity.user_id}`} className="shrink-0">
                    <Avatar className="h-12 w-12 rounded-2xl border-2 border-white shadow-soft transition-transform group-hover:scale-110">
                      <AvatarImage src={activity.profiles?.avatar_url} />
                      <AvatarFallback className="bg-sakura-light text-sakura">
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Link to={`/profile/${activity.user_id}`} className="font-bold text-sumi hover:text-sakura transition-colors">
                        {activity.profiles?.display_name || 'Người dùng'}
                      </Link>
                      <span className="text-[10px] font-medium text-muted-foreground opacity-60">
                        {new Date(activity.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <div className="mt-1 shrink-0 p-1 rounded-lg bg-white shadow-soft">
                        {getActivityIcon(activity.type)}
                      </div>
                      <p className="text-sm text-sumi/80 leading-snug">
                        <span className="text-sumi font-bold">{activity.content.title}</span>
                        {activity.content.description && <span className="block text-xs mt-0.5 opacity-70 font-medium">{activity.content.description}</span>}
                      </p>
                    </div>
                  </div>

                  <Link to={`/profile/${activity.user_id}`} className="opacity-0 group-hover:opacity-100 transition-opacity self-center pr-2">
                    <Button size="icon" variant="ghost" className="rounded-full h-8 w-8 hover:bg-sakura-light text-sakura">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </motion.div>
              ))
            ) : (
              <div className="py-20 text-center space-y-4 opacity-40">
                <History className="h-12 w-12 mx-auto text-sakura" />
                <p className="font-medium text-sumi">Chưa có hoạt động nào từ cộng đồng.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
        <div className="p-4 bg-sakura-light/5 text-center border-t border-sakura-light/10">
          <Button variant="ghost" size="sm" className="text-xs font-black text-sakura hover:bg-sakura-light/20 gap-2 uppercase tracking-widest">
            Khám phá cộng đồng <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GlobalActivityFeed;
