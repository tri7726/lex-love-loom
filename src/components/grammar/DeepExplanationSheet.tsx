import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, CheckCircle2, Info, TreePine, Lightbulb, AlertTriangle } from "lucide-react";
import { DeepExplainResult } from "@/services/groqServices";
import { motion, AnimatePresence } from "framer-motion";

interface DeepExplanationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  result: DeepExplainResult | null;
  isLoading: boolean;
  title: string;
  streamingContent?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const stepVariants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0 },
};

const InkLoading = () => (
  <div className="flex flex-col items-center py-20 gap-6 select-none">
    {/* Washi paper canvas */}
    <div className="relative w-40 h-40 rounded-full bg-white/60 backdrop-blur-sm border border-sakura/10 shadow-lg overflow-hidden">
      {/* Subtle paper texture */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 3px),
            repeating-linear-gradient(90deg, transparent, transparent 3px, #000 3px, #000 4px)
          `,
        }}
      />

      {/* Ink drops spreading */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {/* Ripple rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-sumi/10 animate-ink-ripple" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-sumi/10 animate-ink-ripple-delayed" />

        {/* Main ink blob */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-[60%_40%_50%_50%] bg-sumi/20 blur-sm animate-ink-spread" />
          <div className="absolute inset-2 rounded-[40%_60%_45%_55%] bg-sumi/15 blur-sm animate-ink-spread-delayed" />
          {/* Center ink dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-sumi/30 animate-ink-pulse-slow" />
        </div>
      </div>
    </div>

    {/* Text */}
    <div className="text-center space-y-1.5">
      <p className="font-bold text-sumi/80 animate-ink-pulse-slow">Sensei đang suy luận...</p>
      <p className="text-sm text-sumi/40 max-w-xs mx-auto leading-relaxed">
        Mực đang loang trên giấy washi — AI đang viết từng bước suy luận.
      </p>
    </div>
  </div>
);

export const DeepExplanationSheet: React.FC<DeepExplanationSheetProps> = ({
  isOpen,
  onClose,
  result,
  isLoading,
  title,
  streamingContent
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl overflow-y-auto bg-white/70 backdrop-blur-2xl border-l border-sakura/20 shadow-elevated">
        {/* Decorative top-right sakura accent */}
        <div className="absolute -top-8 -right-8 w-40 h-40 pointer-events-none overflow-hidden opacity-[0.06]">
          <svg viewBox="0 0 100 100" className="w-full h-full text-sakura" fill="currentColor">
            <path d="M50 5 C55 20, 70 25, 75 35 C80 45, 70 55, 60 50 C65 60, 70 75, 60 85 C50 95, 40 80, 45 65 C40 75, 25 80, 15 70 C5 60, 15 45, 30 45 C20 40, 15 25, 25 15 C35 5, 45 20, 50 5Z" />
          </svg>
        </div>

        <SheetHeader className="pb-6 border-b border-sumi/5 mb-1">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-sakura/15 to-sakura/5 flex items-center justify-center ring-1 ring-sakura/20">
              <Brain className="h-3.5 w-3.5 text-sakura" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sumi/40">
              Reasoning Sensei
            </span>
          </div>
          <SheetTitle className="text-2xl font-display font-black text-sumi leading-tight">
            Giải thích sâu về <span className="text-sakura">{title}</span>
          </SheetTitle>
          <SheetDescription className="font-medium text-sumi/45 text-sm mt-1.5">
            Phân tích chi tiết cấu trúc và cách dùng theo tư duy logic.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-8">
          {isLoading ? (
            <AnimatePresence mode="wait">
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                {streamingContent ? (
                  <div className="w-full space-y-3">
                    <div className="flex items-center gap-2 text-sakura mb-3">
                      <div className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sakura/40" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sakura" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-sumi/40">
                        Sensei đang suy luận...
                      </span>
                    </div>
                    {/* Streaming glass card */}
                    <div className="p-5 bg-white/70 backdrop-blur-md rounded-2xl border border-sakura/10 max-h-80 overflow-y-auto shadow-sm">
                      <pre className="text-sm text-sumi/70 whitespace-pre-wrap font-sans leading-relaxed">
                        {streamingContent}
                        <span className="inline-block h-4 w-[3px] bg-sakura ml-0.5 rounded-sm animate-pulse" />
                      </pre>
                    </div>
                  </div>
                ) : (
                  <InkLoading />
                )}
              </motion.div>
            </AnimatePresence>
          ) : result ? (
            <motion.div
              className="space-y-10"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              key="result"
            >
              {/* Reasoning Steps — Stepped Journey */}
              <div className="space-y-1">
                <h3 className="text-xs font-black text-sumi/35 uppercase tracking-[0.2em] flex items-center gap-2 mb-7">
                  <Sparkles className="h-3.5 w-3.5 text-sakura" />
                  Các bước suy luận
                </h3>
                <div className="relative">
                  {/* Vertical dotted connector line */}
                  <div className="absolute left-[19px] top-2 bottom-2 w-px">
                    <svg width="2" height="100%" className="text-sumi/15 h-full" fill="none" viewBox="0 0 2 200" preserveAspectRatio="none">
                      <line x1="1" y1="0" x2="1" y2="200" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 5" />
                    </svg>
                  </div>

                  <div className="space-y-7">
                    {result.reasoning_steps.map((step, idx) => (
                        <motion.div
                          key={idx}
                          variants={stepVariants}
                          className="relative pl-14"
                        >
                          {/* Timeline number — cleaner circle */}
                          <div className="absolute left-0 top-1.5 h-10 w-10 rounded-full bg-white border-2 border-sakura/15 flex items-center justify-center shadow-sm z-10 transition-colors group-hover:border-sakura/30">
                            <span className="text-sakura font-black text-sm">{step.step}</span>
                          </div>

                          {/* Step card — upgraded glassmorphism */}
                          <div className="p-5 bg-white/70 backdrop-blur-md rounded-2xl border border-sakura/[0.08] shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                            {/* Subtle glow on hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-sakura/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            {/* Corner accent */}
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-sakura/[0.04] to-transparent rounded-bl-full" />

                            <div className="space-y-2.5 relative z-10">
                              <h4 className="font-bold text-sumi flex items-center gap-2 text-base">
                                {step.title}
                              </h4>
                              <p className="text-sm text-sumi/60 leading-relaxed">
                                {step.explanation}
                              </p>
                              {step.example && (
                                <div className="mt-3 p-3.5 bg-sakura/[0.04] rounded-xl border border-sakura/10">
                                  <code className="text-sakura font-jp font-bold text-base leading-relaxed">{step.example}</code>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conclusion — sakura gradient with glass overlay */}
              <motion.div
                variants={stepVariants}
                className="relative overflow-hidden rounded-3xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-sakura to-rose-500 shadow-xl shadow-sakura/20" />
                <div className="relative p-7 backdrop-blur-[1px]">
                  {/* Decorative circles */}
                  <div className="absolute top-0 right-0 w-36 h-36 bg-white/[0.06] rounded-bl-full" />
                  <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/[0.04] rounded-tr-full" />

                  <div className="relative z-10">
                    <h3 className="text-xs font-black text-white/70 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Kết luận & Ghi nhớ
                    </h3>
                    <p className="text-lg font-bold leading-relaxed text-white">
                      {result.conclusion}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Mnemonics — glass card */}
              {result.mnemonics && (
                <motion.div
                  variants={stepVariants}
                  className="p-5 bg-white/70 backdrop-blur-md rounded-2xl border border-matcha/15 flex items-start gap-3.5 shadow-sm"
                >
                  <div className="h-8 w-8 rounded-full bg-matcha/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Lightbulb className="h-4 w-4 text-matcha" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-matcha uppercase tracking-[0.2em] mb-1.5">Mẹo ghi nhớ</h3>
                    <p className="text-sm text-sumi/65 leading-relaxed">{result.mnemonics}</p>
                  </div>
                </motion.div>
              )}

              {/* Common Mistakes — glass card */}
              {result.common_mistakes && (
                <motion.div
                  variants={stepVariants}
                  className="p-5 bg-white/70 backdrop-blur-md rounded-2xl border border-gold/15 flex items-start gap-3.5 shadow-sm"
                >
                  <div className="h-8 w-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-gold uppercase tracking-[0.2em] mb-1.5">Lỗi thường gặp</h3>
                    <p className="text-sm text-sumi/65 leading-relaxed">{result.common_mistakes}</p>
                  </div>
                </motion.div>
              )}

              {/* Related Patterns — glass tags */}
              {result.related_patterns.length > 0 && (
                <motion.div variants={stepVariants} className="space-y-3.5">
                  <h3 className="text-xs font-black text-sumi/35 uppercase tracking-[0.2em] flex items-center gap-2">
                    <TreePine className="h-3.5 w-3.5 text-matcha" />
                    Mẫu câu liên quan
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.related_patterns.map((p, idx) => (
                      <span
                        key={idx}
                        className="px-3.5 py-2 bg-white/70 backdrop-blur-sm border border-sakura/[0.07] rounded-full text-xs font-bold text-sumi/55 shadow-sm hover:shadow-md hover:border-sakura/20 transition-all duration-200"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Difficulty info — glass card */}
              <motion.div
                variants={stepVariants}
                className="p-5 bg-white/70 backdrop-blur-md rounded-2xl border border-gold/15 flex items-start gap-3.5 shadow-sm"
              >
                <div className="h-8 w-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="h-4 w-4 text-gold" />
                </div>
                <div>
                  <p className="text-xs text-sumi/55 leading-relaxed font-medium">
                    <strong className="text-gold">Độ khó: {result.difficulty}</strong>
                    {result.model_used ? (
                      <>. Được tạo bởi <span className="font-bold text-sumi/70">{result.model_used}</span> chuyên về suy luận logic.</>
                    ) : (
                      <>. Đây là phân tích được tạo bởi mô hình AI chuyên về suy luận logic.</>
                    )}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <div className="text-center py-20 text-sumi/35">
              <Brain className="h-10 w-10 mx-auto mb-4 text-sumi/20" />
              <p className="font-medium">Không thể tải giải thích vào lúc này.</p>
              <p className="text-sm mt-1">Vui lòng thử lại sau.</p>
            </div>
          )}
        </div>

        <SheetFooter className="pt-6 border-t border-sumi/5">
          <Button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-sumi hover:bg-sumi/90 text-white font-bold shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            Đã hiểu, cảm ơn Sensei
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
