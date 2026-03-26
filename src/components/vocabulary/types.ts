import { VocabWord } from '@/hooks/useFlashcardFolders';

export interface Lesson {
  id: string;
  name: string;
  words: VocabWord[];
}

export interface JLPTLevel {
  level: string;
  totalWords: number;
  description: string;
  lessons: Lesson[];
}

export interface TextbookSeries {
  id: string;
  name: string;
  nameJp: string;
  emoji: string;
  levels: JLPTLevel[];
}

export type GameMode = 'classic' | 'speed' | 'listening' | 'writing' | 'pronunciation' | 'match';
export type ViewState = 'series' | 'lessons' | 'detail' | 'custom-detail';
