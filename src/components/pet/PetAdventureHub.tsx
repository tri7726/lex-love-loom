import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Compass, Clock, Shield, Coins, Star, ChevronRight, CheckCircle2, Sword, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePetAdventure } from '@/hooks/usePetAdventure';
import { PetCombatArena } from './PetCombatArena';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PetAdventureHubProps {
  pet: any;
  onClose: () => void;
}

export const PetAdventureHub: React.FC<PetAdventureHubProps> = ({ pet, onClose }) => {
  const { areas, activeExpedition, startExpedition, claimRewards, loading } = usePetAdventure();
  const [activeTab, setActiveTab] = React.useState<'expedition' | 'arena'>('expedition');
  const [monsters, setMonsters] = React.useState<any[]>([]);
  const [selectedMonster, setSelectedMonster] = React.useState<any | null>(null);

  React.useEffect(() => {
    const fetchMonsters = async () => {
      const { data } = await (supabase as any).from('pet_monsters').select('*').order('level');
      setMonsters(data || []);
    };
    fetchMonsters();
  }, []);

  const getProgress = () => {
    if (!activeExpedition) return 0;
    const start = new Date(activeExpedition.start_at).getTime();
    const end = new Date(activeExpedition.end_at).getTime();
    const now = Date.now();
    const total = end - start;
    const current = now - start;
    return Math.min(100, Math.max(0, (current / total) * 100));
  };

  const isCompleted = getProgress() === 100;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Compass className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Trung tâm Viễn chinh</h2>
            <p className="text-xs text-muted-foreground">Khám phá và chiến đấu</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2 border-b bg-white">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="expedition" className="font-bold gap-2">
              <Map className="h-4 w-4" /> Viễn chinh
            </TabsTrigger>
            <TabsTrigger value="arena" className="font-bold gap-2">
              <Sword className="h-4 w-4" /> Đấu trường
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <TabsContent value="expedition" className="m-0 space-y-4">
            {activeExpedition ? (
              <Card className="p-6 border-2 border-primary/20 bg-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Compass className="h-24 w-24" />
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className={cn("font-black", isCompleted ? "bg-green-500" : "bg-primary")}>
                      {isCompleted ? 'Hoàn thành!' : 'Đang thám hiểm...'}
                    </Badge>
                  </div>
                  <Progress value={getProgress()} className="h-3 mb-4" />
                  {isCompleted ? (
                    <Button className="w-full bg-green-500 font-black" onClick={claimRewards} disabled={loading}>
                      NHẬN THƯỞNG
                    </Button>
                  ) : (
                    <p className="text-center text-xs font-bold text-muted-foreground italic">Chờ pet quay về...</p>
                  )}
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {areas.map((area) => (
                  <Card 
                    key={area.id}
                    className="p-4 cursor-pointer hover:border-primary/50"
                    onClick={() => startExpedition(pet.id, area.id, area.stamina_cost)}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-sm">{area.name}</h3>
                      <Badge variant="outline">{area.duration_minutes}m</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="arena" className="m-0 space-y-4">
            {monsters.map((monster) => (
              <Card 
                key={monster.id}
                className="p-4 cursor-pointer hover:border-red-500"
                onClick={() => setSelectedMonster(monster)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{monster.emoji}</span>
                  <div className="flex-1">
                    <h4 className="font-black text-sm">{monster.name}</h4>
                    <p className="text-xs text-muted-foreground">LV.{monster.level}</p>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Card>
            ))}
          </TabsContent>
        </div>
      </Tabs>

      {selectedMonster && (
        <PetCombatArena 
          pet={pet}
          monster={selectedMonster}
          onClose={() => setSelectedMonster(null)}
          onWin={() => setSelectedMonster(null)}
          onLose={() => setSelectedMonster(null)}
        />
      )}
    </div>
  );
};
