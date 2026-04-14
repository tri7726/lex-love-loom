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
import { Brain, Sparkles, CheckCircle2, ChevronRight, Info, Loader2 } from "lucide-react";
import { ReasoningStep, DeepExplainResult } from "@/services/groqServices";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DeepExplanationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  result: DeepExplainResult | null;
  isLoading: boolean;
  title: string;
}

export const DeepExplanationSheet: React.FC<DeepExplanationSheetProps> = ({
  isOpen,
  onClose,
  result,
  isLoading,
  title
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl overflow-y-auto bg-slate-50 border-l-sakura/20">
        <SheetHeader className="pb-6 border-b">
          <div className="flex items-center gap-2 text-indigo-500 mb-2">
            <Brain className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-widest">Reasoning Sensei (DeepSeek R1)</span>
          </div>
          <SheetTitle className="text-2xl font-display font-black text-slate-800">
            Giải thích sâu về {title}
          </SheetTitle>
          <SheetDescription className="font-medium text-slate-500">
            Phân tích chi tiết cấu trúc và cách dùng theo tư duy logic.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
                <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-indigo-500 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-700">Sensei đang suy luận...</p>
                <p className="text-sm text-slate-400">Quá trình này có thể mất vài giây vì AI đang giải quyết vấn đề từng bước.</p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-8">
              {/* Reasoning Steps */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  Các bước suy luận
                </h3>
                <div className="space-y-4">
                  {result.reasoning_steps.map((step, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-2 opacity-5">
                         <span className="text-4xl font-black italic">{step.step}</span>
                      </div>
                      <div className="space-y-2 relative z-10">
                        <h4 className="font-black text-indigo-600 flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-indigo-50 flex items-center justify-center text-xs">
                            {step.step}
                          </span>
                          {step.title}
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed font-medium">
                          {step.explanation}
                        </p>
                        {step.example && (
                          <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <code className="text-indigo-700 font-jp font-bold">{step.example}</code>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Conclusion */}
              <div className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl text-white shadow-xl shadow-indigo-200">
                 <h3 className="text-sm font-black opacity-60 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Kết luận & Ghi nhớ
                </h3>
                <p className="text-lg font-bold leading-relaxed">
                  {result.conclusion}
                </p>
              </div>

              {/* Related Patterns */}
              {result.related_patterns.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Mẫu câu liên quan
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.related_patterns.map((p, idx) => (
                      <span key={idx} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 shadow-sm">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                  <strong>Độ khó: {result.difficulty}</strong>. Đây là phân tích được tạo bởi mô hình DeepSeek R1 chuyên về suy luận logic.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400">
              <p>Hệ thống không thể tải giải thích vào lúc này. Vui lòng thử lại sau.</p>
            </div>
          )}
        </div>

        <SheetFooter className="pt-6 border-t">
          <Button onClick={onClose} className="w-full h-12 rounded-2xl bg-slate-900 font-bold">
            Đã hiểu, cảm ơn Sensei
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
