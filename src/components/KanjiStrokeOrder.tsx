import React, { useState, useEffect, forwardRef, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, ExternalLink, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fetchKanjiDetails, KanjiAliveDetails } from '@/services/kanjiAliveService';

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

// Combined data structure holding both API results
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

  // Extract individual kanji characters from the word
  const kanjiCharacters = kanji.split('').filter(char => {
    const code = char.charCodeAt(0);
    // CJK Unified Ideographs range
    return code >= 0x4E00 && code <= 0x9FFF;
  });

  useEffect(() => {
    const fetchAllKanjiInfo = async () => {
      if (kanjiCharacters.length === 0) {
        return;
      }

      // Initialize state for each kanji
      const initialData: KanjiData[] = kanjiCharacters.map(char => ({
        char,
        kanjiApiData: null,
        kanjiAliveData: null,
        isLoading: true,
        error: null,
      }));
      setKanjiDataList(initialData);

      // Fetch data for each character in parallel
      await Promise.all(
        kanjiCharacters.map(async (char, index) => {
          try {
            // Fetch from kanjiapi.dev
            const apiRes = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(char)}`);
            let kanjiApiData: KanjiInfo | null = null;
            if (apiRes.ok) {
              kanjiApiData = await apiRes.json();
            }

            // Fetch from Kanji Alive
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
  }, [kanji]); // Refetch if word changes

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

                // Prefer Kanji Alive data where possible
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
                    {/* Character Header & Animation */}
                    <div className="flex flex-col sm:flex-row bg-slate-50 dark:bg-slate-900 border-b">
                      {/* Video Player */}
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
                          // Fallback if no Kanji Alive video
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

                      {/* Character Basic Info */}
                      <div className="w-full sm:w-1/2 p-4 flex flex-col justify-center space-y-3">
                        <div className="space-y-1 text-center sm:text-left">
                           <h3 className="text-xl font-bold">{meanings.join(', ')}</h3>
                           {aliveData?.radical && (
                             <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground mt-1">
                               <span>Bộ thủ:</span>
                               <span className="font-jp font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                                 {aliveData.radical.character} ({aliveData.radical.name.hiragana})
                               </span>
                             </div>
                           )}
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          {strokeCount && (
                            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {strokeCount} nét
                            </Badge>
                          )}
                          {apiData?.jlpt && (
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-bold border-indigo-200 dark:border-indigo-800">
                              N{apiData.jlpt}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Info (Readings) */}
                    <div className="p-4 space-y-4">
                      {kunyomi.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                             Kunyomi (訓読み)
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {kunyomi.map((r, idx) => (
                              <Badge key={idx} variant="outline" className="font-jp text-sm bg-blue-50/50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 py-1 px-3">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {onyomi.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-red-500"></span>
                             Onyomi (音読み)
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {onyomi.map((r, idx) => (
                              <Badge key={idx} variant="outline" className="font-jp text-sm bg-red-50/50 border-red-200 text-red-800 dark:bg-red-900/20 dark:text-red-300 py-1 px-3">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Save Button */}
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


// export default KanjiStrokeOrder;
