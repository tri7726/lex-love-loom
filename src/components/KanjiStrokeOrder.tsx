import React, { useState, useEffect, forwardRef, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, ExternalLink, Play, Pause, PenTool, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { fetchKanjiDetails, KanjiAliveDetails } from '@/services/kanjiAliveService';
import { HandwritingCanvas } from './kanji/HandwritingCanvas';

interface KanjiStrokeOrderProps {
  kanji: string;
  reading?: string;
  meaning?: string;
  onClose: () => void;
  onSaveToVocabulary?: (word: { word: string; reading: string; meaning: string }) => void;
}

interface KanjiInfo {
  kanji: string;
  grade?: number;
  stroke_count?: number;
  meanings?: string[];
  kun_readings?: string[];
  on_readings?: string[];
  jlpt?: number;
}

interface KanjiData {
  char: string;
  kanjiApiData: KanjiInfo | null;
  kanjiAliveData: KanjiAliveDetails | null;
  isLoading: boolean;
  error: string | null;
}

export const KanjiStrokeOrder = forwardRef<HTMLDivElement, KanjiStrokeOrderProps>(({
  kanji,
  reading,
  meaning,
  onClose,
  onSaveToVocabulary,
}, ref) => {
  const [kanjiDataList, setKanjiDataList] = useState<KanjiData[]>([]);
  const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const kanjiCharacters = React.useMemo(() => {
    return kanji.split('').filter(char => {
      const code = char.charCodeAt(0);
      return code >= 0x4E00 && code <= 0x9FFF;
    });
  }, [kanji]);

  useEffect(() => {
    const fetchAllKanjiInfo = async () => {
      if (kanjiCharacters.length === 0) return;

      const initialData: KanjiData[] = kanjiCharacters.map(char => ({
        char,
        kanjiApiData: null,
        kanjiAliveData: null,
        isLoading: true,
        error: null,
      }));
      setKanjiDataList(initialData);

      await Promise.all(
        kanjiCharacters.map(async (char, index) => {
          try {
            const apiRes = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(char)}`);
            let kanjiApiData: KanjiInfo | null = null;
            if (apiRes.ok) {
              kanjiApiData = await apiRes.json();
            }

            const kanjiAliveData = await fetchKanjiDetails(char);

            setKanjiDataList(prev => {
              const newData = [...prev];
              newData[index] = {
                char,
                kanjiApiData,
                kanjiAliveData,
                isLoading: false,
                error: (!kanjiApiData && !kanjiAliveData) ? 'Không tìm thấy thông tin Kanji' : null,
              };
              return newData;
            });
          } catch (err) {
            console.error(`Error fetching kanji info for ${char}:`, err);
            setKanjiDataList(prev => {
              const newData = [...prev];
              newData[index] = {
                ...newData[index],
                isLoading: false,
                error: 'Lỗi kết nối',
              };
              return newData;
            });
          }
        })
      );
    };

    fetchAllKanjiInfo();
  }, [kanjiCharacters]);

  const handleSave = () => {
    if (onSaveToVocabulary && reading && meaning) {
      onSaveToVocabulary({
        word: kanji,
        reading: reading,
        meaning: meaning,
      });
    }
  };

  const toggleVideoPlayback = (char: string) => {
    const video = videoRefs.current[char];
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(prev => ({ ...prev, [char]: true }));
      } else {
        video.pause();
        setIsPlaying(prev => ({ ...prev, [char]: false }));
      }
    }
  };

  const isOverallLoading = kanjiDataList.length === 0 && kanjiCharacters.length > 0 || kanjiDataList.some(d => d.isLoading);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="pb-3 sticky top-0 bg-card z-10 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="font-jp text-3xl">{kanji}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>
          {reading && (
            <p className="text-sm text-muted-foreground font-jp">{reading}</p>
          )}
          {meaning && (
            <p className="text-base font-medium">{meaning}</p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6 pt-6">
          {isOverallLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : kanjiCharacters.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground">Từ này không chứa chữ Kanji nào.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {kanjiDataList.map((data, index) => {
                const aliveData = data.kanjiAliveData;
                const apiData = data.kanjiApiData;

                if (data.error) {
                   return (
                     <div key={index} className="bg-muted p-4 rounded-xl text-center">
                       <span className="font-jp text-4xl mb-2 block">{data.char}</span>
                       <p className="text-sm text-muted-foreground">{data.error}</p>
                     </div>
                   );
                }

                const strokeCount = aliveData?.kanji.strokes.count || apiData?.stroke_count;
                const meanings = aliveData ? [aliveData.kanji.meaning.english] : (apiData?.meanings || []);
                const onyomi = aliveData ? 
                  (aliveData.kanji.onyomi.katakana ? [aliveData.kanji.onyomi.katakana] : []) : 
                  (apiData?.on_readings || []);
                const kunyomi = aliveData ? 
                  (aliveData.kanji.kunyomi.hiragana ? [aliveData.kanji.kunyomi.hiragana] : []) : 
                  (apiData?.kun_readings || []);

                return (
                  <div key={index} className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                    <Tabs defaultValue="info" className="w-full">
                      <div className="px-4 pt-4 flex items-center justify-between border-b bg-muted/30">
                        <TabsList className="grid grid-cols-2 w-48 h-9 rounded-xl p-1 bg-muted/50">
                          <TabsTrigger value="info" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Info className="h-3.5 w-3.5 mr-2" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Thông tin</span>
                          </TabsTrigger>
                          <TabsTrigger value="practice" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <PenTool className="h-3.5 w-3.5 mr-2" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Luyện viết</span>
                          </TabsTrigger>
                        </TabsList>
                        <div className="flex items-center gap-2">
                          <span className="font-jp text-2xl font-bold">{data.char}</span>
                        </div>
                      </div>

                      <TabsContent value="info" className="mt-0">
                        <div className="flex flex-col sm:flex-row bg-slate-50/50 dark:bg-slate-900/50 border-b">
                          <div className="w-full sm:w-1/2 min-h-[160px] relative flex items-center justify-center p-4 bg-white dark:bg-black/20">
                            {aliveData?.kanji.video ? (
                              <div className="relative group cursor-pointer" onClick={() => toggleVideoPlayback(data.char)}>
                                <video
                                  ref={el => { videoRefs.current[data.char] = el; }}
                                  src={aliveData.kanji.video.mp4}
                                  poster={aliveData.kanji.video.poster}
                                  className="w-full max-w-[120px] rounded-lg"
                                  loop
                                  muted
                                  playsInline
                                  onEnded={() => setIsPlaying(prev => ({ ...prev, [data.char]: false }))}
                                  onPlay={() => setIsPlaying(prev => ({ ...prev, [data.char]: true }))}
                                  onPause={() => setIsPlaying(prev => ({ ...prev, [data.char]: false }))}
                                />
                                {!isPlaying[data.char] && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg transition-all group-hover:bg-black/20">
                                    <div className="bg-white/90 p-2 rounded-full shadow-md text-primary backdrop-blur-sm">
                                      <Play className="h-6 w-6 ml-1" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="font-jp text-6xl">{data.char}</span>
                                <a
                                  href={`https://jisho.org/search/${encodeURIComponent(data.char)}%20%23kanji`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary mt-4 hover:underline flex items-center gap-1"
                                >
                                  Jisho.org <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>

                          <div className="w-full sm:w-1/2 p-4 flex flex-col justify-center space-y-3">
                            <div className="space-y-1 text-center sm:text-left">
                               <h3 className="text-xl font-bold line-clamp-2">{meanings.join(', ')}</h3>
                               {aliveData?.radical && (
                                 <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-muted-foreground mt-1">
                                   <span>Bộ thủ:</span>
                                   <span className="font-jp font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                                     {aliveData.radical.character}
                                   </span>
                                 </div>
                               )}
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                              {strokeCount && (
                                <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]">
                                  {strokeCount} nét
                                </Badge>
                              )}
                              {apiData?.jlpt && (
                                <Badge variant="secondary" className="bg-sakura/10 text-sakura font-bold border-sakura/20 text-[10px]">
                                  N{apiData.jlpt}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="p-4 space-y-4">
                          {kunyomi.length > 0 && (
                            <div>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                 <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                 Kunyomi
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {kunyomi.map((r, idx) => (
                                  <Badge key={idx} variant="outline" className="font-jp text-xs bg-blue-50/50 border-blue-100 text-blue-800 py-0.5 px-2">
                                    {r}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {onyomi.length > 0 && (
                            <div>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                 <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                 Onyomi
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {onyomi.map((r, idx) => (
                                  <Badge key={idx} variant="outline" className="font-jp text-xs bg-red-50/50 border-red-100 text-red-800 py-0.5 px-2">
                                    {r}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="practice" className="mt-0 p-4 pt-6 bg-slate-50/30">
                        <HandwritingCanvas 
                          targetKanji={data.char} 
                          onSuccess={() => {}}
                        />
                        <div className="mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-start gap-3">
                          <PenTool className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                          <p className="text-[11px] leading-relaxed text-blue-700 font-medium">
                            Vẽ chữ Kanji vào ô trống và nhấn <strong>Kiểm tra</strong> để hệ thống AI nhận diện nét chữ của bạn.
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                );
              })}

              {onSaveToVocabulary && reading && meaning && (
                <div className="pt-4 sticky bottom-0 bg-card pb-4 border-t mt-4">
                  <Button onClick={handleSave} className="w-full font-bold h-12 shadow-sm rounded-xl">
                    Lưu vào từ vựng
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

KanjiStrokeOrder.displayName = 'KanjiStrokeOrder';
