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
import { Brain, Sparkles, CheckCircle2, ChevronRight, Info, Loader2, TreePine, Lightbulb, AlertTriangle } from "lucide-react";
import { ReasoningStep, DeepExplainResult } from "@/services/groqServices";
import { motion, AnimatePresence } from "framer-motion";

interface DeepExplanationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  result: DeepExplainResult | null;
  isLoading: boolean;
  title: string;
  streamingContent?: string;
}

const STEP_ICONS = [
  <Sparkles className="h-4 w-4" />,
  <TreePine className="h-4 w-4" />,
  <Brain className="h-4 w-4" />,
  <ChevronRight className="h-4 w-4" />,
  <Info className="h-4 w-4" />,
];

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
      <SheetContent className="sm:max-w-xl overflow-y-auto bg-cream/80 backdrop-blur-xl border-l-sakura/30">
        <SheetHeader className="pb-6 border-b border-sakura/10">
          <div className="flex items-center gap-2 text-sakura mb-2">
            <div className="h-8 w-8 rounded-full bg-sakura/10 flex items-center justify-center">
              <Brain className="h-4 w-4" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-sumi/60">Reasoning Sensei</span>
          </div>
          <SheetTitle className="text-2xl font-display font-black text-sumi">
            Giải thích sâu về {title}
          </SheetTitle>
          <SheetDescription className="font-medium text-sumi/50">
            Phân tích chi tiết cấu trúc và cách dùng theo tư duy logic.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-4">
              {streamingContent ? (
                <div className="w-full space-y-2">
                  <div className="flex items-center gap-2 text-sakura mb-4">
                    <div className="h-2 w-2 rounded-full bg-sakura animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-widest text-sumi/50">Sensei đang suy luận...</span>
                  </div>
                  <div className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-sakura/10 max-h-80 overflow-y-auto shadow-sm">
                    <pre className="text-sm text-sumi/70 whitespace-pre-wrap font-sans leading-relaxed">
                      {streamingContent}
                      <span className="inline-block h-4 w-1.5 bg-sakura ml-0.5 animate-pulse" />
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-20 gap-4">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-sakura/20 border-t-sakura animate-spin" />
                    <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-sakura animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sumi">Sensei đang suy luận...</p>
                    <p className="text-sm text-sumi/40">Quá trình này có thể mất vài giây vì AI đang giải quyết vấn đề từng bước.</p>
                  </div>
                </div>
              )}
            </div>
          ) : result ? (
            <div className="space-y-8">
              {/* Reasoning Steps — Stepped Journey */}
              <div className="space-y-1">
                <h3 className="text-sm font-black text-sumi/40 uppercase tracking-widest flex items-center gap-2 mb-6">
                  <Sparkles className="h-4 w-4 text-sakura" />
                  Các bước suy luận
                </h3>
                <div className="relative">
                  {/* Vertical connecting line */}
                  <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-sakura/30 via-sakura/20 to-transparent" />

                  <div className="space-y-6">
                    {result.reasoning_steps.map((step, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative pl-12"
                      >
                        {/* Timeline dot */}
                        <div className="absolute left-0 top-2 h-10 w-10 rounded-full bg-white border-2 border-sakura/20 flex items-center justify-center shadow-sm z-10">
                          <span className="text-sakura font-black text-sm">{step.step}</span>
                        </div>

                        {/* Step card */}
                        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-sakura/10 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-sakura/[0.03] to-transparent rounded-bl-full" />
                          <div className="space-y-2 relative z-10">
                            <h4 className="font-bold text-sumi flex items-center gap-2">
                              {step.title}
                            </h4>
                            <p className="text-sm text-sumi/65 leading-relaxed">
                              {step.explanation}
                            </p>
                            {step.example && (
                              <div className="mt-2 p-3 bg-sakura/[0.03] rounded-xl border border-sakura/10">
                                <code className="text-sakura font-jp font-bold text-base">{step.example}</code>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conclusion */}
              <div className="p-6 bg-gradient-to-br from-sakura to-rose-600 rounded-3xl text-white shadow-xl shadow-sakura/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-tr-full" />
                <h3 className="text-sm font-black opacity-60 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10">
                  <CheckCircle2 className="h-4 w-4" />
                  Kết luận & Ghi nhớ
                </h3>
                <p className="text-lg font-bold leading-relaxed relative z-10">
                  {result.conclusion}
                </p>
              </div>

              {/* Mnemonics */}
              {result.mnemonics && (
                <div className="p-4 bg-matcha/5 rounded-2xl border border-matcha/15 flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-matcha shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-black text-matcha uppercase tracking-widest mb-1">Mẹo ghi nhớ</h3>
                    <p className="text-sm text-sumi/70 leading-relaxed">{result.mnemonics}</p>
                  </div>
                </div>
              )}

              {/* Common Mistakes */}
              {result.common_mistakes && (
                <div className="p-4 bg-gold/5 rounded-2xl border border-gold/15 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-black text-gold uppercase tracking-widest mb-1">Lỗi thường gặp</h3>
                    <p className="text-sm text-sumi/70 leading-relaxed">{result.common_mistakes}</p>
                  </div>
                </div>
              )}

              {/* Related Patterns */}
              {result.related_patterns.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-sumi/40 uppercase tracking-widest flex items-center gap-2">
                    <TreePine className="h-4 w-4 text-matcha" />
                    Mẫu câu liên quan
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.related_patterns.map((p, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-white/60 backdrop-blur-sm border border-sakura/10 rounded-full text-xs font-bold text-sumi/60 shadow-sm">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-gold/10 rounded-2xl border border-gold/20 flex items-start gap-3">
                <Info className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                <p className="text-xs text-sumi/60 leading-relaxed font-medium">
                  <strong className="text-gold">Độ khó: {result.difficulty}</strong>. Đây là phân tích được tạo bởi mô hình DeepSeek R1 chuyên về suy luận logic.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-sumi/40">
              <p>Hệ thống không thể tải giải thích vào lúc này. Vui lòng thử lại sau.</p>
            </div>
          )}
        </div>

        <SheetFooter className="pt-6 border-t border-sakura/10">
          <Button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-sumi hover:bg-sumi/90 text-white font-bold shadow-lg transition-all hover:scale-[1.02]"
          >
            Đã hiểu, cảm ơn Sensei
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
