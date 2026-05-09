import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Pattern = {
  id: string;
  pattern_key: string;
  category: string;
  label: string;
  score: number;
  jlpt_level: string | null;
  evidence: unknown;
  last_seen_at: string;
};

const categoryColor: Record<string, string> = {
  kanji: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  grammar: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  vocab: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  pronunciation: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
};

export const WeaknessPatternsPanel: React.FC = () => {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("user_weakness_patterns")
      .select("*")
      .eq("user_id", user.id)
      .order("score", { ascending: false })
      .limit(5);
    setPatterns((data as Pattern[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { error } = await supabase.functions.invoke("analyze-mistakes", {
        body: {},
      });
      if (error) throw error;
      toast.success("AI đã cập nhật điểm yếu của bạn");
      await load();
    } catch (e: any) {
      toast.error("Không phân tích được: " + (e?.message ?? "lỗi"));
    } finally {
      setAnalyzing(false);
    }
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="text-sakura" /> Top 5 điểm yếu (AI phát hiện)
        </CardTitle>
        <Button size="sm" variant="outline" onClick={runAnalysis} disabled={analyzing}>
          {analyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Phân tích lại</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : patterns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có pattern nào. Bấm <strong>Phân tích lại</strong> để AI quét lỗi 30 ngày
            gần nhất.
          </p>
        ) : (
          patterns.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 p-3 rounded-md border bg-card"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={categoryColor[p.category] ?? ""} variant="secondary">
                    {p.category}
                  </Badge>
                  {p.jlpt_level && <Badge variant="outline">{p.jlpt_level}</Badge>}
                  <span className="font-medium truncate">{p.label}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {p.pattern_key}
                </span>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-sm font-bold text-sakura">
                  {Number(p.score).toFixed(1)}
                </span>
                <span className="text-[10px] text-muted-foreground">độ yếu</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default WeaknessPatternsPanel;
