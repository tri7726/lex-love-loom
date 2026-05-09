import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Sparkles, Globe2 } from "lucide-react";
import { toast } from "sonner";

type Match = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  jlpt_level: string | null;
  learning_goal: string | null;
  daily_minutes_target: number | null;
  timezone: string | null;
  current_streak: number | null;
  total_xp: number | null;
  match_score: number;
};

const StudyBuddy: React.FC = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: myProfile }, { data: matchData }] = await Promise.all([
      (supabase as any)
        .from("profiles")
        .select("user_id,looking_for_buddy,learning_goal,daily_minutes_target,timezone,jlpt_level")
        .eq("user_id", user.id)
        .maybeSingle(),
      (supabase as any).rpc("find_buddy_matches", { _limit: 12 }),
    ]);
    setMe(myProfile ?? {});
    setMatches((matchData as Match[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const updateMe = async (patch: Record<string, any>) => {
    if (!user) return;
    setSavingProfile(true);
    const next = { ...me, ...patch };
    setMe(next);
    const { error } = await (supabase as any)
      .from("profiles")
      .update(patch)
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) toast.error("Lưu thất bại");
    else {
      toast.success("Đã cập nhật");
      loadAll();
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-12 text-center text-muted-foreground">
        Đăng nhập để tìm bạn học.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="text-sakura" /> Study Buddy
        </h1>
        <p className="text-muted-foreground">
          Ghép cặp với người cùng JLPT, mục tiêu và lịch học.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe2 className="text-sakura h-4 w-4" /> Thông tin tìm bạn
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-md border">
            <div>
              <Label className="font-semibold">Cho phép ghép cặp</Label>
              <p className="text-xs text-muted-foreground">Hồ sơ của bạn xuất hiện cho người khác.</p>
            </div>
            <Switch
              checked={!!me?.looking_for_buddy}
              onCheckedChange={(v) => updateMe({ looking_for_buddy: v })}
              disabled={savingProfile}
            />
          </div>
          <div className="space-y-2">
            <Label>Mục tiêu học</Label>
            <Input
              placeholder="vd: thi N3 trong 6 tháng"
              defaultValue={me?.learning_goal ?? ""}
              onBlur={(e) =>
                e.target.value !== (me?.learning_goal ?? "") &&
                updateMe({ learning_goal: e.target.value.trim() || null })
              }
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label>Phút học mỗi ngày</Label>
            <Input
              type="number"
              min={5}
              max={600}
              defaultValue={me?.daily_minutes_target ?? ""}
              onBlur={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                if (v !== me?.daily_minutes_target) updateMe({ daily_minutes_target: v });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Múi giờ</Label>
            <Input
              placeholder="Asia/Ho_Chi_Minh"
              defaultValue={me?.timezone ?? ""}
              onBlur={(e) =>
                e.target.value !== (me?.timezone ?? "") &&
                updateMe({ timezone: e.target.value.trim() || null })
              }
              maxLength={64}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="text-sakura h-4 w-4" /> Gợi ý ({matches.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : matches.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-2 text-center py-6">
              Chưa có ai phù hợp. Bật "Cho phép ghép cặp" và mời bạn bè cùng dùng app nhé.
            </p>
          ) : (
            matches.map((m) => (
              <div key={m.user_id} className="p-4 rounded-md border bg-card flex gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={m.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(m.display_name ?? m.username ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold truncate">
                      {m.display_name ?? m.username ?? "User"}
                    </p>
                    <Badge variant="outline">★ {Number(m.match_score).toFixed(0)}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {m.jlpt_level && <Badge variant="secondary">{m.jlpt_level}</Badge>}
                    {m.timezone && (
                      <Badge variant="secondary" className="text-[10px]">{m.timezone}</Badge>
                    )}
                    {m.daily_minutes_target && (
                      <Badge variant="secondary" className="text-[10px]">
                        {m.daily_minutes_target} phút/ngày
                      </Badge>
                    )}
                  </div>
                  {m.learning_goal && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{m.learning_goal}</p>
                  )}
                  {m.username && (
                    <Button asChild size="sm" variant="outline" className="mt-2 h-7">
                      <Link to={`/u/${m.username}`}>Xem hồ sơ</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudyBuddy;
