import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Loader2, Image as ImageIcon, Sparkles, Volume2, PlusCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTTS } from '@/hooks/useTTS';
import { useWordHistory } from '@/hooks/useWordHistory';
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
      const { data, error } = await supabase.functions.invoke('japanese-analysis', {
        body: { 
          image: base64Data,
          isImageAnalysis: true 
        },
      });

      if (error) throw error;
      if (data.format === 'vision') {
        setResult(data.result);
      }
    } catch (error) {
      console.error('Vision analysis error:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể phân tích ảnh lúc này.',
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
    <div className="space-y-6">
      {/* Upload/Camera Area */}
      <div className="flex flex-col items-center gap-4">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        <div 
          onClick={() => !isLoading && fileInputRef.current?.click()}
          className={cn(
            "w-full max-w-sm aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group",
            image ? "border-matcha bg-matcha/5" : "border-muted-foreground/30 hover:border-matcha/50 hover:bg-matcha/5"
          )}
        >
          {image ? (
            <>
              <img src={image} alt="Taken" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-10 w-10 text-white" />
              </div>
            </>
          ) : (
            <>
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-sm">Chụp ảnh hoặc Tải ảnh lên</p>
              <p className="text-xs text-muted-foreground mt-1">AI sẽ nhận diện vật thể bằng tiếng Nhật</p>
            </>
          )}

          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-matcha" />
              <p className="text-xs font-medium animate-pulse">Đang nhìn nè...</p>
            </div>
          )}
        </div>

        {image && !isLoading && (
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Chụp lại
          </Button>
        )}
      </div>

      {/* Results Area */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Main Object Card */}
            <Card className="border-2 border-matcha bg-matcha/5">
              <CardContent className="p-6 text-center space-y-4">
                <div className="space-y-1">
                  <Badge variant="outline" className="text-matcha border-matcha font-mono">
                    <Sparkles className="h-3 w-3 mr-1" />
                    ĐÃ NHẬN DIỆN
                  </Badge>
                  <h2 className="text-4xl font-jp font-bold text-matcha-dark">{result.object_name}</h2>
                  <p className="text-lg text-muted-foreground">{result.reading}</p>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <div className="h-px w-20 bg-matcha/20" />
                  <p className="text-xl font-medium">{result.vietnamese_meaning}</p>
                  <p className="text-sm text-muted-foreground max-w-md">{result.description}</p>
                </div>

                <div className="flex justify-center gap-3">
                  <Button onClick={() => speak(result.object_name)} disabled={isSpeaking} className="gap-2 bg-matcha hover:bg-matcha-dark">
                    <Volume2 className="h-4 w-4" />
                    Nghe phát âm
                  </Button>
                  <Button variant="outline" onClick={() => handleSaveWord(result.object_name, result.reading, result.vietnamese_meaning)} className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Lưu từ vựng
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Related Vocabulary */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-sakura" />
                Từ vựng liên quan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.vocabulary.map((v, i) => (
                  <Card key={i} className="hover:shadow-md transition-all cursor-pointer group" onClick={() => speak(v.word)}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-jp font-bold text-lg group-hover:text-matcha transition-colors">{v.word}</p>
                        <p className="text-xs text-muted-foreground">{v.reading}</p>
                        <p className="text-sm font-medium">{v.meaning}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => {
                        e.stopPropagation();
                        handleSaveWord(v.word, v.reading, v.meaning);
                      }}>
                        <PlusCircle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Sample Sentences */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                Câu ví dụ
              </h3>
              <div className="space-y-3">
                {result.sample_sentences.map((s, i) => (
                  <Card key={i} className="bg-muted/30">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-jp text-lg leading-relaxed">{s.japanese}</p>
                        <Button variant="ghost" size="icon" onClick={() => speak(s.japanese)} className="shrink-0">
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground border-l-2 border-primary/20 pl-3">
                        {s.translation}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// export default SnapLearn;

