import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Volume2, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import { cn } from '@/lib/utils';

interface VocabularyWord {
  id: string;
  word: string;
  furigana: string;
  meaning: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  category: string;
  learned: boolean;
}

const sampleVocabulary: VocabularyWord[] = [
  { id: '1', word: '食べる', furigana: 'たべる', meaning: 'to eat', level: 'N5', category: 'Verbs', learned: true },
  { id: '2', word: '飲む', furigana: 'のむ', meaning: 'to drink', level: 'N5', category: 'Verbs', learned: true },
  { id: '3', word: '見る', furigana: 'みる', meaning: 'to see', level: 'N5', category: 'Verbs', learned: false },
  { id: '4', word: '聞く', furigana: 'きく', meaning: 'to listen', level: 'N5', category: 'Verbs', learned: false },
  { id: '5', word: '大きい', furigana: 'おおきい', meaning: 'big', level: 'N5', category: 'Adjectives', learned: true },
  { id: '6', word: '小さい', furigana: 'ちいさい', meaning: 'small', level: 'N5', category: 'Adjectives', learned: false },
  { id: '7', word: '学校', furigana: 'がっこう', meaning: 'school', level: 'N5', category: 'Nouns', learned: true },
  { id: '8', word: '先生', furigana: 'せんせい', meaning: 'teacher', level: 'N5', category: 'Nouns', learned: true },
];

const Vocabulary = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [vocabulary] = useState(sampleVocabulary);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const filteredVocabulary = vocabulary.filter((word) => {
    const matchesSearch =
      word.word.includes(searchQuery) ||
      word.furigana.includes(searchQuery) ||
      word.meaning.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = !selectedLevel || word.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const learnedCount = vocabulary.filter((w) => w.learned).length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Vocabulary</h1>
            <p className="text-muted-foreground">
              {learnedCount} of {vocabulary.length} words learned
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Word
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {levels.slice(0, 4).map((level) => {
            const count = vocabulary.filter((w) => w.level === level).length;
            const learned = vocabulary.filter((w) => w.level === level && w.learned).length;
            return (
              <Card key={level} className="shadow-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gradient-sakura">{level}</p>
                  <p className="text-sm text-muted-foreground">
                    {learned}/{count} learned
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search words..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {levels.map((level) => (
              <Button
                key={level}
                variant={selectedLevel === level ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLevel(selectedLevel === level ? null : level)}
              >
                {level}
              </Button>
            ))}
          </div>
        </div>

        {/* Vocabulary List */}
        <div className="grid gap-3">
          {filteredVocabulary.map((word, index) => (
            <motion.div
              key={word.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={cn(
                'shadow-sm hover:shadow-card transition-all',
                word.learned && 'border-matcha/30 bg-matcha/5'
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <ruby className="text-2xl font-jp">
                          {word.word}
                          <rt className="text-xs text-muted-foreground">{word.furigana}</rt>
                        </ruby>
                      </div>
                      <div className="hidden sm:block text-lg">
                        {word.meaning}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="hidden sm:inline-flex">
                        {word.level}
                      </Badge>
                      <Badge variant="secondary" className="hidden md:inline-flex">
                        {word.category}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => speak(word.word)}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="sm:hidden text-muted-foreground mt-2">{word.meaning}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredVocabulary.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No words found</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vocabulary;
