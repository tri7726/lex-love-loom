import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Zap, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QueueStats {
  dueCount: number;
  weakCount: number;
  newToday: number;
}

/**
 * Widget tổng hợp các việc cần ôn hôm nay:
 * - Số thẻ SRS đến hạn
 * - Số từ yếu (correct rate thấp)
 * - Từ mới có thể học
 */
export const SmartReviewQueue: React.FC<{ className?: string }> = ({ className }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QueueStats>({ dueCount: 0, weakCount: 0, newToday: 0 });

  useEffect(() => {
    if (!user) return;
    let cancel = false;

    const load = async () => {
      setLoading(true);
      const now = new Date().toISOString();

      // SRS due
      const duePromise = supabase
        .from("user_vocabulary_progress" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .lte("next_review_date", now);

      // Weak words: correct_count < incorrect_count
      const weakPromise = supabase
        .from("user_vocabulary_progress" as any)
        .select("id, correct_count, incorrect_count" as any)
        .eq("user_id", user.id)
        .limit(1000);

      // New (no progress yet) — count flashcards user can learn
      const newPromise = supabase
        .from("flashcards" as any)
        .select("id", { count: "exact", head: true })
        .limit(1);

      const [dueRes, weakRes] = await Promise.all([duePromise, weakPromise]);
      if (cancel) return;

      const weakCount =
        (weakRes.data as any[] | null)?.filter(
          (r: any) => (r.incorrect_count ?? 0) > (r.correct_count ?? 0)
        ).length ?? 0;

      setStats({
        dueCount: dueRes.count ?? 0,
        weakCount,
        newToday: 0, // simple v1
      });
      setLoading(false);
    };

    load().catch(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [user]);

  if (!user) return null;

  const total = stats.dueCount + stats.weakCount;
  const hasWork = total > 0;

  return (
    <Card
      className={cn(
        "border-2 border-sakura/20 bg-gradient-to-br from-sakura/5 via-card/60 to-cream/30 overflow-hidden",
        className
      )}
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sakura/15 flex items-center justify-center shrink-0">
            <Brain className="h-6 w-6 text-sakura" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-sakura">
              Hàng đợi hôm nay
            </p>
            <h3 className="text-lg font-black font-display leading-tight">
              {loading ? "Đang tính..." : hasWork ? `${total} việc cần làm` : "Đã sạch hàng đợi! 🎉"}
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-sakura" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                icon={Zap}
                label="Đến hạn ôn"
                value={stats.dueCount}
                color="text-sakura"
                bg="bg-sakura/10"
              />
              <StatTile
                icon={AlertTriangle}
                label="Từ yếu"
                value={stats.weakCount}
                color="text-orange-600"
                bg="bg-orange-500/10"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                onClick={() => navigate("/srs-review")}
                disabled={stats.dueCount === 0}
                className="flex-1 bg-sakura hover:bg-sakura-dark text-white font-bold rounded-2xl h-11 gap-2 disabled:opacity-40"
              >
                Ôn ngay <ArrowRight className="h-4 w-4" />
              </Button>
              {stats.weakCount > 0 && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/weakness-heatmap")}
                  className="flex-1 rounded-2xl h-11 font-bold border-orange-500/30 text-orange-600 hover:bg-orange-500/5"
                >
                  Xem từ yếu
                </Button>
              )}
            </div>

            {!hasWork && (
              <p className="text-xs text-center text-muted-foreground">
                Hôm nay không còn thẻ đến hạn. Học từ mới để duy trì streak nhé!
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const StatTile: React.FC<{
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  bg: string;
}> = ({ icon: Icon, label, value, color, bg }) => (
  <div className={cn("rounded-2xl p-3 flex items-center gap-3", bg)}>
    <div className={cn("w-9 h-9 rounded-xl bg-card flex items-center justify-center", color)}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-black leading-tight", color)}>{value}</p>
    </div>
  </div>
);

export default SmartReviewQueue;
