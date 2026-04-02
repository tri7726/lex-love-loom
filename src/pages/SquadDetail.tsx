import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MessageSquare, 
  Trophy, 
  Target, 
  Send, 
  ArrowLeft,
  Loader2,
  Sparkles,
  Shield,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface SquadMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface SquadGoal {
  id: string;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  reward_xp: number;
  status: 'active' | 'completed' | 'expired';
}

interface SquadMember {
  user_id: string;
  role: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
    total_xp: number;
  };
}

const SquadDetail = () => {
  const { squadId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [squad, setSquad] = useState<any>(null);
  const [messages, setMessages] = useState<SquadMessage[]>([]);
  const [goals, setGoals] = useState<SquadGoal[]>([]);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchSquadData = useCallback(async () => {
    if (!squadId) return;
    try {
      const { data: squadData, error: squadError } = await (supabase as any)
        .from('study_squads')
        .select('*')
        .eq('id', squadId)
        .single();
      
      if (squadError) throw squadError;
      setSquad(squadData);

      const { data: membersData } = await (supabase as any)
        .from('squad_members')
        .select('*, profiles(display_name, avatar_url, total_xp)')
        .eq('squad_id', squadId);
      setMembers(membersData || []);

      const { data: goalsData } = await (supabase as any)
        .from('squad_goals')
        .select('*')
        .eq('squad_id', squadId)
        .order('created_at', { ascending: false });
      setGoals(goalsData || []);

      const { data: msgData } = await (supabase as any)
        .from('squad_messages')
        .select('*, profiles(display_name, avatar_url)')
        .eq('squad_id', squadId)
        .order('created_at', { ascending: true })
        .limit(50);
      setMessages(msgData || []);

    } catch (err: any) {
      console.error('Error fetching squad detail:', err);
      toast({ title: 'Lỗi tải dữ liệu', description: err.message, variant: 'destructive' });
      navigate('/squads');
    } finally {
      setLoading(false);
    }
  }, [squadId, toast, navigate]);

  useEffect(() => {
    fetchSquadData();

    // Setup Realtime for messages
    const channel = supabase
      .channel(`squad_messages:${squadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'squad_messages',
          filter: `squad_id=eq.${squadId}`
        },
        async (payload) => {
          // Fetch profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', payload.new.user_id)
            .single();

          const newMessage: SquadMessage = {
            ...(payload.new as any),
            profiles: profile
          };
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [squadId, fetchSquadData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !squadId) return;

    setSending(true);
    try {
      const { error } = await (supabase as any)
        .from('squad_messages')
        .insert({
          squad_id: squadId,
          user_id: user.id,
          content: newMessage.trim()
        });
      
      if (error) throw error;
      setNewMessage('');
    } catch (err: any) {
      toast({ title: 'Lỗi gửi tin nhắn', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="container py-6 lg:py-10 space-y-8">
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/squads')}>
          <ArrowLeft className="h-4 w-4" /> Quay lại Biệt đội
        </Button>

        <section className="flex flex-col lg:flex-row gap-8">
          {/* Main Content Area */}
          <div className="lg:w-2/3 space-y-6">
            <header className="flex items-center gap-4 bg-card/40 backdrop-blur-sm p-6 rounded-[2rem] border-2 border-border shadow-soft">
               <Avatar className="h-20 w-20 rounded-2xl border-4 border-white shadow-sakura">
                <AvatarImage src={squad?.avatar_url} />
                <AvatarFallback><Users className="h-10 w-10" /></AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h1 className="text-3xl font-display font-black text-primary">{squad?.name}</h1>
                <p className="text-muted-foreground">{squad?.description || 'Cùng nhau học tập và thăng hạng!'}</p>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="bg-sakura/10 text-sakura border-0">{members.length} thành viên</Badge>
                  <Badge variant="outline" className="text-indigo-400 border-indigo-400/20 bg-indigo-400/5">ID: {squadId?.slice(0, 8)}</Badge>
                </div>
              </div>
            </header>

            {/* Missions Section */}
            <Card className="rounded-[2.5rem] border-2 border-border/40 overflow-hidden shadow-card">
              <CardHeader className="bg-primary/5 pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Target className="h-5 w-5 text-primary" /> Nhiệm vụ Biệt đội
                </CardTitle>
                <CardDescription>Bá đạo cùng đồng đội để nhận thưởng</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {goals.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    Hiện không có nhiệm vụ nào kích hoạt.
                  </div>
                ) : (
                  goals.map(goal => (
                    <div key={goal.id} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <p className="font-black text-foreground text-sm uppercase tracking-tight">{goal.title}</p>
                          <p className="text-xs text-muted-foreground">{goal.description}</p>
                        </div>
                        <Badge className="bg-sakura text-white border-0 font-bold">+{goal.reward_xp} XP</Badge>
                      </div>
                      <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (goal.current_value / goal.target_value) * 100)}%` }}
                          className={`h-full ${goal.status === 'completed' ? 'bg-green-500' : 'bg-primary shadow-glow'}`}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-muted-foreground">Tiến độ: {goal.current_value}/{goal.target_value}</span>
                        <span className={goal.status === 'completed' ? 'text-green-500' : 'text-primary'}>
                          {goal.status === 'completed' ? 'Đã hoàn thành' : `${Math.round((goal.current_value / goal.target_value) * 100)}%`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Chat Box */}
            <Card className="rounded-[2.5rem] border-2 border-border/40 overflow-hidden shadow-card flex flex-col h-[500px]">
               <CardHeader className="bg-indigo-50/50 border-b py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-indigo-500" /> Squad Chat
                </CardTitle>
              </CardHeader>
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {messages.map((msg, i) => {
                    const isOwn = msg.user_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="h-8 w-8 rounded-full">
                          <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                          <AvatarFallback>{msg.profiles?.display_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className={`space-y-1 max-w-[70%] ${isOwn ? 'items-end' : ''}`}>
                           <p className="text-[10px] font-bold text-muted-foreground px-1">
                              {!isOwn && msg.profiles?.display_name}
                              <span className="ml-2 font-normal">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: vi })}</span>
                           </p>
                           <div className={`px-4 py-2 rounded-2xl text-sm ${isOwn ? 'bg-primary text-white rounded-tr-none' : 'bg-slate-50 text-foreground rounded-tl-none border border-slate-100'}`}>
                             {msg.content}
                           </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
              <div className="p-4 border-t">
                 <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input 
                      placeholder="Gửi tin nhắn cho biệt đội..." 
                      className="rounded-xl bg-slate-50 border-0 focus:ring-primary/20"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <Button type="submit" disabled={sending || !newMessage.trim()} className="rounded-xl shadow-sakura">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                 </form>
              </div>
            </Card>
          </div>

          {/* Sidebar Area */}
          <div className="lg:w-1/3 space-y-6">
            <Card className="rounded-[2rem] shadow-sakura border-0 bg-primary text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Trophy className="h-32 w-32" />
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   <Shield className="h-5 w-5" /> Đóng góp tuần
                </CardTitle>
                <CardDescription className="text-white/70">Top thành viên hăng hái nhất</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 {members.sort((a,b) => (b.profiles?.total_xp || 0) - (a.profiles?.total_xp || 0)).map((member, i) => (
                   <div key={member.user_id} className="flex items-center justify-between p-3 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-bold opacity-50 w-4">{i + 1}</span>
                        <Avatar className="h-8 w-8">
                           <AvatarImage src={member.profiles?.avatar_url || undefined} />
                           <AvatarFallback>{member.profiles?.display_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className={`text-sm font-bold ${member.user_id === user?.id ? 'text-sakura' : ''}`}>
                            {member.profiles?.display_name || 'Người học'}
                          </p>
                          <p className="text-[10px] text-white/60 uppercase">{member.role === 'owner' ? 'Đội trưởng' : 'Chiến binh'}</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-white/90">+{member.profiles?.total_xp} XP</span>
                   </div>
                 ))}
                 <Separator className="bg-white/10" />
                 <div className="pt-2">
                    <p className="text-center text-xs opacity-70">Cùng nhau thăng hạng Biệt đội!</p>
                 </div>
              </CardContent>
            </Card>

            <Button 
                variant="outline" 
                className="w-full rounded-xl gap-2 h-12"
                onClick={() => navigate('/community/ranking')}
              >
              <ExternalLink className="h-4 w-4" /> Xem bảng xếp hạng toàn cầu
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SquadDetail;
