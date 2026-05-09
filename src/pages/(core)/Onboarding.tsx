import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import {
  ArrowRight, ArrowLeft, Sparkles, Briefcase, Plane, Tv, GraduationCap,
  Heart, MoreHorizontal, Check, Loader2,
} from "lucide-react";

type Step = 0 | 1 | 2 | 3 | 4;

const GOALS = [
  { id: "exam", label: "Thi JLPT", icon: GraduationCap, emoji: "🎓" },
  { id: "work", label: "Đi làm tại Nhật", icon: Briefcase, emoji: "💼" },
  { id: "travel", label: "Du lịch Nhật Bản", icon: Plane, emoji: "✈️" },
  { id: "anime", label: "Xem anime/đọc manga", icon: Tv, emoji: "🎬" },
  { id: "culture", label: "Yêu văn hoá Nhật", icon: Heart, emoji: "🌸" },
  { id: "other", label: "Lý do khác", icon: MoreHorizontal, emoji: "✨" },
];

const LEVELS = [
  { id: "N5", label: "N5", desc: "Mới bắt đầu, biết vài chữ Hiragana" },
  { id: "N4", label: "N4", desc: "Nói được câu đơn giản hằng ngày" },
  { id: "N3", label: "N3", desc: "Đọc hiểu báo, hội thoại trung cấp" },
  { id: "N2", label: "N2", desc: "Đọc tin tức, làm việc cơ bản" },
  { id: "N1", label: "N1", desc: "Thành thạo gần như người bản xứ" },
];

const TARGETS = ["N5", "N4", "N3", "N2", "N1"];

const MINUTES = [
  { v: 5, label: "5 phút", emoji: "🌱", desc: "Khởi động nhẹ nhàng" },
  { v: 15, label: "15 phút", emoji: "🌸", desc: "Phổ biến nhất" },
  { v: 30, label: "30 phút", emoji: "🚀", desc: "Tiến bộ nhanh" },
  { v: 60, label: "60 phút", emoji: "🔥", desc: "Cường độ cao" },
];

export const Onboarding = () => {
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [goal, setGoal] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [targetLevel, setTargetLevel] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number>(15);
  const [saving, setSaving] = useState(false);

  const next = () => setStep((s) => (Math.min(4, s + 1) as Step));
  const back = () => setStep((s) => (Math.max(0, s - 1) as Step));

  const handleFinish = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        onboarded: true,
        learning_goal: goal,
        jlpt_level: currentLevel,
        target_jlpt_level: targetLevel,
        daily_goal_minutes: minutes,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Không lưu được thiết lập", {
        description: error.message,
        action: { label: "Thử lại", onClick: handleFinish },
      });
      setSaving(false);
      return;
    }

    toast.success("Tuyệt vời! Hành trình bắt đầu 🌸");
    
    // Refresh profile state in context
    await refreshProfile();
    
    // Slight delay to ensure state update has propagated before navigation
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 500);
  };

  const canProceed =
    (step === 0) ||
    (step === 1 && !!goal) ||
    (step === 2 && !!currentLevel) ||
    (step === 3 && !!targetLevel) ||
    (step === 4 && !!minutes);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-background to-sakura/5 flex flex-col">
      {/* Progress bar */}
      <div className="w-full px-6 pt-6 pb-2">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                i <= step ? "bg-sakura" : "bg-sakura/15"
              )}
            />
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground font-bold uppercase tracking-widest mt-3">
          Bước {step + 1} / 5
        </p>
      </div>

      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              {step === 0 && <Welcome />}
              {step === 1 && <PickGoal value={goal} onChange={setGoal} />}
              {step === 2 && <PickLevel value={currentLevel} onChange={setCurrentLevel} />}
              {step === 3 && <PickTarget current={currentLevel} value={targetLevel} onChange={setTargetLevel} />}
              {step === 4 && <PickMinutes value={minutes} onChange={setMinutes} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer nav */}
      <footer className="w-full px-6 pb-8 pt-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button
              variant="ghost"
              onClick={back}
              disabled={saving}
              className="rounded-2xl font-bold gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </Button>
          ) : (
            <span />
          )}

          {step < 4 ? (
            <Button
              onClick={next}
              disabled={!canProceed}
              className="rounded-2xl bg-sakura hover:bg-sakura-dark text-white font-bold px-6 h-12 gap-2 shadow-md disabled:opacity-40"
            >
              Tiếp tục <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!canProceed || saving}
              className="rounded-2xl bg-sakura hover:bg-sakura-dark text-white font-bold px-6 h-12 gap-2 shadow-md disabled:opacity-40"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</>
              ) : (
                <>Bắt đầu học <Sparkles className="h-4 w-4" /></>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};

const Welcome: React.FC = () => (
  <div className="text-center space-y-6">
    <div className="text-7xl mb-2 animate-in zoom-in-50 duration-700">🌸</div>
    <h1 className="text-4xl md:text-5xl font-black font-display text-foreground">
      Yōkoso! Chào mừng bạn
    </h1>
    <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
      Sensei sẽ hỏi vài câu nhanh để cá nhân hoá lộ trình học tiếng Nhật phù hợp nhất với bạn.
    </p>
    <div className="text-sm text-muted-foreground/70 italic">Chỉ mất khoảng 30 giây ⏱️</div>
  </div>
);

const PickGoal: React.FC<{ value: string | null; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div className="space-y-6">
    <div className="text-center space-y-2">
      <h2 className="text-3xl font-black font-display">Bạn học tiếng Nhật để làm gì?</h2>
      <p className="text-muted-foreground">Sensei sẽ tối ưu nội dung theo mục tiêu của bạn.</p>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {GOALS.map((g) => {
        const active = value === g.id;
        return (
          <button
            key={g.id}
            onClick={() => onChange(g.id)}
            className={cn(
              "relative rounded-3xl border-2 p-5 text-left transition-all hover:shadow-md",
              active
                ? "border-sakura bg-sakura/10 shadow-md scale-[1.02]"
                : "border-border bg-card hover:border-sakura/50"
            )}
          >
            {active && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-sakura text-white flex items-center justify-center">
                <Check className="h-3.5 w-3.5" />
              </div>
            )}
            <div className="text-3xl mb-2">{g.emoji}</div>
            <p className="font-bold text-sm">{g.label}</p>
          </button>
        );
      })}
    </div>
  </div>
);

const PickLevel: React.FC<{ value: string | null; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div className="space-y-6">
    <div className="text-center space-y-2">
      <h2 className="text-3xl font-black font-display">Trình độ hiện tại?</h2>
      <p className="text-muted-foreground">Đừng lo, bạn có thể đổi sau bất cứ lúc nào.</p>
    </div>
    <div className="space-y-3">
      {LEVELS.map((l) => {
        const active = value === l.id;
        return (
          <button
            key={l.id}
            onClick={() => onChange(l.id)}
            className={cn(
              "w-full rounded-2xl border-2 p-4 flex items-center gap-4 transition-all text-left",
              active
                ? "border-sakura bg-sakura/10 shadow-md"
                : "border-border bg-card hover:border-sakura/50"
            )}
          >
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0",
                active ? "bg-sakura text-white" : "bg-sakura/10 text-sakura"
              )}
            >
              {l.label}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold">{l.label}</p>
              <p className="text-xs text-muted-foreground">{l.desc}</p>
            </div>
            {active && <Check className="h-5 w-5 text-sakura shrink-0" />}
          </button>
        );
      })}
    </div>
  </div>
);

const PickTarget: React.FC<{
  current: string | null;
  value: string | null;
  onChange: (v: string) => void;
}> = ({ current, value, onChange }) => {
  const idx = current ? TARGETS.indexOf(current) : 0;
  const valid = TARGETS.slice(idx); // Cho phép chọn trình độ hiện tại hoặc cao hơn (chỉ số mảng lớn hơn)
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black font-display">Mục tiêu của bạn?</h2>
        <p className="text-muted-foreground">Sensei sẽ vạch lộ trình tối ưu để đạt level này.</p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {TARGETS.map((t) => {
          const active = value === t;
          const disabled = !valid.includes(t);
          return (
            <button
              key={t}
              onClick={() => !disabled && onChange(t)}
              disabled={disabled}
              className={cn(
                "rounded-2xl border-2 p-4 font-black text-xl transition-all",
                active
                  ? "border-sakura bg-sakura text-white shadow-md scale-105"
                  : disabled
                  ? "border-border/40 bg-muted/30 text-muted-foreground/30 cursor-not-allowed"
                  : "border-border bg-card hover:border-sakura/50 hover:scale-105"
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-center text-muted-foreground">
        N1 là cao nhất, N5 là cơ bản nhất.
      </p>
    </div>
  );
};

const PickMinutes: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="space-y-6">
    <div className="text-center space-y-2">
      <h2 className="text-3xl font-black font-display">Học bao nhiêu mỗi ngày?</h2>
      <p className="text-muted-foreground">Đều đặn ngắn còn hơn cày 1 lần rồi bỏ.</p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {MINUTES.map((m) => {
        const active = value === m.v;
        return (
          <button
            key={m.v}
            onClick={() => onChange(m.v)}
            className={cn(
              "rounded-3xl border-2 p-6 text-center transition-all",
              active
                ? "border-sakura bg-sakura/10 shadow-md scale-[1.02]"
                : "border-border bg-card hover:border-sakura/50"
            )}
          >
            <div className="text-4xl mb-2">{m.emoji}</div>
            <p className="font-black text-lg">{m.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
          </button>
        );
      })}
    </div>
  </div>
);

export default Onboarding;
