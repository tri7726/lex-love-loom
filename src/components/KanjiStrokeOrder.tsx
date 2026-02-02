import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

const KanjiStrokeOrder: React.FC<KanjiStrokeOrderProps> = ({
  kanji,
  reading,
  meaning,
  onClose,
  onSaveToVocabulary,
}) => {
  const [kanjiInfo, setKanjiInfo] = useState<KanjiInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract individual kanji characters from the word
  const kanjiCharacters = kanji.split('').filter(char => {
    const code = char.charCodeAt(0);
    // CJK Unified Ideographs range
    return code >= 0x4E00 && code <= 0x9FFF;
  });

  useEffect(() => {
    const fetchKanjiInfo = async () => {
      if (kanjiCharacters.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // Fetch info for first kanji character
        const response = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanjiCharacters[0])}`);
        
        if (response.ok) {
          const data = await response.json();
          setKanjiInfo(data);
        } else {
          setError('Không tìm thấy thông tin Kanji');
        }
      } catch (err) {
        console.error('Error fetching kanji info:', err);
        setError('Lỗi kết nối');
      } finally {
        setLoading(false);
      }
    };

    fetchKanjiInfo();
  }, [kanji]);

  const handleSave = () => {
    if (onSaveToVocabulary && reading && meaning) {
      onSaveToVocabulary({
        word: kanji,
        reading: reading,
        meaning: meaning,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-jp text-2xl">{kanji}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {reading && (
            <p className="text-sm text-muted-foreground font-jp">{reading}</p>
          )}
          {meaning && (
            <p className="text-sm text-muted-foreground">{meaning}</p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="text-center text-muted-foreground py-4">{error}</p>
          ) : (
            <>
              {/* Kanji Characters Display */}
              {kanjiCharacters.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Các chữ Kanji:</h4>
                  <div className="flex flex-wrap gap-2">
                    {kanjiCharacters.map((char, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col items-center p-3 bg-muted rounded-lg"
                      >
                        <span className="font-jp text-4xl mb-2">{char}</span>
                        {/* Stroke order animation placeholder - using SVG from kanjiapi */}
                        <a
                          href={`https://jisho.org/search/${encodeURIComponent(char)}%20%23kanji`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          Xem nét viết <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Kanji Info from API */}
              {kanjiInfo && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {kanjiInfo.stroke_count && (
                      <div className="p-2 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Số nét</p>
                        <p className="font-semibold">{kanjiInfo.stroke_count} nét</p>
                      </div>
                    )}
                    {kanjiInfo.jlpt && (
                      <div className="p-2 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">JLPT</p>
                        <p className="font-semibold">N{kanjiInfo.jlpt}</p>
                      </div>
                    )}
                    {kanjiInfo.grade && (
                      <div className="p-2 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Cấp độ</p>
                        <p className="font-semibold">Lớp {kanjiInfo.grade}</p>
                      </div>
                    )}
                  </div>

                  {kanjiInfo.kun_readings && kanjiInfo.kun_readings.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Kunyomi (訓読み):</p>
                      <div className="flex flex-wrap gap-1">
                        {kanjiInfo.kun_readings.slice(0, 5).map((reading, idx) => (
                          <Badge key={idx} variant="secondary" className="font-jp">
                            {reading}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {kanjiInfo.on_readings && kanjiInfo.on_readings.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Onyomi (音読み):</p>
                      <div className="flex flex-wrap gap-1">
                        {kanjiInfo.on_readings.slice(0, 5).map((reading, idx) => (
                          <Badge key={idx} variant="outline" className="font-jp">
                            {reading}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {kanjiInfo.meanings && kanjiInfo.meanings.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Nghĩa:</p>
                      <p className="text-sm">{kanjiInfo.meanings.join(', ')}</p>
                    </div>
                  )}
                </div>
              )}

              {/* No Kanji found */}
              {kanjiCharacters.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Từ này không chứa chữ Kanji
                </p>
              )}

              {/* Save Button */}
              {onSaveToVocabulary && reading && meaning && (
                <Button onClick={handleSave} className="w-full">
                  Lưu vào từ vựng
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default KanjiStrokeOrder;
