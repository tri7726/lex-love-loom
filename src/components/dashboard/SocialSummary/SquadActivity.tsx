import React from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const SquadActivity: React.FC = () => {
  return (
    <Card className="lg:col-span-2 border-2 border-primary/10 bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col transition-all hover:bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Hoạt động Squad
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="divide-y divide-border/50">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3 items-start p-4 hover:bg-muted/30 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold leading-none">N3 Warriors</p>
                <p className="text-[10px] text-muted-foreground leading-snug tracking-tight">Vũ Hải vừa cộng thêm 500 XP cho mục tiêu chung!</p>
                <p className="text-[9px] text-muted-foreground/60 uppercase">10 phút trước</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-0 border-t border-border/50">
        <Link to="/squads" className="w-full pt-4">
          <Button variant="ghost" className="w-full text-xs font-bold gap-2 hover:bg-primary/5">
            Quản lý Squad <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
