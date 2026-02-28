import { TextbookSeries, Lesson } from './types';
import { MINNA_N5_VOCAB } from '@/data/minna-n5';
import { MINNA_N4_VOCAB } from '@/data/minna-n4';
import { CustomFolder, VocabWord } from '@/hooks/useFlashcardFolders';

export const sampleWords: VocabWord[] = [
  { id: 'sample-1', word: '学校', reading: 'がっこう', hanviet: 'Học Hiệu', meaning: 'Trường học', mastery_level: null },
  { id: 'sample-2', word: '先生', reading: 'せんせい', hanviet: 'Tiên Sinh', meaning: 'Giáo viên, thầy/cô', mastery_level: null },
  { id: 'sample-3', word: '学生', reading: 'がくせい', hanviet: 'Học Sinh', meaning: 'Học sinh, sinh viên', mastery_level: null },
  { id: 'sample-4', word: '日本語', reading: 'にほんご', hanviet: 'Nhật Bản Ngữ', meaning: 'Tiếng Nhật', mastery_level: null },
  { id: 'sample-5', word: '勉強', reading: 'べんきょう', hanviet: 'Miễn Cường', meaning: 'Học tập', mastery_level: null },
  { id: 'sample-6', word: '図書館', reading: 'としょかん', hanviet: 'Đồ Thư Quán', meaning: 'Thư viện', mastery_level: null },
  { id: 'sample-7', word: '電車', reading: 'でんしゃ', hanviet: 'Điện Xa', meaning: 'Tàu điện', mastery_level: null },
  { id: 'sample-8', word: '会社', reading: 'かいしゃ', hanviet: 'Hội Xã', meaning: 'Công ty', mastery_level: null },
  { id: 'sample-9', word: 'コンビニ', reading: 'コンビニ', hanviet: null, meaning: 'Cửa hàng tiện lợi', mastery_level: null },
  { id: 'sample-10', word: 'アルバイト', reading: 'アルバイト', hanviet: null, meaning: 'Việc làm thêm', mastery_level: null },
  { id: 'sample-11', word: 'すみません', reading: 'すみません', hanviet: null, meaning: 'Xin lỗi', mastery_level: null },
  { id: 'sample-12', word: 'おはよう', reading: 'おはよう', hanviet: null, meaning: 'Chào buổi sáng', mastery_level: null },
];

export const defaultFolders: CustomFolder[] = [
  { id: 'sample-folder', name: 'Từ vựng mẫu', emoji: '📚', words: sampleWords, createdAt: new Date().toISOString() },
];

const generateMinaLessons = (): Lesson[] => {
  return Array.from({ length: 25 }, (_, i) => {
    const words = MINNA_N5_VOCAB[i] || [];
    return { id: `mina-n5-${i + 1}`, name: `Bài ${i + 1}`, words };
  });
};

const generateTangoLessons = (level: string, lessonCount: number): Lesson[] => {
  const wordsPerLesson = [15, 12, 18, 14, 16, 11, 13, 17, 10, 14, 12, 15, 13, 16, 11, 18, 14, 10, 12, 15, 13, 11, 14, 9, 12];
  return Array.from({ length: lessonCount }, (_, i) => ({
    id: `tango-${level}-${i + 1}`, name: `Bài ${i + 1}`,
    words: Array.from({ length: wordsPerLesson[i % wordsPerLesson.length] }, (_, j) => ({
      id: `t${level}-${i + 1}-${j + 1}`, word: `漢字${j + 1}`, reading: `かんじ${j + 1}`, hanviet: null, meaning: `Nghĩa ${j + 1}`, mastery_level: null,
    })),
  }));
};

export const textbookSeries: TextbookSeries[] = [
  {
    id: 'tango', name: 'Tango', nameJp: 'はじめての日本語能力試験', emoji: '🔥',
    levels: [
      { level: 'N5', totalWords: 1000, description: 'Kỳ thi Năng lực Nhật ngữ N5', lessons: generateTangoLessons('N5', 20) },
      { level: 'N4', totalWords: 1500, description: 'Kỳ thi Năng lực Nhật ngữ N4', lessons: generateTangoLessons('N4', 22) },
      { level: 'N3', totalWords: 2000, description: 'Kỳ thi Năng lực Nhật ngữ N3', lessons: generateTangoLessons('N3', 25) },
      { level: 'N2', totalWords: 2500, description: 'Kỳ thi Năng lực Nhật ngữ N2', lessons: generateTangoLessons('N2', 28) },
      { level: 'N1', totalWords: 3000, description: 'Kỳ thi Năng lực Nhật ngữ N1', lessons: generateTangoLessons('N1', 30) },
    ],
  },
  {
    id: 'mina', name: 'Mina no Nihongo', nameJp: 'みんなの日本語', emoji: '📘',
    levels: [
      { level: 'N5', totalWords: 1000, description: 'Tiếng Nhật sơ cấp I', lessons: generateMinaLessons() },
      {
        level: 'N4', totalWords: 1500, description: 'Tiếng Nhật sơ cấp II',
        lessons: Array.from({ length: 25 }, (_, i) => ({
          id: `mina-n4-${i + 26}`, name: `Bài ${i + 26}`,
          words: MINNA_N4_VOCAB[i] || [],
        })),
      },
    ],
  },
];
