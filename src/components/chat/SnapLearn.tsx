import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Loader2, Image as ImageIcon, Sparkles, Volume2, PlusCircle, CheckCircle2, Mic, MicOff, Info, Globe, Zap, Languages } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTTS } from '@/hooks/useTTS';
import { useWordHistory } from '@/hooks/useWordHistory';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

const RefreshCcw = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

interface VisionResult {
  object_name: string;
  reading: string;
  vietnamese_meaning: string;
  description: string;
  vocabulary: {
    word: string;
    reading: string;
    meaning: string;
  }[];
  sample_sentences: {
    japanese: string;
    translation: string;
  }[];
}

export const SnapLearn = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { speak, isSpeaking } = useTTS();
  const { saveWord } = useWordHistory();
  const { profile } = useProfile();
  const { isListening, startListening, stopListening, transcript } = useSpeechToText({
    lang: 'ja-JP'
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast({
          title: 'Tệp quá lớn',
          description: 'Vui lòng chọn ảnh nhỏ hơn 4MB.',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        analyzeImage(base64.split(',')[1]); // Send only base64 data
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64Data: string) => {
    setIsLoading(true);
    setResult(null);

    try {
      const userContext = profile ? 
        `User is level ${profile.level}, name ${profile.full_name || 'Gakusei'}.` : 
        "User is learning Japanese.";

      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: { 
          image: base64Data,
          isImageAnalysis: true,
          isVip: true,
          prompt: `[Context: ${userContext}] ${transcript ? `Specifically about: ${transcript}` : ''}`
        },
      });

      if (error) throw error;
      if (data.format === 'vision') {
        setResult(data.result);
        toast({
          title: 'Nhận diện VIP thành công',
          description: `Sensei đã nhận diện được vật thể: ${data.result.object_name}`,
        });
      }
    } catch (error) {
      console.error('Vision analysis error:', error);
      toast({
        title: 'Lỗi Sensei',
        description: 'Sensei không thể nhìn rõ, hãy thử lại nhé.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWord = (word: string, reading: string, meaning: string) => {
    saveWord({ word, reading, meaning });
    toast({
      title: 'Đã lưu',
      description: `Đã lưu "${word}" vào từ vựng của bạn.`,
    });
  };

  return (
    <div className="space-y-8">
      {/* VIP Interaction Area */}
      <div className="flex flex-col items-center gap-8">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        <div className="relative group w-full max-w-sm">
           <div 
             onClick={() => !isLoading && fileInputRef.current?.click()}
             className={cn(
               "w-full aspect-square rounded-[2.5rem] border-2 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-soft",
               image ? "border-sakura shadow-sakura-soft" : "border-sakura/10 border-dashed dark:border-slate-800 hover:border-sakura/40"
             )}
           >
             {image ? (
               <>
                 <img src={image} alt="Taken" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-sakura/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <div className="h-20 w-20 rounded-full bg-white/30 backdrop-blur-xl flex items-center justify-center shadow-elevated">
                      <Camera className="h-10 w-10 text-white" />
                   </div>
                 </div>
               </>
             ) : (
               <div className="text-center p-10 space-y-6">
                 <div className="h-20 w-20 rounded-3xl bg-sakura flex items-center justify-center mx-auto shadow-md shadow-sakura/30">
                   <Camera className="h-10 w-10 text-white" />
                 </div>
                 <div className="space-y-2">
                   <p className="font-bold text-xl text-slate-800 dark:text-white">Snap & Learn</p>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-[220px] mx-auto leading-relaxed">Chụp ảnh vật thể để nhận diện và học từ vựng trực quan cùng Sensei.</p>
                 </div>
               </div>
             )}
   
             {isLoading && (
               <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/90 flex flex-col items-center justify-center gap-4 z-20">
                 <Loader2 className="h-10 w-10 animate-spin text-sakura" />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sakura animate-pulse">Sensei đang nhìn...</p>
               </div>
             )}
           </div>

           {/* Voice Filter Option */}
           {!image && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="mt-8 flex flex-col items-center gap-4"
             >
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sakura/60">Yêu cầu bổ sung (Tùy chọn)</p>
                <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-1.5 rounded-2xl border border-sakura/10 shadow-soft">
                   <Button
                     onClick={() => isListening ? stopListening() : startListening()}
                     variant="ghost"
                     size="sm"
                     className={cn(
                       "h-9 rounded-xl px-4 text-xs font-bold transition-all",
                       isListening ? "bg-red-500 text-white animate-pulse" : "text-sakura hover:bg-sakura/10"
                     )}
                   >
                     {isListening ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                     {isListening ? "Đang nghe" : "Thêm bối cảnh giọng nói"}
                   </Button>
                   {transcript && (
                     <Badge variant="secondary" className="h-10 px-4 rounded-xl bg-sakura/10 text-sakura border-0 font-jp max-w-[200px] truncate">
                       {transcript}
                     </Badge>
                   )}
                </div>
             </motion.div>
           )}
        </div>

        {image && !isLoading && (
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()} 
              className="gap-2 h-12 px-8 rounded-2xl border-sakura/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-soft text-sakura font-bold"
            >
              <RefreshCcw className="h-4 w-4" />
              Chụp ảnh khác
            </Button>
          </div>
        )}
      </div>

      {/* VIP Results Area */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            {/* Object Main Card */}
            <Card className="border-0 shadow-elevated bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-[2.5rem] overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-sakura via-rose-400 to-sakura" />
              <CardContent className="p-10 md:p-14 text-center space-y-8">
                <div className="space-y-4">
                   <div className="flex justify-center">
                     <Badge variant="outline" className="border-sakura/30 text-sakura bg-sakura/5 font-black tracking-[0.2em] text-[10px] px-4 py-1 rounded-full uppercase">
                       Phân tích vật thể thành công
                     </Badge>
                   </div>
                  <h2 className="text-5xl md:text-6xl font-jp font-black text-slate-900 dark:text-white leading-tight tracking-tighter">{result.object_name}</h2>
                  <div className="flex items-center justify-center gap-3">
                    <p className="text-2xl font-bold text-sakura/70 font-jp">【{result.reading}】</p>
                    <Button onClick={() => speak(result.object_name)} disabled={isSpeaking} variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-sakura/10 text-sakura hover:bg-sakura/20 transition-all shadow-sm">
                      <Volume2 className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
                
                <div className="h-px max-w-[200px] mx-auto bg-gradient-to-r from-transparent via-sakura/20 to-transparent" />
                
                <div className="space-y-4 max-w-2xl mx-auto">
                  <p className="text-3xl text-slate-900 dark:text-slate-100 font-bold tracking-tight">{result.vietnamese_meaning}</p>
                  <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed italic font-medium">
                    "{result.description}"
                  </p>
                </div>

                <div className="flex justify-center pt-4">
                  <Button 
                    onClick={() => handleSaveWord(result.object_name, result.reading, result.vietnamese_meaning)} 
                    className="bg-sakura text-white hover:bg-sakura/90 rounded-2xl h-14 px-10 shadow-lg shadow-sakura/25 transition-all font-black text-sm uppercase tracking-widest"
                  >
                    <PlusCircle className="h-5 w-5 mr-3" />
                    Lưu vào Bộ nhớ VIP
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Related Vocabulary */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                   <h3 className="font-black text-xs uppercase tracking-[0.3em] text-sakura/70 flex items-center gap-3">
                     <Languages className="h-5 w-5" />
                     Từ vựng liên quan
                   </h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {result.vocabulary.map((v, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group p-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-white/20 shadow-soft hover:shadow-sakura-soft hover:border-sakura/40 transition-all cursor-pointer flex items-center justify-between"
                      onClick={() => speak(v.word)}
                    >
                      <div className="flex items-center gap-5">
                         <div className="h-12 w-12 rounded-2xl bg-sakura/5 flex items-center justify-center text-sakura/40 group-hover:bg-sakura group-hover:text-white transition-all shadow-sm">
                            <Volume2 className="h-5 w-5" />
                         </div>
                         <div className="space-y-1">
                           <p className="font-jp font-bold text-lg text-slate-800 dark:text-slate-100">{v.word}</p>
                           <p className="text-xs font-bold text-sakura/60 uppercase tracking-wider">{v.reading}</p>
                           <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{v.meaning}</p>
                         </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-sakura/10 text-sakura/40 hover:text-sakura" onClick={(e) => {
                        e.stopPropagation();
                        handleSaveWord(v.word, v.reading, v.meaning);
                      }}>
                        <PlusCircle className="h-5 w-5" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Sample Sentences */}
              <div className="space-y-6">
                <h3 className="font-black text-xs uppercase tracking-[0.3em] text-sakura/70 flex items-center gap-3 px-4">
                   <Globe className="h-5 w-5" />
                   Ngữ cảnh thực tế
                </h3>
                <div className="space-y-4">
                  {result.sample_sentences.map((s, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border border-white/20 hover:border-sakura/30 transition-all shadow-soft group"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <p className="font-jp text-xl leading-relaxed font-bold text-slate-800 dark:text-slate-100 group-hover:text-sakura transition-colors">{s.japanese}</p>
                        <Button variant="ghost" size="icon" onClick={() => speak(s.japanese)} className="h-12 w-12 text-sakura hover:bg-sakura/10 rounded-full flex-shrink-0 shadow-sm">
                          <Volume2 className="h-6 w-6" />
                        </Button>
                      </div>
                      <div className="mt-4 flex gap-4">
                         <div className="w-1.5 bg-sakura/20 rounded-full" />
                         <p className="text-sm text-slate-600 dark:text-slate-400 font-medium italic leading-relaxed">
                           "{s.translation}"
                         </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// export default SnapLearn;

