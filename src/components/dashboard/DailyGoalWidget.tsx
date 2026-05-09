import React from "react";
import { useProfile } from "@/hooks/useProfile";
import { Flame, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface DailyGoalWidgetProps {
  className?: string;
  compact?: boolean;
}

/**
 * Hiển thị tiến độ XP hôm nay so với mục tiêu hằng ngày + streak.
 * Quy đổi: 1 phút học ≈ 10 XP.
 */
export const DailyGoalWidget: React.FC<DailyGoalWidgetProps> = ({ className, compact = false }) => {
  const { profile } = useProfile();
  if (!profile) return null;

  const goalMinutes = profile.daily_goal_minutes ?? 15;
  const goalXP = goalMinutes * 10;
  const dailyXP = (profile as any).daily_xp_earned ?? 0;
  const pct = Math.min(100, Math.round((dailyXP / Math.max(1, goalXP)) * 100));
  const streak = profile.current_streak ?? 0;
  const completed = pct >= 100;

  // SVG ring math
  const size = compact ? 56 : 72;
  const stroke = compact ? 6 : 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <Link
      to="/"
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-2xl bg-card/60 hover:bg-sakura/5 transition-colors border border-border/50",
        className
      )}
      aria-label={`Hôm nay: ${dailyXP}/${goalXP} XP, streak ${streak} ngày`}
    >
      {/* Progress ring */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
            fill="none"
            opacity={0.3}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="hsl(var(--sakura))"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {completed ? (
            <Sparkles className={cn("text-sakura", compact ? "h-5 w-5" : "h-6 w-6")} />
          ) : (
            <span className={cn("font-black text-foreground", compact ? "text-xs" : "text-sm")}>
              {pct}%
            </span>
          )}
        </div>
      </div>

      {!compact && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            <Target className="h-3 w-3" /> Hôm nay
          </div>
          <p className="text-sm font-bold text-foreground leading-tight">
            {dailyXP} / {goalXP} XP
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Flame className={cn("h-3.5 w-3.5", streak > 0 ? "text-orange-500" : "text-muted-foreground/40")} />
            <span className={cn("text-xs font-bold", streak > 0 ? "text-orange-600" : "text-muted-foreground")}>
              {streak} {streak === 1 ? "ngày" : "ngày"} streak
            </span>
          </div>
        </div>
      )}
    </Link>
  );
};

export default DailyGoalWidget;
