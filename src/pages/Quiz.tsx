import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Navigation from '@/components/Navigation';
import { cn } from '@/lib/utils';

interface QuizQuestion {
  id: string;
  question: string;
  questionJp?: string;
  options: string[];
  correctAnswer: number;
}

const sampleQuestions: QuizQuestion[] = [
  {
    id: '1',
    question: 'What does "おはようございます" mean?',
    questionJp: 'おはようございます',
    options: ['Good evening', 'Good morning', 'Good night', 'Hello'],
    correctAnswer: 1,
  },
  {
    id: '2',
    question: 'How do you say "Thank you" in Japanese?',
    options: ['すみません', 'ありがとう', 'ごめんなさい', 'おねがいします'],
    correctAnswer: 1,
  },
  {
    id: '3',
    question: 'What is the meaning of "食べる" (taberu)?',
    questionJp: '食べる',
    options: ['To drink', 'To sleep', 'To eat', 'To walk'],
    correctAnswer: 2,
  },
  {
    id: '4',
    question: 'Which particle is used to mark the topic of a sentence?',
    options: ['を', 'に', 'は', 'で'],
    correctAnswer: 2,
  },
  {
    id: '5',
    question: 'What does "大きい" (ookii) mean?',
    questionJp: '大きい',
    options: ['Small', 'Big', 'Fast', 'Slow'],
    correctAnswer: 1,
  },
];

const Quiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);

  const question = sampleQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / sampleQuestions.length) * 100;

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    
    setShowResult(true);
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    
    setAnswers([...answers, selectedAnswer]);
  };

  const handleNext = () => {
    if (currentQuestion < sampleQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsComplete(false);
    setAnswers([]);
  };

  if (isComplete) {
    const percentage = Math.round((score / sampleQuestions.length) * 100);
    
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navigation />
        <main className="container py-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto"
          >
            <Card className="shadow-elevated border-2 border-gold/30">
              <CardContent className="p-8 text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <Trophy className="h-20 w-20 mx-auto text-gold" />
                </motion.div>
                
                <div>
                  <h2 className="text-3xl font-display font-bold mb-2">
                    Quiz Complete!
                  </h2>
                  <p className="text-muted-foreground">
                    You've finished the daily quiz
                  </p>
                </div>

                <div className="py-4">
                  <p className="text-5xl font-bold text-gradient-sakura">
                    {score}/{sampleQuestions.length}
                  </p>
                  <p className="text-lg text-muted-foreground mt-2">
                    {percentage}% correct
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-gold/10">
                  <p className="font-semibold text-gold">+{score * 10} XP earned!</p>
                </div>

                <Button onClick={handleRestart} size="lg" className="w-full gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-display font-bold">Daily Quiz</h1>
            <p className="text-muted-foreground">
              Question {currentQuestion + 1} of {sampleQuestions.length}
            </p>
          </div>

          {/* Progress */}
          <Progress value={progress} className="h-2" />

          {/* Question Card */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-xl leading-relaxed">
                {question.question}
              </CardTitle>
              {question.questionJp && (
                <p className="font-jp text-2xl text-sakura mt-2">
                  {question.questionJp}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === question.correctAnswer;
                const showCorrect = showResult && isCorrect;
                const showWrong = showResult && isSelected && !isCorrect;

                return (
                  <motion.button
                    key={index}
                    whileHover={{ scale: showResult ? 1 : 1.02 }}
                    whileTap={{ scale: showResult ? 1 : 0.98 }}
                    onClick={() => handleSelectAnswer(index)}
                    className={cn(
                      'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between',
                      !showResult && isSelected && 'border-primary bg-primary/10',
                      !showResult && !isSelected && 'border-border hover:border-primary/50',
                      showCorrect && 'border-matcha bg-matcha/10',
                      showWrong && 'border-destructive bg-destructive/10'
                    )}
                    disabled={showResult}
                  >
                    <span className="font-medium">{option}</span>
                    {showCorrect && <CheckCircle className="h-5 w-5 text-matcha" />}
                    {showWrong && <XCircle className="h-5 w-5 text-destructive" />}
                  </motion.button>
                );
              })}
            </CardContent>
          </Card>

          {/* Action Button */}
          <div className="flex justify-center">
            {!showResult ? (
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={selectedAnswer === null}
                className="w-full max-w-xs"
              >
                Check Answer
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleNext}
                className="w-full max-w-xs"
              >
                {currentQuestion < sampleQuestions.length - 1 ? 'Next Question' : 'See Results'}
              </Button>
            )}
          </div>

          {/* Score */}
          <div className="text-center text-muted-foreground">
            Current Score: <span className="font-semibold text-foreground">{score}</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Quiz;
