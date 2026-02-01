import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JapaneseTextProps {
  text: string;
  furigana?: string;
  meaning?: string;
  showFurigana?: boolean;
  clickable?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const JapaneseText: React.FC<JapaneseTextProps> = ({
  text,
  furigana,
  meaning,
  showFurigana = true,
  clickable = true,
  size = 'md',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const furiganaSizes = {
    sm: 'text-[0.5rem]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base',
  };

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const content = (
    <ruby className={`font-jp ${sizeClasses[size]} ${className}`}>
      {text}
      {showFurigana && furigana && (
        <rt className={`${furiganaSizes[size]} text-muted-foreground`}>
          {furigana}
        </rt>
      )}
    </ruby>
  );

  if (!clickable) {
    return content;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="inline-block cursor-pointer hover:bg-sakura-light/50 rounded px-1 transition-colors click-feedback">
          {content}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="center">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-jp">{text}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={speak}
              className="h-8 w-8 text-primary hover:text-primary/80"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
          {furigana && (
            <p className="text-sm text-muted-foreground font-jp">{furigana}</p>
          )}
          {meaning && (
            <p className="text-sm font-medium border-t pt-2">{meaning}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface JapaneseSentenceProps {
  segments: Array<{
    text: string;
    furigana?: string;
    meaning?: string;
  }>;
  showFurigana?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const JapaneseSentence: React.FC<JapaneseSentenceProps> = ({
  segments,
  showFurigana = true,
  size = 'md',
}) => {
  return (
    <div className="flex flex-wrap items-end gap-1">
      {segments.map((segment, index) => (
        <JapaneseText
          key={index}
          text={segment.text}
          furigana={segment.furigana}
          meaning={segment.meaning}
          showFurigana={showFurigana}
          size={size}
        />
      ))}
    </div>
  );
};

export default JapaneseText;
