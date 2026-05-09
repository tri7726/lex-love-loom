import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Sparkles } from "lucide-react";
import { MiniQuestModal } from "@/components/practice/MiniQuestModal";
import { WeaknessPatternsPanel } from "@/components/practice/WeaknessPatternsPanel";

const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
const CATEGORIES = [
  { key: "kanji", label: "Kanji", icon: "🈁" },
  { key: "vocab", label: "Từ vựng", icon: "📝" },
  { key: "grammar", label: "Ngữ pháp", icon: "📐" },
] as const;

type Row = {
  level: string;
  category: string;
  attempted: number;
  mastered: number;
};

function colorFor(pct: number) {
  // 0% → red, 100% → green via HSL
  if (pct <= 0) return "hsl(0 0% 95%)";
  const hue = Math.round((pct / 100) * 130); // 0=red → 130=green
  return `hsl(${hue} 75% 60%)`;
}

const WeaknessHeatmap: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [questCfg, setQuestCfg] = useState<{ category: string; level: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("v_user_mastery_matrix")
        .select("*")
        .eq("user_id", user.id);
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const matrix = useMemo(() => {
    const m: Record<string, Record<string, Row>> = {};
    for (const cat of CATEGORIES) {
      m[cat.key] = {};
      for (const lv of LEVELS) {
        m[cat.key][lv] = { level: lv, category: cat.key, attempted: 0, mastered: 0 };
      }
    }
    for (const r of rows) {
      if (m[r.category]?.[r.level]) m[r.category][r.level] = r;
    }
    return m;
  }, [rows]);

  if (!user) {
    return (
      <div className="container mx-auto p-6 text-center text-muted-foreground">
        Vui lòng đăng nhập để xem bản đồ điểm yếu.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Flame className="text-sakura" /> Bản đồ điểm yếu
        </h1>
        <p className="text-muted-foreground">
          Ô càng đỏ = càng yếu. Click để mở mini-quest 5 phút nhắm thẳng vào điểm cần luyện.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Mastery Matrix · JLPT × Loại nội dung</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 18 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-2">
                <thead>
                  <tr>
                    <th className="text-left text-sm font-medium text-muted-foreground"></th>
                    {LEVELS.map((lv) => (
                      <th key={lv} className="text-sm font-semibold text-center">
                        {lv}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map((cat) => (
                    <tr key={cat.key}>
                      <td className="text-sm font-medium pr-3 whitespace-nowrap">
                        {cat.icon} {cat.label}
                      </td>
                      {LEVELS.map((lv) => {
                        const cell = matrix[cat.key][lv];
                        const pct =
                          cell.attempted > 0
                            ? Math.round((cell.mastered / cell.attempted) * 100)
                            : 0;
                        return (
                          <td key={lv}>
                            <button
                              onClick={() =>
                                setQuestCfg({ category: cat.key, level: lv })
                              }
                              className="w-full h-16 rounded-md border text-xs font-semibold transition-transform hover:scale-105 hover:shadow-md flex flex-col items-center justify-center gap-0.5"
                              style={{
                                background: colorFor(pct),
                                color: pct > 50 ? "white" : "hsl(220 10% 20%)",
                              }}
                              title={`${cell.mastered}/${cell.attempted} đã thuộc · click để luyện`}
                            >
                              <span>{pct}%</span>
                              <span className="opacity-75 font-normal">
                                {cell.mastered}/{cell.attempted || "—"}
                              </span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span>Yếu</span>
            <div
              className="h-3 w-32 rounded"
              style={{
                background:
                  "linear-gradient(to right, hsl(0 75% 60%), hsl(60 75% 60%), hsl(130 75% 60%))",
              }}
            />
            <span>Thuộc</span>
          </div>
        </CardContent>
      </Card>

      <WeaknessPatternsPanel />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="text-sakura" /> Gợi ý nhanh
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) =>
            LEVELS.map((lv) => {
              const cell = matrix[cat.key][lv];
              const pct =
                cell.attempted > 0
                  ? Math.round((cell.mastered / cell.attempted) * 100)
                  : 0;
              if (cell.attempted < 3 || pct >= 60) return null;
              return (
                <Button
                  key={`${cat.key}-${lv}`}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuestCfg({ category: cat.key, level: lv })}
                >
                  🎯 {cat.label} {lv} · {pct}%
                </Button>
              );
            }),
          )}
        </CardContent>
      </Card>

      {questCfg && (
        <MiniQuestModal
          open={!!questCfg}
          onClose={() => setQuestCfg(null)}
          category={questCfg.category}
          level={questCfg.level}
        />
      )}
    </div>
  );
};

export default WeaknessHeatmap;
