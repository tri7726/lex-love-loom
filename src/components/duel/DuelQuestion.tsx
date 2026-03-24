import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface DuelQuestionData {
  word: string;
  reading: string;
  correct: string;
  options: string[];
}

interface DuelQuestionProps {
  question: DuelQuestionData;
  onAnswer: (correct: boolean, timeLeft: number) => void;
  timeLimit?: number;
}

export const DuelQuestion = ({ question, onAnswer, timeLimit = 10 }: DuelQuestionProps) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [selected, setSelected] = useState<string | null>(null);
  const answered = useRef(false);

  // Reset on new question
  useEffect(() => {
    setTimeLeft(timeLimit);
    setSelected(null);
    answered.current = false;
  }, [question.word, timeLimit]);

  // Countdown
  useEffect(() => {
    if (answered.current) return;
    if (timeLeft <= 0) {
      answered.current = true;
      onAnswer(false, 0);
      return;
    }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, onAnswer]);

  const handleSelect = (option: string) => {
    if (answered.current) return;
    answered.current = true;
    setSelected(option);
    const correct = option === question.correct;
    onAnswer(correct, timeLeft);
  };

  // SVG countdown ring
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / timeLimit;
  const strokeDashoffset = circumference * (1 - progress);
  const ringColor = timeLeft > 5 ? '#22c55e' : timeLeft > 3 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-6">
      {/* Word + Timer */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-3xl font-bold font-jp">{question.word}</p>
          <p className="text-sm text-muted-foreground">{question.reading}</p>
        </div>
        <div className="relative h-16 w-16 flex items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" width="64" height="64">
            <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
            <circle
              cx="32" cy="32" r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
          </svg>
          <span className="text-lg font-black tabular-nums">{timeLeft}</span>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((opt) => {
          const isSelected = selected === opt;
          const isCorrect = opt === question.correct;
          const showResult = selected !== null;

          return (
            <motion.button
              key={opt}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(opt)}
              disabled={selected !== null}
              className={cn(
                'p-4 rounded-2xl border-2 text-sm font-bold text-left transition-all',
                !showResult && 'border-border hover:border-primary/50 hover:bg-primary/5',
                showResult && isCorrect && 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400',
                showResult && isSelected && !isCorrect && 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400',
                showResult && !isSelected && !isCorrect && 'border-border opacity-50'
              )}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
