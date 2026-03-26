import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFurigana } from '@/contexts/FuriganaContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
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
  const [isRevealed, setIsRevealed] = useState(false);
  const { mode, userLevel } = useFurigana();

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
    '2xl': 'text-6xl',
    '3xl': 'text-7xl',
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
    if (isRevealed) return true;
    if (mode === 'never') return false;
    if (mode === 'always') return true;
    if (mode === 'smart' && level) {
      const kLevel = JLPT_LEVELS[level] || 5;
      const uLevel = JLPT_LEVELS[userLevel] || 5;
      if (kLevel >= uLevel) return false;
    }
    const presetThresholds: Record<string, number> = { n5: 5, n4: 4, n3: 3, n2: 2 };
    if (mode in presetThresholds && level) {
      const kLevel = JLPT_LEVELS[level] || 5;
      const threshold = presetThresholds[mode as keyof typeof presetThresholds];
      return kLevel < threshold;
    }
    return showFurigana;
  };

  const activeShowFurigana = shouldDisplayFurigana();

  const handleRubyClick = (e: React.MouseEvent) => {
    if (!activeShowFurigana && furigana) {
      e.stopPropagation();
      setIsRevealed(true);
      setTimeout(() => setIsRevealed(false), 3000); // Hide again after 3s
    }
  };

  const content = (
    <ruby 
      className={cn(
        "font-jp transition-all duration-300", 
        sizeClasses[size], 
        !activeShowFurigana && furigana && "cursor-help opacity-90 hover:opacity-100",
        className
      )}
      onClick={handleRubyClick}
    >
      {text}
      {activeShowFurigana && furigana && (
        <rt className="animate-in fade-in slide-in-from-bottom-1 duration-300">{furigana}</rt>
      )}
    </ruby>
  );

  if (!clickable) {
    return content;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex cursor-pointer hover:bg-sakura-light/50 rounded px-0.5 transition-colors click-feedback group" style={{ alignItems: 'flex-start' }}>
          {content}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 rounded-[1.5rem] border-2 border-sakura/10 shadow-xl backdrop-blur-md bg-white/90" align="center">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-jp font-black text-slate-800">{text}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={speak}
              className="h-9 w-9 bg-sakura/5 text-sakura hover:bg-sakura hover:text-white rounded-xl transition-all"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
          {furigana && (
            <div className="flex items-center gap-2">
               <Badge variant="outline" className="text-[10px] font-black uppercase text-sakura/50 border-sakura/20">Reading</Badge>
               <p className="text-sm text-slate-500 font-jp font-bold">{furigana}</p>
            </div>
          )}
          {meaning && (
            <div className="pt-2 border-t border-sakura/10">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Meaning</p>
              <p className="text-sm font-bold text-slate-700 leading-relaxed">{meaning}</p>
            </div>
          )}
          {level && (
            <Badge className="bg-sakura/10 text-sakura border-none text-[9px] font-black">{level}</Badge>
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
    <div className="font-jp" style={{ lineHeight: showFurigana ? '3' : '1.8', wordBreak: 'keep-all', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '0 2px' }}>
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
