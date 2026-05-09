import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  category: string;
  level: string;
}

interface Item {
  id: string;
  // Kanji
  character?: string;
  meaning?: string;
  onyomi?: string[];
  kunyomi?: string[];
  // Grammar
  title?: string;
  structure?: string;
  explanation?: string;
  examples?: any;
  // Vocab
  word?: string;
  reading?: string;
  example_sentence?: string;
}

export const MiniQuestModal: React.FC<Props> = ({ open, onClose, category, level }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIdx(0);
    setCorrect(0);
    setDone(false);
    setRevealed(false);
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("generate_weakness_quest", {
        p_category: category,
        p_level: level,
        p_limit: 10,
      });
      if (error) {
        toast.error("Không tạo được mini-quest: " + error.message);
        setItems([]);
      } else {
        setItems((data as Item[]) ?? []);
      }
      setLoading(false);
    })();
  }, [open, category, level]);

  const cur = items[idx];

  const grade = async (right: boolean) => {
    if (right) setCorrect((c) => c + 1);
    if (idx + 1 >= items.length) {
      setDone(true);
      // award small XP
      try {
        await (supabase as any).rpc("earn_xp", {
          p_amount: Math.max(5, correct + (right ? 1 : 0) * 2),
          p_source: "quiz",
          p_metadata: { kind: "weakness_quest", category, level },
        });
      } catch {/* ignore */}
    } else {
      setIdx((i) => i + 1);
      setRevealed(false);
    }
  };

  const renderQuestion = () => {
    if (!cur) return null;
    if (category === "kanji") {
      return (
        <div className="text-center space-y-4 py-4">
          <div className="text-7xl font-japanese">{cur.character}</div>
          {!revealed ? (
            <p className="text-muted-foreground">Bạn nhớ nghĩa & cách đọc?</p>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{cur.meaning}</p>
              {cur.onyomi?.length ? <p>音: {cur.onyomi.join(", ")}</p> : null}
              {cur.kunyomi?.length ? <p>訓: {cur.kunyomi.join(", ")}</p> : null}
            </div>
          )}
        </div>
      );
    }
    if (category === "vocab") {
      return (
        <div className="text-center space-y-3 py-4">
          <div className="text-4xl font-japanese">{cur.word}</div>
          {!revealed ? (
            <p className="text-muted-foreground">Đọc & nghĩa là gì?</p>
          ) : (
            <div className="space-y-1 text-sm">
              <p>{cur.reading}</p>
              <p className="font-semibold">{cur.meaning}</p>
              {cur.example_sentence && (
                <p className="text-muted-foreground italic">
                  {cur.example_sentence}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }
    // grammar
    return (
      <div className="space-y-3 py-2">
        <div className="text-lg font-semibold">{cur.title}</div>
        <div className="text-sm bg-muted p-2 rounded">{cur.structure}</div>
        {!revealed ? (
          <p className="text-muted-foreground text-sm">
            Bạn nhớ cách dùng ngữ pháp này?
          </p>
        ) : (
          <div className="text-sm">{cur.explanation}</div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-sakura w-5 h-5" />
            Mini-Quest · {category.toUpperCase()} {level}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Không tìm thấy nội dung phù hợp ở cấp {level}. Hãy học thêm trước nhé!
          </div>
        ) : done ? (
          <div className="text-center py-6 space-y-4">
            <div className="text-5xl">🎉</div>
            <h3 className="text-2xl font-bold">
              {correct}/{items.length} đúng
            </h3>
            <p className="text-muted-foreground">
              Đã ghi nhận. Tiếp tục luyện để tô xanh ô này nhé!
            </p>
            <Button onClick={onClose} className="bg-sakura hover:bg-sakura/90">
              Đóng
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Câu {idx + 1}/{items.length}
                </span>
                <span>Đúng: {correct}</span>
              </div>
              <Progress value={((idx + (revealed ? 1 : 0)) / items.length) * 100} />
            </div>

            {renderQuestion()}

            <div className="flex gap-2 justify-end">
              {!revealed ? (
                <Button onClick={() => setRevealed(true)} variant="outline">
                  Hiện đáp án <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => grade(false)}>
                    <X className="w-4 h-4 mr-1" /> Sai
                  </Button>
                  <Button onClick={() => grade(true)} className="bg-sakura hover:bg-sakura/90">
                    <Check className="w-4 h-4 mr-1" /> Đúng
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MiniQuestModal;
