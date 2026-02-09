import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Volume2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { VocabularyData } from '@/hooks/useKanjiDetails';
import { useToast } from '@/hooks/use-toast';

interface VocabularyPanelProps {
  vocabularyByJlpt?: {
    N5: VocabularyData[];
    N4: VocabularyData[];
    N3: VocabularyData[];
    N2: VocabularyData[];
    N1: VocabularyData[];
  };
  textbookVocabulary?: VocabularyData[];
}

const VocabularyItem: React.FC<{ vocab: VocabularyData }> = ({ vocab }) => {
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  const handlePlayAudio = () => {
    // TODO: Implement Web Speech API or audio file playback
    const utterance = new SpeechSynthesisUtterance(vocab.word);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
  };

  const handleAddFlashcard = () => {
    toast({
      title: "Added to Flashcards",
      description: `${vocab.word} has been added to your deck.`,
    });
  };

  return (
    <div className="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-japanese text-lg font-medium">{vocab.word}</span>
            <span className="text-sm text-muted-foreground">
              ({vocab.reading})
            </span>
            {vocab.jlpt_level && (
              <Badge variant="outline" className="text-xs">
                {vocab.jlpt_level}
              </Badge>
            )}
          </div>

          {vocab.hanviet && (
            <div className="text-xs text-muted-foreground mb-1">
              Hán Việt: {vocab.hanviet}
            </div>
          )}

          <div className="text-sm mb-2">{vocab.meaning_vi}</div>

          {vocab.textbook_info && vocab.textbook_info.length > 0 && (
            <div className="flex gap-1 flex-wrap mb-2">
              {vocab.textbook_info.map((tb, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {tb.textbook.toUpperCase()} - Bài {tb.lesson_number}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={handlePlayAudio}
            title="Play audio"
          >
            <Volume2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleAddFlashcard}
            title="Add to flashcards"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {vocab.example_sentence && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
              title="Show example"
            >
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {showDetails && vocab.example_sentence && (
        <div className="mt-3 pt-3 border-t space-y-1">
          <p className="text-sm font-japanese">{vocab.example_sentence}</p>
          {vocab.example_translation && (
            <p className="text-sm text-muted-foreground">
              {vocab.example_translation}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const VocabularyPanel: React.FC<VocabularyPanelProps> = ({
  vocabularyByJlpt,
  textbookVocabulary,
}) => {
  const [selectedJLPT, setSelectedJLPT] = useState<string | null>(null);

  const jlptVocabList = vocabularyByJlpt
    ? Object.entries(vocabularyByJlpt).flatMap(([level, words]) =>
        words.map(w => ({ ...w, jlpt_level: level }))
      )
    : [];

  const filteredJlptVocab = selectedJLPT
    ? jlptVocabList.filter(v => v.jlpt_level === selectedJLPT)
    : jlptVocabList;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Từ vựng</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="textbook" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="textbook">📚 Giáo trình</TabsTrigger>
            <TabsTrigger value="jlpt">🎌 JLPT</TabsTrigger>
          </TabsList>

          {/* Textbook Vocabulary */}
          <TabsContent value="textbook" className="space-y-3">
            {textbookVocabulary && textbookVocabulary.length > 0 ? (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-2">
                  {textbookVocabulary.map((vocab, idx) => (
                    <VocabularyItem key={idx} vocab={vocab} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Chưa có từ vựng trong giáo trình
              </div>
            )}
          </TabsContent>

          {/* JLPT Vocabulary */}
          <TabsContent value="jlpt" className="space-y-3">
            {/* JLPT Level Filter */}
            <div className="flex gap-2 flex-wrap">
              {['N5', 'N4', 'N3', 'N2', 'N1'].map(level => {
                const count = vocabularyByJlpt?.[level as keyof typeof vocabularyByJlpt]?.length || 0;
                return (
                  <Badge
                    key={level}
                    variant={selectedJLPT === level ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedJLPT(selectedJLPT === level ? null : level)}
                  >
                    {level} ({count})
                  </Badge>
                );
              })}
            </div>

            {filteredJlptVocab.length > 0 ? (
              <ScrollArea className="h-[550px] pr-4">
                <div className="space-y-2">
                  {filteredJlptVocab.map((vocab, idx) => (
                    <VocabularyItem key={idx} vocab={vocab} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {selectedJLPT
                  ? `Không có từ vựng ${selectedJLPT}`
                  : 'Chọn cấp độ JLPT để xem từ vựng'
                }
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default VocabularyPanel;
