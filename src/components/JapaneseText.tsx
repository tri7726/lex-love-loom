import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFurigana } from '@/contexts/FuriganaContext';

const JLPT_LEVELS: Record<string, number> = {
  'N5': 5,
  'N4': 4,
  'N3': 3,
  'N2': 2,
  'N1': 1
};

interface JapaneseTextProps {
  text: string;
  furigana?: string;
  meaning?: string;
  showFurigana?: boolean;
  clickable?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  level?: string;
}

export const JapaneseText: React.FC<JapaneseTextProps> = ({
  text,
  furigana,
  meaning,
  showFurigana = true,
  clickable = true,
  size = 'md',
  className = '',
  level,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { mode, userLevel } = useFurigana();

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

  // Determine if furigana should be shown based on global mode and element level
  const shouldDisplayFurigana = () => {
    if (mode === 'never') return false;
    if (mode === 'always') return true;
    if (mode === 'smart' && level) {
      const kLevel = JLPT_LEVELS[level] || 5;
      const uLevel = JLPT_LEVELS[userLevel] || 5;
      // If kanji level is at or below user's level (e.g. N5 (5) >= N3 (3)), hide it.
      if (kLevel >= uLevel) return false;
    }
    // JLPT preset modes: hide furigana for words at or below the threshold level
    const presetThresholds: Record<string, number> = { n5: 5, n4: 4, n3: 3, n2: 2 };
    if (mode in presetThresholds && level) {
      const kLevel = JLPT_LEVELS[level] || 5;
      const threshold = presetThresholds[mode as keyof typeof presetThresholds];
      return kLevel < threshold; // show furigana only when word is harder than threshold
    }
    return showFurigana;
  };

  const activeShowFurigana = shouldDisplayFurigana();

  const content = (
    <ruby className={`font-jp ${sizeClasses[size]} ${className}`}>
      {text}
      {activeShowFurigana && furigana && (
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
    level?: string;
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
          level={segment.level}
        />
      ))}
    </div>
  );
};

// export default JapaneseText;
