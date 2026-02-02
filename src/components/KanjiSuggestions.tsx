import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KanjiSuggestion {
  kanji: string;
  reading: string;
  meaning: string;
}

interface KanjiSuggestionsProps {
  suggestions: KanjiSuggestion[];
  onSelect: (kanji: string) => void;
  className?: string;
}

const KanjiSuggestions: React.FC<KanjiSuggestionsProps> = ({ 
  suggestions, 
  onSelect, 
  className 
}) => {
  if (suggestions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg", className)}>
      <span className="text-xs text-muted-foreground self-center mr-1">漢字:</span>
      {suggestions.map((suggestion, index) => (
        <Button
          key={`${suggestion.kanji}-${index}`}
          variant="outline"
          size="sm"
          className="h-auto py-1 px-2 flex flex-col items-start gap-0 hover:bg-primary/10"
          onClick={() => onSelect(suggestion.kanji)}
        >
          <span className="font-jp text-base font-medium">{suggestion.kanji}</span>
          <span className="text-[10px] text-muted-foreground">
            {suggestion.reading} • {suggestion.meaning}
          </span>
        </Button>
      ))}
    </div>
  );
};

export default KanjiSuggestions;
