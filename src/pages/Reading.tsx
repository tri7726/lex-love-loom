import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Volume2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import { JapaneseText } from '@/components/JapaneseText';

interface ReadingPassage {
  id: string;
  title: string;
  titleJp: string;
  content: string;
  translation: string;
  level: string;
}

const samplePassages: ReadingPassage[] = [
  {
    id: '1',
    title: 'My Daily Routine',
    titleJp: '私の一日',
    content: '私は毎朝六時に起きます。朝ご飯を食べて、学校に行きます。学校で日本語を勉強します。午後三時に家に帰ります。',
    translation: 'I wake up at 6 AM every morning. I eat breakfast and go to school. I study Japanese at school. I return home at 3 PM.',
    level: 'N5',
  },
  {
    id: '2',
    title: 'My Family',
    titleJp: '私の家族',
    content: '私の家族は四人です。父と母と姉と私です。父は会社員です。母は先生です。姉は大学生です。',
    translation: 'My family has four people. Father, mother, older sister, and me. Father is an office worker. Mother is a teacher. My older sister is a university student.',
    level: 'N5',
  },
];

const Reading = () => {
  const [selectedPassage, setSelectedPassage] = React.useState(samplePassages[0]);
  const [showTranslation, setShowTranslation] = React.useState(false);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.7;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-2">
            <BookOpen className="h-8 w-8 text-sakura" />
            Reading Practice
          </h1>
          <p className="text-muted-foreground">
            Improve your reading comprehension
          </p>
        </div>

        {/* Passage Selection */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {samplePassages.map((passage) => (
            <Button
              key={passage.id}
              variant={selectedPassage.id === passage.id ? 'default' : 'outline'}
              onClick={() => {
                setSelectedPassage(passage);
                setShowTranslation(false);
              }}
              className="whitespace-nowrap"
            >
              {passage.titleJp}
            </Button>
          ))}
        </div>

        {/* Reading Card */}
        <motion.div
          key={selectedPassage.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-jp text-2xl">
                    {selectedPassage.titleJp}
                  </CardTitle>
                  <p className="text-muted-foreground">{selectedPassage.title}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => speak(selectedPassage.content)}
                >
                  <Volume2 className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Japanese Content */}
              <div className="p-6 rounded-lg bg-muted/30">
                <p className="font-jp text-xl leading-loose">
                  {selectedPassage.content}
                </p>
              </div>

              {/* Translation Toggle */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowTranslation(!showTranslation)}
                >
                  {showTranslation ? 'Hide Translation' : 'Show Translation'}
                </Button>
              </div>

              {/* Translation */}
              {showTranslation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-6 rounded-lg bg-sakura/5 border border-sakura/20"
                >
                  <p className="text-lg">{selectedPassage.translation}</p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Reading;
