import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus, MessageSquare, Search, UserMinus, Loader2, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SakuraSkeleton } from '@/components/ui/SakuraSkeleton';
import { useNavigate } from 'react-router-dom';

export const Friends = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { friends, loading, followUser, unfollowUser, isFollowing } = useFriends();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (val: string) => {
    setSearchTerm(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, jlpt_level, total_xp')
        .ilike('display_name', `%${val}%`)
        .neq('user_id', user?.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="container py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-display font-bold">Bạn bè</h1>
            <p className="text-muted-foreground">Kết nối và thi đua cùng những người học khác.</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            className="pl-12 h-14 rounded-2xl bg-card border-2 border-border/50 focus:border-primary/50 transition-all text-lg"
            placeholder="Tìm kiếm người dùng bằng tên..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {searchTerm.trim() !== '' && (
          <div className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground px-1">Kết quả tìm kiếm</h2>
            <div className="grid gap-4">
              {searching ? (
                <SakuraSkeleton variant="card" count={2} />
              ) : searchResults.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground bg-muted/20 rounded-2xl border-2 border-dashed">
                  Không tìm thấy người dùng nào khớp với "{searchTerm}"
                </p>
              ) : (
                searchResults.map((res) => (
                  <Card key={res.user_id} className="hover:shadow-elevated transition-all border-2 border-transparent hover:border-primary/20 overflow-hidden bg-white/40 backdrop-blur-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <Avatar className="h-14 w-14 border-2 border-background shadow-soft">
                          <AvatarImage src={res.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold uppercase text-xl">
                            {res.display_name?.charAt(0) || <User />}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-lg">{res.display_name || 'Người dùng'}</h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground font-bold">
                            <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded uppercase">{res.jlpt_level || 'N/A'}</span>
                            <span>•</span>
                            <span>{res.total_xp || 0} XP</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isFollowing(res.user_id) ? (
                          <Button 
                            variant="outline" 
                            className="rounded-xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => unfollowUser(res.user_id)}
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Bỏ theo dõi
                          </Button>
                        ) : (
                          <Button 
                            className="rounded-xl shadow-sakura gap-2"
                            onClick={() => followUser(res.user_id)}
                          >
                            <UserPlus className="h-4 w-4" />
                            Theo dõi
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        <div className="space-y-4 pt-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground px-1">
            Đang theo dõi ({friends.length})
          </h2>
          <div className="grid gap-4">
            {loading ? (
              <SakuraSkeleton variant="card" count={3} />
            ) : friends.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-3xl border-2 border-dashed">
                <Search className="h-10 w-10 mx-auto mb-4 opacity-20" />
                <p>Bạn chưa theo dõi ai. Hãy tìm kiếm và kết nối ngay!</p>
              </div>
            ) : (
              friends.map((friend) => (
                <Card key={friend.user_id} className="hover:shadow-elevated transition-all border-2 border-transparent hover:border-primary/20 overflow-hidden bg-white/40 backdrop-blur-sm">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-5 cursor-pointer" onClick={() => navigate(`/profile/${friend.user_id}`)}>
                      <div className="relative">
                        <Avatar className="h-16 w-16 border-2 border-background shadow-soft">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold uppercase text-2xl">
                            {friend.display_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Status indicator could go here */}
                      </div>
                      <div>
                        <h3 className="font-bold text-xl group-hover:text-primary transition-colors">{friend.display_name}</h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-black uppercase tracking-wide mt-1">
                          <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">{friend.jlpt_level || 'N/A'}</span>
                          <span>•</span>
                          <span className="text-primary">{friend.total_xp} XP</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-2xl h-12 w-12 hover:bg-sakura/10 text-sakura"
                        onClick={() => navigate('/messages')}
                      >
                        <MessageSquare className="h-5 w-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-2xl h-12 w-12 hover:bg-red-50 text-red-400 hover:text-red-500"
                        onClick={() => unfollowUser(friend.user_id)}
                      >
                        <UserMinus className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
