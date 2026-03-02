import { KanjiPoint } from '@/components/vocabulary/KanjiReview';

export interface CustomCollection {
  id: string;
  name: string;
  kanjis: string[]; // List of characters
}

// Đây là nơi bạn có thể thêm các bộ Kanji "đặc biệt" thủ công mà không cần Database
export const CUSTOM_COLLECTIONS: CustomCollection[] = [
  {
    id: 'MUST_KNOW',
    name: 'Kanji "Phải Biết" 🌟',
    kanjis: ['日', '月', '火', '水', '木', '金', '土', '山', '川', '田']
  },
  {
    id: 'ROMANTIC',
    name: 'Chủ đề Tình yêu 🌸',
    kanjis: ['愛', '恋', '心', '情', '想', '恵']
  }
];
