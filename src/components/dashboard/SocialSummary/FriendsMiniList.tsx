import React from 'react';
import { Link } from 'react-router-dom';
import { User, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Friend {
  user_id?: string;
  display_name?: string;
  avatar_url?: string;
}

interface FriendsMiniListProps {
  friends: Friend[];
}

export const FriendsMiniList: React.FC<FriendsMiniListProps> = ({ friends }) => {
  return (
    <Card className="border-2 border-secondary/10 bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col transition-all hover:bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-secondary" />
          Bạn bè
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-6 pt-4">
        <div className="flex -space-x-3 overflow-hidden justify-center py-2">
          {(friends || []).slice(0, 5).map((f, i) => (
            <Avatar key={f.user_id ?? i} className="inline-block h-12 w-12 rounded-2xl ring-4 ring-background shadow-md">
              {f.avatar_url && <AvatarImage src={f.avatar_url} />}
              <AvatarFallback className="text-xs bg-secondary/10 text-secondary font-bold">
                {(f.display_name ?? `U${i + 1}`).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {(friends?.length ?? 0) === 0 && [1, 2, 3].map((i) => (
            <Avatar key={i} className="inline-block h-12 w-12 rounded-2xl ring-4 ring-background shadow-md">
              <AvatarFallback className="text-xs bg-secondary/10 text-secondary font-bold">?</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Bạn đang theo dõi <strong>{friends?.length ?? 0} người</strong></p>
          <p className="text-xs text-muted-foreground">Kết nối với bạn bè để cùng học!</p>
        </div>
      </CardContent>
      <CardFooter className="pt-0 border-t border-border/50">
        <Link to="/friends" className="w-full pt-4">
          <Button variant="ghost" className="w-full text-xs font-bold gap-2 hover:bg-secondary/5">
            Quản lý bạn bè <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
