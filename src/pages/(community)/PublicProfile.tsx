import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Trophy, Star, UserX } from "lucide-react";

type PublicProfile = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  jlpt_level: string | null;
  total_xp: number | null;
  current_streak: number | null;
  longest_streak: number | null;
  active_title: string | null;
  created_at: string;
};

const PublicProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("v_public_profile")
        .select("*")
        .eq("username", username)
        .maybeSingle();
      setProfile((data as PublicProfile) ?? null);
      setLoading(false);
      if (data) {
        document.title = `${data.display_name ?? data.username} · 🌸 Lex Love Loom`;
      }
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-3xl space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-12 text-center space-y-4">
        <UserX className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Không tìm thấy hồ sơ</h1>
        <p className="text-muted-foreground">
          Người dùng <strong>@{username}</strong> chưa bật chế độ công khai.
        </p>
        <Link to="/" className="text-sakura underline">Về trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-3xl space-y-4">
      {/* Banner */}
      <div
        className="h-40 rounded-2xl bg-gradient-to-br from-sakura/30 to-sakura/5"
        style={
          profile.banner_url
            ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover" }
            : undefined
        }
      />

      <Card className="-mt-16 relative">
        <CardHeader className="flex flex-row items-end gap-4">
          <Avatar className="h-24 w-24 border-4 border-background -mt-12">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="text-2xl">
              {(profile.display_name ?? profile.username).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate">
              {profile.display_name ?? profile.username}
            </CardTitle>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.jlpt_level && <Badge variant="outline">{profile.jlpt_level}</Badge>}
              {profile.active_title && <Badge>{profile.active_title}</Badge>}
            </div>
          </div>
        </CardHeader>
        {profile.bio && (
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={<Trophy className="text-amber-500" />} label="XP" value={profile.total_xp ?? 0} />
        <Stat icon={<Flame className="text-orange-500" />} label="Streak" value={profile.current_streak ?? 0} />
        <Stat icon={<Star className="text-sakura" />} label="Best" value={profile.longest_streak ?? 0} />
      </div>
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <Card>
    <CardContent className="p-4 text-center space-y-1">
      <div className="flex justify-center">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </CardContent>
  </Card>
);

export default PublicProfile;
