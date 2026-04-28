import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JapaneseText } from '@/components/JapaneseText';
import { MINNA_N5_VOCAB } from '@/data/minna-n5';

export const WordOfTheDay = memo(function WordOfTheDay() {
  const wordOfTheDay = useMemo(() => {
    try {
      const allWords = MINNA_N5_VOCAB.flat();
      if (!allWords || allWords.length === 0) {
        return {
          word: '頑張る',
          furigana: 'がんばる',
          meaning: 'đang tải dữ liệu...',
          example: '毎日頑張っています。',
          exampleMeaning: 'Tôi đang nỗ lực mỗi ngày.',
        };
      }

      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
      const wordIndex = Math.max(0, dayOfYear % allWords.length);
      const selected = allWords[wordIndex];

      if (!selected) throw new Error('Word selection failed');

      return {
        word: selected.word,
        furigana: selected.reading || '',
        meaning: selected.meaning,
        example: selected.example || selected.example_sentence || null,
        exampleMeaning: selected.exampleMeaning || selected.example_translation || null,
      };
    } catch (e) {
      console.error('Error generating word of the day:', e);
      return {
        word: '頑張る',
        furigana: 'がんばる',
        meaning: 'cố gắng lên',
        example: null,
        exampleMeaning: null,
      };
    }
  }, []);

  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
    >
      <Card className="border-2 border-gold/20 bg-gradient-to-br from-gold-light/10 to-transparent shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-gold" />
            Từ vựng của ngày
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <JapaneseText
                text={wordOfTheDay.word}
                furigana={wordOfTheDay.furigana}
                meaning={wordOfTheDay.meaning}
                size="lg"
              />
              <p className="text-lg font-medium">{wordOfTheDay.meaning}</p>
            </div>
            {wordOfTheDay.example && (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Ví dụ:</p>
                <p className="font-jp text-lg">{wordOfTheDay.example}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {wordOfTheDay.exampleMeaning}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
});
