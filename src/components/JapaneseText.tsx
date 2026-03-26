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
        !activeShowFurigana && furigana && "cursor-help opacity-100 hover:text-sakura",
        className
      )}
      onClick={handleRubyClick}
    >
      {text}
      {activeShowFurigana && furigana && (
        <rt className="animate-in fade-in slide-in-from-bottom-1 duration-300 text-[0.45em] opacity-60 font-medium tracking-tighter mb-0.5">{furigana}</rt>
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
      <PopoverContent className="w-72 p-6 rounded-[2.5rem] border-0 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] bg-white/95 backdrop-blur-xl" align="center">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-jp font-black text-slate-800 tracking-tighter">{text}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={speak}
              className="h-10 w-10 bg-slate-50 text-slate-400 hover:bg-sakura/10 hover:text-sakura rounded-xl transition-all"
            >
              <Volume2 className="h-5 w-5" />
            </Button>
          </div>
          {furigana && (
            <div className="flex items-center gap-3">
               <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-300 border-slate-100 px-2 py-0">Reading</Badge>
               <p className="text-base text-sakura font-jp font-bold">{furigana}</p>
            </div>
          )}
          {meaning && (
            <div className="pt-4 border-t border-slate-50">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Nghĩa tiếng Việt</p>
              <p className="text-base font-display font-medium text-slate-700 leading-relaxed">{meaning}</p>
            </div>
          )}
          {level && (
            <div className="flex justify-end pt-1">
               <Badge className="bg-sakura/5 text-sakura border-sakura/10 shadow-none text-[9px] font-black px-3 py-0.5 rounded-full">{level}</Badge>
            </div>
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
