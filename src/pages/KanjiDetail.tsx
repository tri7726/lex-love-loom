import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useKanjiDetails } from '@/hooks/useKanjiDetails';
import HandwritingCanvas from '@/components/kanji/HandwritingCanvas';
import { useToast } from '@/hooks/use-toast';
import KanjiInfoPanel from '@/components/kanji/KanjiInfoPanel';
import VocabularyPanel from '@/components/kanji/VocabularyPanel';
import KanjiNetworkVisualization from '@/components/kanji/KanjiNetworkVisualization';

const KanjiDetail: React.FC = () => {
  const { character } = useParams<{ character: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data, isLoading, error } = useKanjiDetails({
    character,
    include_vocabulary: true,
    include_related: true,
    enabled: !!character,
  });

  const handleAddToFlashcard = async () => {
    if (!data?.kanji) return;

    // TODO: Integrate with existing flashcard creation
    toast({
      title: "Added to Flashcards",
      description: `Kanji ${data.kanji.character} has been added to your deck.`,
    });
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    // TODO: Implement prev/next navigation based on JLPT level or frequency
    toast({
      title: "Navigation",
      description: `${direction === 'prev' ? 'Previous' : 'Next'} kanji feature coming soon!`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-lg text-destructive">
          {error?.message || 'Kanji not found'}
        </p>
        <Button onClick={() => navigate('/kanji')}>
          Back to Kanji List
        </Button>
      </div>
    );
  }

  const { kanji, vocabulary_by_jlpt, textbook_vocabulary, related_kanji, user_progress, stats } = data;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">
            Kanji {kanji.character} - {kanji.hanviet} - {kanji.meaning_vi}
          </h1>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate('next')}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            onClick={handleAddToFlashcard}
            className="gap-2"
          >
            <Star className="h-4 w-4" />
            Add to Flashcard
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Writing Practice */}
        <div className="lg:col-span-1">
          <HandwritingCanvas
            kanji={kanji.character}
            strokeOrderSvg={kanji.svg_url}
            onStrokeComplete={(strokes) => {
              console.log('Strokes captured:', strokes.length);
            }}
            onValidate={() => {
              console.log('Validation requested');
            }}
          />
        </div>

        {/* Center Column: Kanji Info */}
        <div className="lg:col-span-1">
          <KanjiInfoPanel kanji={kanji} userProgress={user_progress} />
        </div>

        {/* Right Column: Vocabulary */}
        <div className="lg:col-span-1">
          <VocabularyPanel
            vocabularyByJlpt={vocabulary_by_jlpt}
            textbookVocabulary={textbook_vocabulary}
          />
        </div>
      </div>

      {/* Bottom Section: Kanji Network */}
      <div className="mt-8">
        <KanjiNetworkVisualization
          centerKanji={kanji}
          relatedKanji={related_kanji || []}
          onKanjiClick={(kanjiChar) => navigate(`/kanji/${kanjiChar}`)}
        />
      </div>

      {/* Stats Footer */}
      {stats && (
        <div className="flex gap-4 text-sm text-muted-foreground border-t pt-4">
          <div>Vocabulary: {stats.vocabulary_count} words</div>
          <div>Related Kanji: {stats.related_kanji_count}</div>
          {user_progress && (
            <>
              <div>Status: {user_progress.status}</div>
              <div>Accuracy: {user_progress.recognition_accuracy}%</div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default KanjiDetail;
