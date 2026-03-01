import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitCompare, 
  Search,
  Check,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { GRAMMAR_DB } from '@/data/grammar-db';

interface ComparisonResult {
  summary: string;
  comparison: {
    aspect: string;
    grammar1_detail: string;
    grammar2_detail: string;
  }[];
  examples: {
    text: string;
    translation: string;
    isGrammar1: boolean;
  }[];
}

export const GrammarComparisonDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [grammar1, setGrammar1] = useState("");
  const [grammar2, setGrammar2] = useState("");
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const handleCompare = async () => {
    if (!grammar1 || !grammar2) return;
    
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('japanese-grammar', {
        body: {
          mode: 'compare',
          grammar1: grammar1,
          grammar2: grammar2
        }
      });

      if (error) throw error;
      if (data.comparison) {
        setResult(data);
      } else {
        throw new Error("Invalid format");
      }
    } catch (err) {
      console.error("Comparison error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-xl border-primary/20 text-primary hover:bg-primary/5">
          <GitCompare className="h-4 w-4" />
          <span className="hidden sm:inline">Phân biệt ngữ pháp</span>
          <span className="sm:hidden">Phân biệt</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[700px] h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-elevated rounded-3xl">
        <DialogHeader className="p-6 bg-gradient-to-r from-primary/10 to-transparent border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">So sánh Ngữ pháp</DialogTitle>
              <p className="text-sm text-muted-foreground">Chọn 2 cấu trúc để phân biệt sự khác nhau.</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Selectors */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <Popover open={open1} onOpenChange={setOpen1}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open1}
                    className="w-full justify-between h-14 rounded-2xl border-2 hover:border-primary/50"
                  >
                    <span className="text-lg font-jp font-bold">
                      {grammar1 ? grammar1 : "Cấu trúc 1..."}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Tìm kiếm mẫu câu..." />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy.</CommandEmpty>
                      <CommandGroup>
                        {GRAMMAR_DB.map((point) => (
                          <CommandItem
                            key={point.id}
                            value={point.title}
                            onSelect={(currentValue) => {
                              setGrammar1(currentValue === grammar1 ? "" : currentValue);
                              setOpen1(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-primary",
                                grammar1 === point.title ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {point.title}
                            <span className="ml-auto text-xs text-muted-foreground opacity-50">{point.level}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              VS
            </div>

            <div className="flex-1 w-full">
              <Popover open={open2} onOpenChange={setOpen2}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open2}
                    className="w-full justify-between h-14 rounded-2xl border-2 hover:border-primary/50"
                  >
                    <span className="text-lg font-jp font-bold">
                      {grammar2 ? grammar2 : "Cấu trúc 2..."}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Tìm kiếm mẫu câu..." />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy.</CommandEmpty>
                      <CommandGroup>
                        {GRAMMAR_DB.map((point) => (
                          <CommandItem
                            key={point.id}
                            value={point.title}
                            onSelect={(currentValue) => {
                              setGrammar2(currentValue === grammar2 ? "" : currentValue);
                              setOpen2(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-primary",
                                grammar2 === point.title ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {point.title}
                            <span className="ml-auto text-xs text-muted-foreground opacity-50">{point.level}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button 
            className="w-full h-12 rounded-xl shadow-lg gap-2 text-md font-bold" 
            onClick={handleCompare}
            disabled={!grammar1 || !grammar2 || isLoading}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            {isLoading ? 'Đang phân tích...' : 'So sánh ngay'}
          </Button>

          {/* Result Display */}
          <AnimatePresence mode="wait">
            {result && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 pb-6"
              >
                {/* Summary */}
                <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl relative overflow-hidden">
                  <Sparkles className="absolute -top-4 -right-4 h-16 w-16 text-primary/10 rotate-12" />
                  <p className="text-sm md:text-base font-medium leading-relaxed text-foreground/80 relative z-10">
                    {result.summary}
                  </p>
                </div>

                {/* Table Comparison */}
                <div className="border rounded-2xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
                  <div className="grid grid-cols-3 bg-muted/50 border-b">
                     <div className="p-3 font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Tiêu chí</div>
                     <div className="p-3 font-bold text-lg font-jp text-center border-l truncate">{grammar1}</div>
                     <div className="p-3 font-bold text-lg font-jp text-center border-l truncate">{grammar2}</div>
                  </div>
                  <div className="divide-y">
                     {result.comparison.map((item, idx) => (
                       <div key={idx} className="grid grid-cols-3 hover:bg-muted/10 transition-colors items-center">
                          <div className="p-4 text-xs font-bold text-muted-foreground uppercase text-center leading-tight">
                            {item.aspect}
                          </div>
                          <div className="p-4 text-sm border-l text-center">
                            {item.grammar1_detail}
                          </div>
                          <div className="p-4 text-sm border-l text-center">
                            {item.grammar2_detail}
                          </div>
                       </div>
                     ))}
                  </div>
                </div>

                {/* Examples */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm uppercase tracking-widest text-muted-foreground pl-2 border-l-2 border-primary">
                    Ví dụ phân biệt
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.examples.map((ex, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "p-4 rounded-2xl border-2 space-y-2",
                          ex.isGrammar1 ? "bg-blue-50/50 border-blue-100 dark:border-blue-900" : "bg-primary/5 border-primary/20"
                        )}
                      >
                         <div className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white/50 border dark:bg-black/50 mb-1">
                           {ex.isGrammar1 ? grammar1 : grammar2}
                         </div>
                         <p className="font-jp text-lg font-medium">{ex.text}</p>
                         <p className="text-xs text-muted-foreground">{ex.translation}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
