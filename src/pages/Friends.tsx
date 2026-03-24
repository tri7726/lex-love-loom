import React from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus, MessageSquare, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export const Friends = () => {
  const mockFriends = [
    { id: 1, name: 'Vũ Hải', level: 'N3', xp: 4500, status: 'online' },
    { id: 2, name: 'Thùy Dương', level: 'N2', xp: 8200, status: 'offline' },
    { id: 3, name: 'Minh Nhật', level: 'N4', xp: 2100, status: 'online' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <main className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold">Bạn bè</h1>
          <Button className="gap-2 rounded-full">
            <UserPlus className="h-4 w-4" />
            Thêm bạn
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 rounded-xl" placeholder="Tìm kiếm bạn bè..." />
        </div>

        <div className="grid gap-4">
          {mockFriends.map((friend) => (
            <Card key={friend.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {friend.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {friend.status === 'online' && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold">{friend.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Level: {friend.level}</span>
                      <span>•</span>
                      <span>{friend.xp} XP</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="rounded-full">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};
