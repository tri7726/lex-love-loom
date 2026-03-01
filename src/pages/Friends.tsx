import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  UserPlus, 
  UserMinus, 
  Search, 
  User, 
  Star, 
  Zap, 
  MessageSquare, 
  Sword,
  MoreHorizontal,
  Filter,
  Check,
  TrendingUp
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const MOCK_FRIENDS = [
  { id: '1', name: 'Vũ Hải', level: 'N3', xp: 4500, avatar: '', status: 'online' },
  { id: '2', name: 'Thùy Dương', level: 'N2', xp: 8200, avatar: '', status: 'offline' },
  { id: '3', name: 'Hồng Anh', level: 'N4', xp: 2100, avatar: '', status: 'online' },
];

const SUGGESTED_USERS = [
  { id: '4', name: 'Hoàng Long', level: 'N3', mutualFriends: 3, avatar: '' },
  { id: '5', name: 'Yuki Morimoto', level: 'N1', mutualFriends: 1, avatar: '' },
];

const FRIEND_REQUESTS = [
  { id: 'req1', name: 'Bảo Trân', level: 'N2', avatar: '', mutualFriends: 5 },
  { id: 'req2', name: 'Minh Đức', level: 'N3', avatar: '', mutualFriends: 2 },
];

const ACTIVITIES = [
  { id: 'a1', user: 'Vũ Hải', action: 'vừa hoàn thành bài học', target: 'Từ vựng N3 - Bài 5', time: '10 phút trước', icon: '📚' },
  { id: 'a2', user: 'Thùy Dương', action: 'đạt chuỗi học tập', target: '30 ngày liên tục!', time: '1 giờ trước', icon: '🔥' },
  { id: 'a3', user: 'Hồng Anh', action: 'vượt qua bài kiểm tra', target: 'JLPT N4 Mock', time: '3 giờ trước', icon: '🎯' },
];

export const Friends = () => {
  const [search, setSearch] = useState('');
  const [followedIds, setFollowedIds] = useState<string[]>(['1', '2', '3']);

  const toggleFollow = (id: string) => {
    if (followedIds.includes(id)) {
      setFollowedIds(followedIds.filter(fid => fid !== id));
    } else {
      setFollowedIds([...followedIds, id]);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      <main className="container py-10 space-y-10">
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <Badge variant="outline" className="text-secondary border-secondary/20 bg-secondary/5 font-bold">
                Social Network
              </Badge>
              <h1 className="text-4xl font-display font-bold">Kết nối bạn bè</h1>
              <p className="text-muted-foreground">
                Tìm kiếm và theo dõi những người cùng đam mê để cùng nhau tiến bộ.
              </p>
            </div>
          </div>
          
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm kiếm bạn bè qua tên hiển thị..." 
              className="pl-9 h-12 bg-card border-2 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Bạn bè của tôi
                </h2>
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  {followedIds.length} người
                </Badge>
              </div>

              <div className="grid gap-4">
                {MOCK_FRIENDS.filter(f => followedIds.includes(f.id)).map((friend) => (
                  <motion.div key={friend.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card className="hover:shadow-soft transition-all border-border bg-card/60 backdrop-blur-sm group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                              <AvatarImage src={friend.avatar} />
                              <AvatarFallback><User /></AvatarFallback>
                            </Avatar>
                            <div className={cn(
                              "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background shadow-xs",
                              friend.status === 'online' ? "bg-green-500" : "bg-slate-400"
                            )} />
                          </div>
                          <div>
                            <Link to={`/profile/${friend.id}`} className="font-bold hover:text-primary transition-colors text-lg">
                              {friend.name}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className="bg-primary/10 text-primary text-[10px] px-1.5 py-0 border-0">
                                {friend.level}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Zap className="h-3 w-3" /> {friend.xp} XP
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link to="/challenges">
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-secondary/20 text-secondary">
                              <Sword className="h-5 w-5" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="rounded-xl">
                            <MessageSquare className="h-5 w-5 text-muted-foreground" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => toggleFollow(friend.id)}
                            className="rounded-xl text-destructive hover:bg-destructive/10"
                          >
                            <UserMinus className="h-5 w-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Friend Requests */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 px-1">
                <UserPlus className="h-5 w-5 text-sakura" /> Lời mời kết bạn
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {FRIEND_REQUESTS.map((req) => (
                  <Card key={req.id} className="border-border bg-card/40 backdrop-blur-sm overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{req.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold">{req.name}</p>
                          <p className="text-[10px] text-muted-foreground">{req.mutualFriends} bạn chung</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-8 w-8 rounded-lg bg-sakura hover:opacity-90 p-0">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-bold px-1">Gợi ý kết bạn</h2>
              <div className="space-y-3">
                {SUGGESTED_USERS.map((user) => (
                  <Card key={user.id} className="border-border bg-card/40 backdrop-blur-sm overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback><User /></AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold leading-none">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {user.level} • {user.mutualFriends} bạn chung
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant={followedIds.includes(user.id) ? "secondary" : "default"}
                        className="h-8 rounded-lg"
                        onClick={() => toggleFollow(user.id)}
                      >
                        {followedIds.includes(user.id) ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-bold px-1 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Hoạt động gần đây
              </h2>
              <div className="space-y-4 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                {ACTIVITIES.map((act) => (
                  <div key={act.id} className="relative pl-12">
                    <div className="absolute left-0 top-0 h-10 w-10 rounded-full bg-background border-2 border-muted flex items-center justify-center text-lg z-10 shadow-sm">
                      {act.icon}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold">
                        <span className="text-primary">{act.user}</span> {act.action}
                      </p>
                      <p className="text-[10px] font-black uppercase text-sakura">{act.target}</p>
                      <p className="text-[9px] text-muted-foreground font-medium">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Card className="bg-primary/5 border-2 border-primary/20 border-dashed rounded-2xl">
              <CardContent className="p-6 text-center space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold">Mời bạn bè</h3>
                  <p className="text-xs text-muted-foreground">
                    Chia sẻ link giới thiệu và nhận ngay 500 XP cho mỗi người tham gia!
                  </p>
                </div>
                <Button variant="outline" className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/5">
                  Sao chép liên kết
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
};
