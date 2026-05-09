import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, Volume2, PlusCircle, Mic, MicOff, Globe, Languages } from 'lucide-react';
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
import { RefreshCcw } from 'lucide-react';

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
  const { isListening, startListening, stopListening, transcript } = useSpeechToText({ lang: 'ja-JP' });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: 'Tệp quá lớn', description: 'Vui lòng chọn ảnh nhỏ hơn 4MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImage(base64);
      analyzeImage(base64.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64Data: string) => {
    setIsLoading(true);
    setResult(null);
    try {
      const userContext = profile
        ? `User is level ${profile.level}, name ${profile.full_name || 'Gakusei'}.`
        : 'User is learning Japanese.';

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
        toast({ title: 'Nhận diện VIP thành công', description: `Sensei đã nhận diện được: ${data.result.object_name}` });
      }
    } catch (error) {
      console.error('Vision analysis error:', error);
      toast({ title: 'Lỗi Sensei', description: 'Sensei không thể nhìn rõ, hãy thử lại nhé.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWord = (word: string, reading: string, meaning: string) => {
    saveWord({ word, reading, meaning });
    toast({ title: 'Đã lưu', description: `Đã lưu "${word}" vào từ vựng của bạn.` });
  };

  return (
    <div className="space-y-6">
      <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileChange}/>

      {/* ── Image upload area ── */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative group w-full max-w-sm">
          <div
            onClick={() => !isLoading && fileInputRef.current?.click()}
            className={cn(
              'w-full aspect-square rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative bg-card shadow-sm',
              image ? 'border-primary' : 'border-dashed border-border hover:border-primary/40'
            )}
          >
            {image ? (
              <>
                <img src={image} alt="Taken" className="w-full h-full object-cover"/>
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full bg-background/60 backdrop-blur flex items-center justify-center">
                    <Camera className="h-8 w-8 text-foreground"/>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-10 space-y-5">
                <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-md">
                  <Camera className="h-8 w-8 text-primary-foreground"/>
                </div>
                <div className="space-y-1.5">
                  <p className="font-bold text-lg text-foreground">Snap & Learn</p>
                  <p className="text-xs text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                    Chụp ảnh vật thể để nhận diện và học từ vựng trực quan cùng Sensei.
                  </p>
                </div>
              </div>
            )}
            {isLoading && (
              <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-3 z-20">
                <Loader2 className="h-9 w-9 animate-spin text-primary"/>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Sensei đang nhìn...</p>
              </div>
            )}
          </div>

          {/* Voice context */}
          {!image && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-5 flex flex-col items-center gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Yêu cầu bổ sung (Tùy chọn)</p>
              <div className="flex items-center gap-2 bg-card border border-border p-1.5 rounded-2xl shadow-sm">
                <Button
                  onClick={() => isListening ? stopListening() : startListening()}
                  variant="ghost" size="sm"
                  className={cn('h-8 rounded-xl px-3 text-xs font-bold gap-1.5 transition-all',
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'text-primary hover:bg-primary/10')}>
                  {isListening ? <MicOff className="h-3.5 w-3.5"/> : <Mic className="h-3.5 w-3.5"/>}
                  {isListening ? 'Đang nghe' : 'Thêm bối cảnh'}
                </Button>
                {transcript && (
                  <Badge variant="secondary" className="h-8 px-3 rounded-xl bg-primary/10 text-primary border-0 font-jp max-w-[180px] truncate text-xs">
                    {transcript}
                  </Badge>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {image && !isLoading && (
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}
            className="gap-2 h-10 px-6 rounded-xl border-border text-foreground/70 hover:text-primary hover:border-primary/40 font-semibold text-sm">
            <RefreshCcw className="h-3.5 w-3.5"/>Chụp ảnh khác
          </Button>
        )}
      </div>

      {/* ── Results ── */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Main word card */}
            <Card className="border-border bg-card rounded-2xl overflow-hidden">
              <div className="h-1 w-full bg-primary"/>
              <CardContent className="p-6 sm:p-8 text-center space-y-5">
                <div className="space-y-3">
                  <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 font-black tracking-widest text-[10px] px-3 py-1 rounded-full uppercase">
                    Phân tích thành công
                  </Badge>
                  <h2 className="text-4xl sm:text-5xl font-jp font-black text-foreground leading-tight tracking-tighter">
                    {result.object_name}
                  </h2>
                  <div className="flex items-center justify-center gap-3">
                    <p className="text-xl font-bold text-primary/70 font-jp">【{result.reading}】</p>
                    <Button onClick={() => speak(result.object_name)} disabled={isSpeaking} variant="ghost" size="icon"
                      className="h-10 w-10 rounded-full bg-primary/10 text-primary hover:bg-primary/20 shadow-sm">
                      <Volume2 className="h-5 w-5"/>
                    </Button>
                  </div>
                </div>

                <div className="h-px max-w-[160px] mx-auto bg-border"/>

                <div className="space-y-2 max-w-xl mx-auto">
                  <p className="text-2xl sm:text-3xl text-foreground font-bold">{result.vietnamese_meaning}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">"{result.description}"</p>
                </div>

                <Button onClick={() => handleSaveWord(result.object_name, result.reading, result.vietnamese_meaning)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-11 px-8 shadow font-bold text-xs uppercase tracking-widest gap-2">
                  <PlusCircle className="h-4 w-4"/>Lưu vào từ vựng
                </Button>
              </CardContent>
            </Card>

            {/* Vocabulary + sentences grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Vocabulary list */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                  <Languages className="h-4 w-4 text-primary"/>Từ vựng liên quan
                </h3>
                <div className="space-y-2">
                  {result.vocabulary.map((v, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="group flex items-center justify-between p-3.5 bg-card rounded-xl border border-border hover:border-primary/30 cursor-pointer transition-all"
                      onClick={() => speak(v.word)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all flex-shrink-0">
                          <Volume2 className="h-4 w-4"/>
                        </div>
                        <div>
                          <p className="font-jp font-bold text-foreground">{v.word}</p>
                          <p className="text-[10px] font-bold text-primary/60 uppercase tracking-wider">{v.reading}</p>
                          <p className="text-xs text-muted-foreground">{v.meaning}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleSaveWord(v.word, v.reading, v.meaning); }}
                        className="h-8 w-8 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                        <PlusCircle className="h-4 w-4"/>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Sample sentences */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                  <Globe className="h-4 w-4 text-primary"/>Ngữ cảnh thực tế
                </h3>
                <div className="space-y-2">
                  {result.sample_sentences.map((s, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="p-4 bg-muted/30 rounded-xl border border-border hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-jp text-base leading-relaxed font-bold text-foreground group-hover:text-primary transition-colors">
                          {s.japanese}
                        </p>
                        <Button variant="ghost" size="icon" onClick={() => speak(s.japanese)}
                          className="h-9 w-9 text-primary/40 hover:text-primary hover:bg-primary/10 rounded-full flex-shrink-0">
                          <Volume2 className="h-4 w-4"/>
                        </Button>
                      </div>
                      <div className="mt-2 flex gap-3">
                        <div className="w-1 bg-primary/20 rounded-full flex-shrink-0"/>
                        <p className="text-xs text-muted-foreground italic leading-relaxed">"{s.translation}"</p>
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
