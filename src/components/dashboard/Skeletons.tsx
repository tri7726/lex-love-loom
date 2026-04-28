import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/** Shimmer pulse bar */
function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

export function SkeletonHero() {
  return (
    <div className="sakura-bg rounded-[2.5rem] p-8 md:p-10 border border-sakura-light/50 shadow-card">
      <div className="space-y-6">
        <Bar className="h-8 w-64" />
        <Bar className="h-4 w-96" />
        <div className="flex gap-4 mt-4">
          {[1, 2, 3, 4, 5].map(i => <Bar key={i} className="h-3 flex-1" />)}
        </div>
      </div>
    </div>
  );
}

export function SkeletonWordOfTheDay() {
  return (
    <Card className="border-2 border-gold/20 shadow-soft">
      <CardHeader className="pb-2">
        <Bar className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <Bar className="h-10 w-32 mb-2" />
        <Bar className="h-4 w-64" />
      </CardContent>
    </Card>
  );
}

export function SkeletonCard() {
  return (
    <Card className="shadow-soft">
      <CardContent className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export function SkeletonSidebar() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map(i => (
        <Card key={i} className="shadow-soft">
          <CardHeader className="pb-2">
            <Bar className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4].map(j => <Bar key={j} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
