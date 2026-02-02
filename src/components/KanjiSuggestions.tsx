import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanjiSuggestion {
  kanji: string;
  reading: string;
  meaning: string;
  source?: string;
}

interface KanjiSuggestionsProps {
  suggestions: KanjiSuggestion[];
  onSelect: (kanji: string) => void;
  onViewStrokeOrder?: (suggestion: KanjiSuggestion) => void;
  isLoading?: boolean;
  className?: string;
}

const KanjiSuggestions: React.FC<KanjiSuggestionsProps> = ({ 
  suggestions, 
  onSelect,
  onViewStrokeOrder,
  isLoading = false,
  className 
}) => {
  if (suggestions.length === 0 && !isLoading) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-lg", className)}>
      <span className="text-xs text-muted-foreground self-center mr-1">漢字:</span>
      
      {isLoading && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Đang tra...</span>
        </div>
      )}
      
      {suggestions.map((suggestion, index) => (
        <div key={`${suggestion.kanji}-${index}`} className="flex items-center gap-1">
          <Button
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
          
          {onViewStrokeOrder && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onViewStrokeOrder(suggestion)}
              title="Xem nét viết Kanji"
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          )}
          
          {suggestion.source && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1">
              {suggestion.source === 'api' ? 'Online' : 'Local'}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
};

export default KanjiSuggestions;
