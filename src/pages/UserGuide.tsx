import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, BookOpen, Brain, Mic, Trophy, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Navigation from '@/components/Navigation';

const guides = [
  {
    icon: <BookOpen className="h-6 w-6 text-sakura" />,
    title: 'Vocabulary',
    description: 'Learn and manage your word collection',
    tips: [
      'Add new words with furigana and meanings',
      'Filter by JLPT level (N5-N1)',
      'Use text-to-speech to practice pronunciation',
      'Mark words as learned to track progress',
    ],
  },
  {
    icon: <Layers className="h-6 w-6 text-matcha" />,
    title: 'Flashcards',
    description: 'Review vocabulary with spaced repetition',
    tips: [
      'Click cards to flip between word and meaning',
      'Use "I Know This" or "Review Again" to track progress',
      'Listen to pronunciation with the speaker button',
      'Complete all cards to earn XP',
    ],
  },
  {
    icon: <Brain className="h-6 w-6 text-gold" />,
    title: 'Quiz',
    description: 'Test your knowledge with quizzes',
    tips: [
      'Daily quizzes cover recent vocabulary',
      'Score points for correct answers',
      'Review wrong answers to improve',
      'Earn achievements for perfect scores',
    ],
  },
  {
    icon: <Mic className="h-6 w-6 text-sakura" />,
    title: 'Speaking',
    description: 'Practice pronunciation and speaking',
    tips: [
      'Listen to native pronunciation first',
      'Record yourself speaking',
      'Compare with the original',
      'Practice common phrases and sentences',
    ],
  },
  {
    icon: <Trophy className="h-6 w-6 text-gold" />,
    title: 'Achievements & Streaks',
    description: 'Track your progress and stay motivated',
    tips: [
      'Complete daily tasks to maintain your streak',
      'Unlock achievements for milestones',
      'Compete on the leaderboard',
      'Earn XP for all activities',
    ],
  },
];

const UserGuide = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-2">
            <HelpCircle className="h-8 w-8 text-sakura" />
            User Guide
          </h1>
          <p className="text-muted-foreground">
            Learn how to use 日本語マスター effectively
          </p>
        </div>

        {/* Quick Start */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-card border-2 border-sakura/20">
            <CardHeader>
              <CardTitle>🌸 Quick Start</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Welcome to 日本語マスター! Here's how to get started:</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Complete your daily practice tasks on the home page</li>
                <li>Learn new vocabulary and review with flashcards</li>
                <li>Test yourself with quizzes</li>
                <li>Practice speaking with pronunciation exercises</li>
                <li>Track your progress and earn achievements</li>
              </ol>
            </CardContent>
          </Card>
        </motion.div>

        {/* Feature Guides */}
        <Accordion type="single" collapsible className="space-y-4">
          {guides.map((guide, index) => (
            <motion.div
              key={guide.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <AccordionItem value={guide.title} className="border rounded-lg shadow-sm">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    {guide.icon}
                    <div className="text-left">
                      <p className="font-semibold">{guide.title}</p>
                      <p className="text-sm text-muted-foreground font-normal">
                        {guide.description}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <ul className="space-y-2 mt-2">
                    {guide.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="flex items-start gap-2">
                        <span className="text-sakura">•</span>
                        <span className="text-muted-foreground">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </main>
    </div>
  );
};

export default UserGuide;
