import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Volume2,
  Star,
  RotateCcw,
  Shuffle,
  Target,
  Zap,
  Headphones,
  PenTool,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCcw,
  Sparkles,
  GraduationCap,
  TrendingUp,
  Clock,
  CheckCircle2,
  Languages,
  ArrowUpDown,
  Plus,
  FolderOpen,
  Upload,
  FileSpreadsheet,
  Trash2,
  Download,
  Eye,
  FileJson,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/Navigation';
import { cn } from '@/lib/utils';
import { MultipleChoiceGame } from '@/components/games/MultipleChoiceGame';
import { SpeedGame } from '@/components/games/SpeedGame';
import { ListeningGame } from '@/components/games/ListeningGame';
import { WriteGame } from '@/components/games/WriteGame';
import { KanjiReview } from '@/components/vocabulary/KanjiReview';

// ==================== TYPES ====================
interface VocabWord {
  id: string;
  word: string;
  reading: string | null;
  hanviet: string | null;
  meaning: string;
  mastery_level: number | null;
}

interface Lesson {
  id: string;
  name: string;
  words: VocabWord[];
}

interface JLPTLevel {
  level: string;
  totalWords: number;
  description: string;
  lessons: Lesson[];
}

interface TextbookSeries {
  id: string;
  name: string;
  nameJp: string;
  emoji: string;
  levels: JLPTLevel[];
}

type GameMode = 'classic' | 'speed' | 'listening' | 'writing';
type ViewState = 'series' | 'lessons' | 'detail' | 'custom-detail';

interface CustomFolder {
  id: string;
  name: string;
  emoji: string;
  words: VocabWord[];
  createdAt: string;
}

const CUSTOM_FOLDERS_KEY = 'lex-custom-folders';

const sampleWords: VocabWord[] = [
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

const defaultFolders: CustomFolder[] = [
  { id: 'sample-folder', name: 'Từ vựng mẫu', emoji: '📚', words: sampleWords, createdAt: new Date().toISOString() },
];

// ==================== MOCK DATA ====================
const minaN5Words: VocabWord[][] = [
  [
    { id: 'm1-1', word: 'わたし', reading: null, hanviet: null, meaning: 'tôi', mastery_level: null },
    { id: 'm1-2', word: 'あなた', reading: null, hanviet: null, meaning: 'anh/ chị/ ông/ bà', mastery_level: null },
    { id: 'm1-3', word: 'あの人', reading: 'あのひと', hanviet: 'NHÂN', meaning: 'người kia, người đó', mastery_level: null },
    { id: 'm1-4', word: '皆さん', reading: 'みなさん', hanviet: 'GIAI', meaning: 'mọi người', mastery_level: null },
    { id: 'm1-5', word: '先生', reading: 'せんせい', hanviet: 'TIÊN SINH', meaning: 'giáo viên, thầy/cô', mastery_level: null },
    { id: 'm1-6', word: '学生', reading: 'がくせい', hanviet: 'HỌC SINH', meaning: 'học sinh, sinh viên', mastery_level: null },
    { id: 'm1-7', word: '会社員', reading: 'かいしゃいん', hanviet: 'HỘI XÃ VIÊN', meaning: 'nhân viên công ty', mastery_level: null },
    { id: 'm1-8', word: '社員', reading: 'しゃいん', hanviet: 'XÃ VIÊN', meaning: 'nhân viên', mastery_level: null },
    { id: 'm1-9', word: '銀行員', reading: 'ぎんこういん', hanviet: 'NGÂN HÀNG VIÊN', meaning: 'nhân viên ngân hàng', mastery_level: null },
    { id: 'm1-10', word: '医者', reading: 'いしゃ', hanviet: 'Y GIẢ', meaning: 'bác sĩ', mastery_level: null },
    { id: 'm1-11', word: '研究者', reading: 'けんきゅうしゃ', hanviet: 'NGHIÊN CỨU GIẢ', meaning: 'nghiên cứu sinh', mastery_level: null },
    { id: 'm1-12', word: 'エンジニア', reading: null, hanviet: null, meaning: 'kỹ sư', mastery_level: null },
    { id: 'm1-13', word: '大学', reading: 'だいがく', hanviet: 'ĐẠI HỌC', meaning: 'đại học', mastery_level: null },
    { id: 'm1-14', word: '病院', reading: 'びょういん', hanviet: 'BỆNH VIỆN', meaning: 'bệnh viện', mastery_level: null },
    { id: 'm1-15', word: '電気', reading: 'でんき', hanviet: 'ĐIỆN KHÍ', meaning: 'điện', mastery_level: null },
    { id: 'm1-16', word: '誰', reading: 'だれ', hanviet: 'THÙY', meaning: 'ai', mastery_level: null },
    { id: 'm1-17', word: '何歳', reading: 'なんさい', hanviet: 'HÀ TUẾ', meaning: 'bao nhiêu tuổi', mastery_level: null },
    { id: 'm1-18', word: 'はい', reading: null, hanviet: null, meaning: 'vâng', mastery_level: null },
    { id: 'm1-19', word: 'いいえ', reading: null, hanviet: null, meaning: 'không', mastery_level: null },
    { id: 'm1-20', word: '失礼ですが', reading: 'しつれいですが', hanviet: 'THẤT LỄ', meaning: 'xin lỗi (nhưng cho hỏi)', mastery_level: null },
  ],
  [
    { id: 'm2-1', word: 'これ', reading: null, hanviet: null, meaning: 'cái này', mastery_level: null },
    { id: 'm2-2', word: 'それ', reading: null, hanviet: null, meaning: 'cái đó', mastery_level: null },
    { id: 'm2-3', word: 'あれ', reading: null, hanviet: null, meaning: 'cái kia', mastery_level: null },
    { id: 'm2-4', word: '本', reading: 'ほん', hanviet: 'BẢN', meaning: 'sách', mastery_level: null },
    { id: 'm2-5', word: '辞書', reading: 'じしょ', hanviet: 'TỪ THƯ', meaning: 'từ điển', mastery_level: null },
    { id: 'm2-6', word: '雑誌', reading: 'ざっし', hanviet: 'TẠP CHÍ', meaning: 'tạp chí', mastery_level: null },
    { id: 'm2-7', word: '新聞', reading: 'しんぶん', hanviet: 'TÂN VĂN', meaning: 'báo', mastery_level: null },
    { id: 'm2-8', word: 'ノート', reading: null, hanviet: null, meaning: 'vở, sổ tay', mastery_level: null },
    { id: 'm2-9', word: '手帳', reading: 'てちょう', hanviet: 'THỦ TRƯỚNG', meaning: 'sổ tay nhỏ', mastery_level: null },
    { id: 'm2-10', word: '名刺', reading: 'めいし', hanviet: 'DANH THÍCH', meaning: 'danh thiếp', mastery_level: null },
    { id: 'm2-11', word: 'カード', reading: null, hanviet: null, meaning: 'thẻ', mastery_level: null },
    { id: 'm2-12', word: '鉛筆', reading: 'えんぴつ', hanviet: 'DIÊN BÚT', meaning: 'bút chì', mastery_level: null },
    { id: 'm2-13', word: 'ボールペン', reading: null, hanviet: null, meaning: 'bút bi', mastery_level: null },
    { id: 'm2-14', word: 'シャープペンシル', reading: null, hanviet: null, meaning: 'bút chì bấm', mastery_level: null },
    { id: 'm2-15', word: '鍵', reading: 'かぎ', hanviet: 'KIỆN', meaning: 'chìa khóa', mastery_level: null },
    { id: 'm2-16', word: '時計', reading: 'とけい', hanviet: 'THỜI KẾ', meaning: 'đồng hồ', mastery_level: null },
    { id: 'm2-17', word: '傘', reading: 'かさ', hanviet: 'TẢN', meaning: 'ô, dù', mastery_level: null },
    { id: 'm2-18', word: 'かばん', reading: null, hanviet: null, meaning: 'cặp, túi', mastery_level: null },
  ],
  [
    { id: 'm3-1', word: 'ここ', reading: null, hanviet: null, meaning: 'ở đây', mastery_level: null },
    { id: 'm3-2', word: 'そこ', reading: null, hanviet: null, meaning: 'ở đó', mastery_level: null },
    { id: 'm3-3', word: 'あそこ', reading: null, hanviet: null, meaning: 'ở kia', mastery_level: null },
    { id: 'm3-4', word: '教室', reading: 'きょうしつ', hanviet: 'GIÁO THẤT', meaning: 'phòng học', mastery_level: null },
    { id: 'm3-5', word: '食堂', reading: 'しょくどう', hanviet: 'THỰC ĐƯỜNG', meaning: 'nhà ăn', mastery_level: null },
    { id: 'm3-6', word: '事務所', reading: 'じむしょ', hanviet: 'SỰ VỤ SỞ', meaning: 'văn phòng', mastery_level: null },
    { id: 'm3-7', word: '会議室', reading: 'かいぎしつ', hanviet: 'HỘI NGHỊ THẤT', meaning: 'phòng họp', mastery_level: null },
    { id: 'm3-8', word: '受付', reading: 'うけつけ', hanviet: 'THỤ PHÓ', meaning: 'quầy lễ tân', mastery_level: null },
    { id: 'm3-9', word: 'ロビー', reading: null, hanviet: null, meaning: 'sảnh', mastery_level: null },
    { id: 'm3-10', word: '部屋', reading: 'へや', hanviet: 'BỘ ỐC', meaning: 'phòng', mastery_level: null },
    { id: 'm3-11', word: 'トイレ', reading: null, hanviet: null, meaning: 'nhà vệ sinh', mastery_level: null },
    { id: 'm3-12', word: '階段', reading: 'かいだん', hanviet: 'GIAI ĐOẠN', meaning: 'cầu thang', mastery_level: null },
    { id: 'm3-13', word: 'エレベーター', reading: null, hanviet: null, meaning: 'thang máy', mastery_level: null },
    { id: 'm3-14', word: 'エスカレーター', reading: null, hanviet: null, meaning: 'thang cuốn', mastery_level: null },
    { id: 'm3-15', word: 'お手洗い', reading: 'おてあらい', hanviet: 'THỦ TẨY', meaning: 'nhà vệ sinh (lịch sự)', mastery_level: null },
  ],
];

const generateMinaLessons = (): Lesson[] => {
  const defaultWordCounts = [20, 18, 15, 16, 14, 17, 13, 12, 15, 11, 14, 13, 12, 16, 10, 18, 15, 10, 12, 11, 14, 13, 10, 8, 9];
  return Array.from({ length: 25 }, (_, i) => {
    const customWords = minaN5Words[i];
    if (customWords) return { id: `mina-n5-${i + 1}`, name: `Bài ${i + 1}`, words: customWords };
    const count = defaultWordCounts[i] || 10;
    return {
      id: `mina-n5-${i + 1}`, name: `Bài ${i + 1}`,
      words: Array.from({ length: count }, (_, j) => ({
        id: `mn5-${i + 1}-${j + 1}`, word: `単語${j + 1}`, reading: `たんご${j + 1}`, hanviet: null, meaning: `Nghĩa từ ${j + 1}`, mastery_level: null,
      })),
    };
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

const textbookSeries: TextbookSeries[] = [
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
          id: `mina-n4-${i + 1}`, name: `Bài ${i + 26}`,
          words: Array.from({ length: 12 + (i % 8) }, (_, j) => ({
            id: `mn4-${i + 1}-${j + 1}`, word: `語彙${j + 1}`, reading: `ごい${j + 1}`, hanviet: null, meaning: `Nghĩa ${j + 1}`, mastery_level: null,
          })),
        })),
      },
    ],
  },
];

const levelGradients: Record<string, string> = {
  N5: 'from-rose-400 via-pink-400 to-rose-500',
  N4: 'from-rose-500 via-pink-500 to-rose-600',
  N3: 'from-pink-400 via-rose-400 to-pink-500',
  N2: 'from-rose-500 via-red-400 to-pink-500',
  N1: 'from-pink-500 via-rose-500 to-red-500',
};

const levelAccents: Record<string, { ring: string; badge: string; text: string }> = {
  N5: { ring: 'ring-rose-300/40', badge: 'bg-rose-100 text-rose-700', text: 'text-rose-600' },
  N4: { ring: 'ring-pink-300/40', badge: 'bg-pink-100 text-pink-700', text: 'text-pink-600' },
  N3: { ring: 'ring-rose-300/40', badge: 'bg-rose-50 text-rose-600', text: 'text-rose-500' },
  N2: { ring: 'ring-rose-400/30', badge: 'bg-rose-100 text-rose-700', text: 'text-rose-600' },
  N1: { ring: 'ring-pink-400/30', badge: 'bg-pink-100 text-pink-700', text: 'text-pink-600' },
};

// ==================== COMPONENT ====================
export const Vocabulary = () => {
  const [view, setView] = useState<ViewState>('series');
  const [selectedSeries, setSelectedSeries] = useState<TextbookSeries | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [activeGame, setActiveGame] = useState<GameMode | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [showKanji, setShowKanji] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [displayWords, setDisplayWords] = useState<VocabWord[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [reversedCard, setReversedCard] = useState(false);

  // Custom folders
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_FOLDERS_KEY);
      return stored ? JSON.parse(stored) : defaultFolders;
    } catch { return defaultFolders; }
  });
  const [selectedCustomFolder, setSelectedCustomFolder] = useState<CustomFolder | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddWordForm, setShowAddWordForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderEmoji, setNewFolderEmoji] = useState('📝');
  const [importTab, setImportTab] = useState<'excel' | 'json'>('excel');
  const [jsonInput, setJsonInput] = useState('');
  const [importPreview, setImportPreview] = useState<VocabWord[] | null>(null);
  const [importError, setImportError] = useState('');
  const [newWord, setNewWord] = useState({ word: '', reading: '', hanviet: '', meaning: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    if (selectedLesson) {
      setDisplayWords(shuffled ? [...selectedLesson.words].sort(() => Math.random() - 0.5) : selectedLesson.words);
    }
  }, [selectedLesson, shuffled]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeGame) return;
      if (view === 'detail' && selectedLesson) {
        const words = displayWords;
        if (e.code === 'Space') {
          e.preventDefault();
          setIsFlipped((f) => !f);
          if (autoSpeak && words[flashcardIndex]) speak(words[flashcardIndex].word);
        }
        if (e.code === 'ArrowRight') {
          const next = Math.min(flashcardIndex + 1, words.length - 1);
          setFlashcardIndex(next);
          setIsFlipped(false);
          if (autoSpeak && words[next]) speak(words[next].word);
        }
        if (e.code === 'ArrowLeft') {
          const prev = Math.max(flashcardIndex - 1, 0);
          setFlashcardIndex(prev);
          setIsFlipped(false);
          if (autoSpeak && words[prev]) speak(words[prev].word);
        }
      }
      if (view === 'custom-detail' && selectedCustomFolder) {
        const words = selectedCustomFolder.words;
        if (e.code === 'Space') {
          e.preventDefault();
          setIsFlipped((f) => !f);
          if (autoSpeak && words[flashcardIndex]) speak(words[flashcardIndex].word);
        }
        if (e.code === 'ArrowRight') {
          const next = Math.min(flashcardIndex + 1, words.length - 1);
          setFlashcardIndex(next);
          setIsFlipped(false);
          if (autoSpeak && words[next]) speak(words[next].word);
        }
        if (e.code === 'ArrowLeft') {
          const prev = Math.max(flashcardIndex - 1, 0);
          setFlashcardIndex(prev);
          setIsFlipped(false);
          if (autoSpeak && words[prev]) speak(words[prev].word);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, selectedLesson, selectedCustomFolder, activeGame, displayWords, flashcardIndex, autoSpeak, speak]);

  const navigateToLessons = (series: TextbookSeries, level: JLPTLevel) => {
    setSelectedSeries(series);
    setSelectedLevel(level);
    setView('lessons');
  };

  const navigateToDetail = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setFlashcardIndex(0);
    setIsFlipped(false);
    setShuffled(false);
    setView('detail');
  };

  const goBack = () => {
    if (activeGame) { setActiveGame(null); return; }
    if (showReviewPanel) { setShowReviewPanel(false); return; }
    if (view === 'custom-detail') { setView('series'); setSelectedCustomFolder(null); setActiveGame(null); setShowReviewPanel(false); return; }
    if (view === 'detail') { setView('lessons'); setSelectedLesson(null); return; }
    if (view === 'lessons') { setView('series'); setSelectedSeries(null); setSelectedLevel(null); return; }
  };

  const toggleSaved = (wordId: string) => {
    setSavedWords((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId); else next.add(wordId);
      return next;
    });
  };

  // ─── Custom folder helpers ───
  useEffect(() => {
    localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(customFolders));
  }, [customFolders]);

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    const folder: CustomFolder = {
      id: `custom-${Date.now()}`,
      name: newFolderName.trim(),
      emoji: newFolderEmoji,
      words: [],
      createdAt: new Date().toISOString(),
    };
    setCustomFolders((prev) => [...prev, folder]);
    setNewFolderName('');
    setNewFolderEmoji('\ud83d\udcdd');
    setShowCreateDialog(false);
  };

  const deleteFolder = (folderId: string) => {
    setCustomFolders((prev) => prev.filter((f) => f.id !== folderId));
  };

  const addWordToFolder = (folderId: string, word: VocabWord) => {
    setCustomFolders((prev) =>
      prev.map((f) => f.id === folderId ? { ...f, words: [...f.words, word] } : f)
    );
  };

  const removeWordFromFolder = (folderId: string, wordId: string) => {
    setCustomFolders((prev) =>
      prev.map((f) => f.id === folderId ? { ...f, words: f.words.filter((w) => w.id !== wordId) } : f)
    );
  };

  const handleAddWord = () => {
    if (!newWord.word.trim() || !newWord.meaning.trim() || !selectedCustomFolder) return;
    const word: VocabWord = {
      id: `w-${Date.now()}`,
      word: newWord.word.trim(),
      reading: newWord.reading.trim() || null,
      hanviet: newWord.hanviet.trim() || null,
      meaning: newWord.meaning.trim(),
      mastery_level: null,
    };
    addWordToFolder(selectedCustomFolder.id, word);
    setSelectedCustomFolder((f) => f ? { ...f, words: [...f.words, word] } : f);
    setNewWord({ word: '', reading: '', hanviet: '', meaning: '' });
    setShowAddWordForm(false);
  };

  const parseJsonImport = (text: string): VocabWord[] | null => {
    try {
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) { setImportError('JSON ph\u1ea3i l\u00e0 m\u1ed9t m\u1ea3ng (array)'); return null; }
      const words: VocabWord[] = arr.map((item: Record<string, string>, idx: number) => {
        if (!item.word || !item.meaning) throw new Error(`D\u00f2ng ${idx + 1}: thi\u1ebfu "word" ho\u1eb7c "meaning"`);
        return {
          id: `imp-${Date.now()}-${idx}`,
          word: String(item.word).trim(),
          reading: item.reading ? String(item.reading).trim() : null,
          hanviet: item.hanviet ? String(item.hanviet).trim() : null,
          meaning: String(item.meaning).trim(),
          mastery_level: null,
        };
      });
      setImportError('');
      return words;
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'JSON kh\u00f4ng h\u1ee3p l\u1ec7');
      return null;
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      const words: VocabWord[] = [];
      const errors: string[] = [];
      rows.forEach((row, idx) => {
        if (!row.word && !row.meaning) return;
        if (!row.word) errors.push(`D\u00f2ng ${idx + 2}: thi\u1ebfu "word"`);
        if (!row.meaning) errors.push(`D\u00f2ng ${idx + 2}: thi\u1ebfu "meaning"`);
        if (row.word && row.meaning) {
          words.push({
            id: `imp-${Date.now()}-${idx}`,
            word: String(row.word).trim(),
            reading: row.reading ? String(row.reading).trim() : null,
            hanviet: row.hanviet ? String(row.hanviet).trim() : null,
            meaning: String(row.meaning).trim(),
            mastery_level: null,
          });
        }
      });
      if (errors.length) setImportError(errors.join('\n'));
      else setImportError('');
      setImportPreview(words);
    } catch {
      setImportError('Kh\u00f4ng \u0111\u1ecdc \u0111\u01b0\u1ee3c file Excel');
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const data = [
      { word: '\u5b66\u6821', reading: '\u304c\u3063\u3053\u3046', hanviet: 'H\u1ecdc Hi\u1ec7u', meaning: 'Tr\u01b0\u1eddng h\u1ecdc' },
      { word: '\u5148\u751f', reading: '\u305b\u3093\u305b\u3044', hanviet: 'Ti\u00ean Sinh', meaning: 'Gi\u00e1o vi\u00ean' },
      { word: '\u65e5\u672c\u8a9e', reading: '\u306b\u307b\u3093\u3054', hanviet: 'Nh\u1eadt B\u1ea3n Ng\u1eef', meaning: 'Ti\u1ebfng Nh\u1eadt' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vocabulary');
    XLSX.writeFile(wb, 'vocabulary_template.xlsx');
  };

  const confirmImport = () => {
    if (!importPreview?.length || !selectedCustomFolder) return;
    importPreview.forEach((w) => addWordToFolder(selectedCustomFolder.id, w));
    setSelectedCustomFolder((f) => f ? { ...f, words: [...f.words, ...importPreview] } : f);
    setImportPreview(null);
    setJsonInput('');
    setImportError('');
    setShowImportDialog(false);
  };

  // ==================== TIER 1: SERIES ====================
  const renderSeries = () => (
    <motion.div
      key="series"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -30 }}
      className="space-y-10"
    >
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 via-pink-50 to-white p-8 md:p-10 border border-rose-100">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-rose-300/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-tr from-pink-300/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] font-jp text-rose-300/[0.08] select-none">
            語
          </div>
        </div>
        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-rose-400" />
              <span className="text-rose-400 text-sm font-medium">Premium Learning 🌸</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-rose-800">
              Từ vựng
            </h1>
            <p className="text-rose-400 max-w-md">
              Học bản chất – không học vẹt. Hệ thống SRS giúp bạn nhớ lâu hơn, mỗi ngày một ít, thành công lớn.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-rose-500">
                <BookOpen className="h-4 w-4" /> 2 bộ sách
              </div>
              <div className="flex items-center gap-2 text-sm text-rose-500">
                <Languages className="h-4 w-4" /> 7 trình độ
              </div>
              <div className="flex items-center gap-2 text-sm text-rose-500">
                <TrendingUp className="h-4 w-4" /> 11,500+ từ
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-rose-200 text-rose-500 hover:bg-rose-100/60 bg-white/60 backdrop-blur-sm"
            onClick={() => setShowKanji(true)}
          >
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Chế độ Kanji</span>
          </Button>
        </div>
      </div>

      {/* Series */}
      {textbookSeries.map((series, seriesIdx) => (
        <motion.section
          key={series.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: seriesIdx * 0.15 }}
          className="space-y-5"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{series.emoji}</span>
            <div>
              <h2 className="text-xl font-bold">{series.name}</h2>
              <p className="text-sm text-muted-foreground font-jp">{series.nameJp}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {series.levels.map((level, idx) => {
              const grad = levelGradients[level.level] || levelGradients.N5;
              return (
                <motion.div
                  key={`${series.id}-${level.level}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: seriesIdx * 0.15 + idx * 0.07 }}
                  whileHover={{ scale: 1.04, y: -6 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Card
                    className="cursor-pointer group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300"
                    onClick={() => navigateToLessons(series, level)}
                  >
                    {/* Gradient top band */}
                    <div className={cn('h-2 bg-gradient-to-r', grad)} />
                    <CardContent className="p-5 text-center space-y-2 relative">
                      {/* Background glow */}
                      <div className={cn('absolute inset-0 bg-gradient-to-b opacity-[0.06]', grad)} />
                      <div className="relative z-10">
                        <p className="text-[10px] text-muted-foreground font-jp leading-tight truncate">
                          {series.nameJp}
                        </p>
                        <p className={cn('text-5xl font-black my-2 bg-gradient-to-br bg-clip-text text-transparent', grad)}>
                          {level.level}
                        </p>
                        <p className="text-sm font-bold">{level.totalWords.toLocaleString()} từ</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{level.description}</p>

                        {/* Mini progress (mock) */}
                        <div className="mt-3">
                          <div className="h-1 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className={cn('h-full rounded-full bg-gradient-to-r', grad)}
                              initial={{ width: 0 }}
                              animate={{ width: '0%' }}
                              transition={{ delay: 0.5, duration: 0.8 }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">0% hoàn thành</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      ))}

      {/* ─── Sổ tay của tôi ─── */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📝</span>
            <div>
              <h2 className="text-xl font-bold">Sổ tay của tôi</h2>
              <p className="text-sm text-muted-foreground">Tự tạo folder để học từ vựng riêng</p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500 text-white shadow"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Tạo folder
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {customFolders.map((folder, idx) => (
            <motion.div
              key={folder.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + idx * 0.07 }}
              whileHover={{ scale: 1.04, y: -6 }}
              whileTap={{ scale: 0.96 }}
            >
              <Card
                className="cursor-pointer group relative overflow-hidden border-2 border-rose-200 hover:border-rose-400 shadow-md hover:shadow-xl transition-all duration-300"
                onClick={() => {
                  setSelectedCustomFolder(folder);
                  setFlashcardIndex(0);
                  setIsFlipped(false);
                  setShuffled(false);
                  setShowReviewPanel(false);
                  setActiveGame(null);
                  setView('custom-detail');
                }}
              >
                <div className="h-2 bg-gradient-to-r from-rose-300 via-pink-300 to-rose-400" />
                <CardContent className="p-5 text-center space-y-2 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-rose-50/40 to-transparent" />
                  <div className="relative z-10">
                    <span className="text-4xl">{folder.emoji}</span>
                    <p className="text-sm font-bold mt-2 truncate">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">{folder.words.length} từ</p>
                  </div>
                  {folder.id !== 'sample-folder' && (
                    <button
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-red-100 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 hover:text-red-600 z-20"
                      onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Create new card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + customFolders.length * 0.07 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <Card
              className="cursor-pointer border-2 border-dashed border-rose-300 hover:border-rose-400 transition-all duration-300 h-full min-h-[140px] flex items-center justify-center"
              onClick={() => setShowCreateDialog(true)}
            >
              <CardContent className="p-5 text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                  className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center mx-auto mb-2"
                >
                  <Plus className="h-6 w-6 text-rose-400" />
                </motion.div>
                <p className="text-sm font-medium text-rose-400">Tạo folder mới</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.section>

      {/* Create Dialog */}
      <AnimatePresence>
        {showCreateDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-background rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-5 border border-rose-200"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-rose-400" />
                Tạo folder mới
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Emoji</label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {['📝', '📚', '🌸', '⭐', '🚀', '💡', '🎯', '🌟'].map((e) => (
                      <button
                        key={e}
                        className={cn('w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all', newFolderEmoji === e ? 'bg-rose-200 ring-2 ring-rose-400' : 'bg-muted hover:bg-rose-100')}
                        onClick={() => setNewFolderEmoji(e)}
                      >{e}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tên folder</label>
                  <input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Ví dụ: Từ vựng công ty, JLPT N3 yếu..."
                    className="w-full mt-1 px-4 py-3 rounded-xl border border-rose-200 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none transition-all bg-background"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Hủy</Button>
                <Button
                  className="bg-gradient-to-r from-rose-400 to-pink-400 text-white"
                  disabled={!newFolderName.trim()}
                  onClick={createFolder}
                >
                  Tạo folder
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  // ==================== TIER 2: LESSONS ====================
  const renderLessons = () => {
    if (!selectedSeries || !selectedLevel) return null;
    const accent = levelAccents[selectedLevel.level] || levelAccents.N5;
    const grad = levelGradients[selectedLevel.level] || levelGradients.N5;

    return (
      <motion.div
        key="lessons"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        className="space-y-6"
      >
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>

        {/* Level header card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className={cn('h-2 bg-gradient-to-r', grad)} />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn('w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-2xl font-black shadow-lg', grad)}>
                  {selectedLevel.level}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{selectedSeries.name}</h1>
                  <p className="text-muted-foreground">{selectedLevel.description}</p>
                </div>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-2xl font-bold">{selectedLevel.lessons.length}</p>
                <p className="text-xs text-muted-foreground">bài học</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {selectedLevel.lessons.map((lesson, idx) => (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.025 }}
            >
              <Card
                className={cn(
                  'cursor-pointer group hover:shadow-md transition-all duration-200 border hover:border-transparent overflow-hidden',
                  `hover:ring-2 ${accent.ring}`
                )}
                onClick={() => navigateToDetail(lesson)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                    accent.badge, 'group-hover:scale-110 transition-transform'
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{lesson.name}</p>
                    <p className="text-xs text-muted-foreground">{lesson.words.length} từ vựng</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  // ==================== TIER 3: DETAIL ====================
  const renderDetail = () => {
    if (!selectedLesson || !selectedSeries || !selectedLevel) return null;
    const words = displayWords.length ? displayWords : selectedLesson.words;
    const currentWord = words[flashcardIndex];
    const lessonIndex = selectedLevel.lessons.indexOf(selectedLesson);
    const hasNext = lessonIndex < selectedLevel.lessons.length - 1;
    const grad = levelGradients[selectedLevel.level] || levelGradients.N5;
    const accent = levelAccents[selectedLevel.level] || levelAccents.N5;
    const progress = words.length > 0 ? ((flashcardIndex + 1) / words.length) * 100 : 0;

    if (activeGame) {
      return (
        <motion.div key="game" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)} className="gap-1 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Quay lại bài học
          </Button>
          {activeGame === 'classic' && <MultipleChoiceGame vocabulary={words} onComplete={() => setActiveGame(null)} onUpdateMastery={() => {}} onBack={() => setActiveGame(null)} />}
          {activeGame === 'speed' && <SpeedGame vocabulary={words} onComplete={() => setActiveGame(null)} onUpdateMastery={() => {}} onBack={() => setActiveGame(null)} />}
          {activeGame === 'listening' && <ListeningGame vocabulary={words} onComplete={() => setActiveGame(null)} onUpdateMastery={() => {}} onBack={() => setActiveGame(null)} />}
          {activeGame === 'writing' && <WriteGame vocabulary={words} onComplete={() => setActiveGame(null)} onUpdateMastery={() => {}} onBack={() => setActiveGame(null)} />}
        </motion.div>
      );
    }

    return (
      <motion.div
        key="detail"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
          <div className="flex items-center gap-2">
            <Badge className={cn('font-bold', accent.badge)}>{selectedLevel.level}</Badge>
            <span className="font-bold">{selectedSeries.name} – {selectedLesson.name}</span>
          </div>
          {hasNext ? (
            <Button
              variant="ghost" size="sm" className="gap-1 text-muted-foreground"
              onClick={() => navigateToDetail(selectedLevel.lessons[lessonIndex + 1])}
            >
              Tiếp <ArrowRight className="h-4 w-4" />
            </Button>
          ) : <div className="w-20" />}
        </div>

        {/* Flashcard */}
        {currentWord && (
          <div className="perspective-1000">
            <motion.div
              className="relative cursor-pointer select-none"
              onClick={() => {
                const willFlip = !isFlipped;
                setIsFlipped(willFlip);
                if (autoSpeak && currentWord) speak(currentWord.word);
              }}
            >
              <div className={cn(
                'relative rounded-3xl overflow-hidden min-h-[240px] md:min-h-[280px] shadow-2xl shadow-rose-200/40',
                'bg-gradient-to-br from-rose-100 via-pink-50 to-white border border-rose-200'
              )}>
                {/* Decorative elements */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className={cn('absolute -top-20 -right-20 w-52 h-52 bg-gradient-to-br rounded-full blur-3xl opacity-20', grad)} />
                  <div className={cn('absolute -bottom-16 -left-16 w-40 h-40 bg-gradient-to-tr rounded-full blur-3xl opacity-15', grad)} />
                  <div className="absolute top-4 right-4 text-rose-200/40 text-[80px] font-jp select-none leading-none">
                    {isFlipped ? '🌸' : '語'}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-rose-200/30">
                  <motion.div
                    className={cn('h-full bg-gradient-to-r', grad)}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center min-h-[240px] md:min-h-[280px] p-8">
                  <AnimatePresence mode="wait">
                    {(reversedCard ? isFlipped : !isFlipped) ? (
                      <motion.div
                        key={`front-${flashcardIndex}`}
                        initial={{ opacity: 0, rotateY: -90 }}
                        animate={{ opacity: 1, rotateY: 0 }}
                        exit={{ opacity: 0, rotateY: 90 }}
                        transition={{ duration: 0.3 }}
                        className="text-center"
                      >
                        <p className="text-6xl md:text-7xl font-jp text-rose-800 mb-4 drop-shadow-sm">{currentWord.word}</p>
                        {currentWord.reading && (
                          <p className="text-xl text-rose-400 font-jp">{currentWord.reading}</p>
                        )}
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <span className="text-xs text-rose-400 border border-rose-200 rounded-full px-3 py-1">
                            nhấp để lật
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`back-${flashcardIndex}`}
                        initial={{ opacity: 0, rotateY: 90 }}
                        animate={{ opacity: 1, rotateY: 0 }}
                        exit={{ opacity: 0, rotateY: -90 }}
                        transition={{ duration: 0.3 }}
                        className="text-center"
                      >
                        <p className="text-3xl md:text-4xl font-bold text-rose-800 mb-3">{currentWord.meaning}</p>
                        {currentWord.hanviet && (
                          <p className="text-base text-amber-400/80 uppercase tracking-widest font-medium">{currentWord.hanviet}</p>
                        )}
                        <p className="text-lg text-rose-400 font-jp mt-2">{currentWord.word} {currentWord.reading && `(${currentWord.reading})`}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Nav arrows */}
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-rose-200/30 backdrop-blur-sm flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-200/50 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    const prev = Math.max(0, flashcardIndex - 1);
                    setFlashcardIndex(prev);
                    setIsFlipped(false);
                    if (autoSpeak && displayWords[prev]) speak(displayWords[prev].word);
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-rose-200/30 backdrop-blur-sm flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-200/50 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = Math.min(words.length - 1, flashcardIndex + 1);
                    setFlashcardIndex(next);
                    setIsFlipped(false);
                    if (autoSpeak && displayWords[next]) speak(displayWords[next].word);
                  }}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                  <span className="text-sm text-rose-400 font-medium tabular-nums">
                    {flashcardIndex + 1} / {words.length}
                  </span>
                </div>
              </div>
            </motion.div>

            <p className="text-center text-xs text-muted-foreground mt-3">
              Nhấn <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Space</kbd> để lật · <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">←</kbd> <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">→</kbd> để chuyển
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className="inline-flex bg-muted rounded-lg p-1 gap-1">
            <Button variant="default" size="sm" className="rounded-md text-xs h-8">Từ đơn</Button>
            <Button variant="ghost" size="sm" className="rounded-md text-xs h-8">Ví dụ</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600">
              <X className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-green-200 text-green-400 hover:bg-green-50 hover:text-green-600">
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => { setFlashcardIndex(0); setIsFlipped(false); }}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => speak(currentWord?.word || '')}>
              <Volume2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className={cn('h-9 w-9 rounded-xl', shuffled && 'bg-primary/10 text-primary')}
              onClick={() => setShuffled(!shuffled)}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className={cn('h-9 w-9 rounded-xl', autoSpeak && 'bg-rose-100 text-rose-600')}
              onClick={() => setAutoSpeak(!autoSpeak)}
              title={autoSpeak ? 'Tắt tự phát âm' : 'Bật tự phát âm khi lật'}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className={cn('h-9 w-9 rounded-xl', reversedCard && 'bg-pink-100 text-pink-600')}
              onClick={() => { setReversedCard(!reversedCard); setIsFlipped(false); }}
              title={reversedCard ? 'Mặt trước: Từ JP' : 'Mặt trước: Nghĩa VN'}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Review Button */}
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Button
            className={cn(
              'w-full gap-3 py-7 text-lg font-bold rounded-2xl shadow-lg transition-all duration-300',
              'bg-gradient-to-r from-rose-400 via-pink-400 to-rose-500',
              'hover:from-rose-500 hover:via-pink-500 hover:to-rose-600',
              'hover:shadow-xl hover:shadow-rose-300/40 text-white'
            )}
            onClick={() => setShowReviewPanel(!showReviewPanel)}
          >
            <Target className="h-5 w-5" />
            Ôn tập bài này
            <Sparkles className="h-4 w-4 opacity-60" />
          </Button>
        </motion.div>

        {/* Review Panel */}
        <AnimatePresence>
          {showReviewPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <Card className="border-0 shadow-xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-rose-300 via-pink-300 to-rose-400" />
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-rose-400" />
                    <h3 className="font-bold text-lg">Chọn chế độ chơi</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { mode: 'classic' as GameMode, icon: Target, label: 'Cổ điển', desc: 'Trắc nghiệm không giới hạn', gradient: 'from-rose-50 to-pink-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-rose-500', shadow: 'hover:shadow-rose-100' },
                      { mode: 'speed' as GameMode, icon: Zap, label: 'Tốc độ', desc: '10 giây mỗi câu', gradient: 'from-pink-50 to-rose-50', border: 'border-pink-200 hover:border-pink-400', iconColor: 'text-pink-500', shadow: 'hover:shadow-pink-100' },
                      { mode: 'listening' as GameMode, icon: Headphones, label: 'Nghe', desc: 'Nghe và chọn đáp án', gradient: 'from-rose-50 to-pink-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-rose-400', shadow: 'hover:shadow-rose-100' },
                      { mode: 'writing' as GameMode, icon: PenTool, label: 'Viết', desc: 'Tự gõ đáp án', gradient: 'from-pink-50 to-rose-50', border: 'border-pink-200 hover:border-pink-400', iconColor: 'text-pink-400', shadow: 'hover:shadow-pink-100' },
                    ].map(({ mode, icon: Icon, label, desc, gradient, border, iconColor, shadow }) => (
                      <motion.div key={mode} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Card
                          className={cn('cursor-pointer border-2 transition-all duration-200 shadow-sm', border, shadow, `bg-gradient-to-br ${gradient}`)}
                          onClick={() => { setActiveGame(mode); setShowReviewPanel(false); }}
                        >
                          <CardContent className="p-4 space-y-2">
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-white/80 shadow-sm', iconColor)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <p className="font-bold">{label}</p>
                            <p className="text-xs text-muted-foreground">{desc}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex justify-around pt-4 border-t text-center">
                    <div>
                      <p className="text-2xl font-bold text-rose-500">{words.length}</p>
                      <p className="text-xs text-muted-foreground">Câu hỏi</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-500">4</p>
                      <p className="text-xs text-muted-foreground">Chế độ</p>
                    </div>
                    <div>
                      <p className={cn('text-2xl font-bold', accent.text)}>{selectedLevel.level}</p>
                      <p className="text-xs text-muted-foreground">Level</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Word List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Thuật ngữ trong bài ({words.length})</h3>
            <Badge variant="outline" className="text-xs">
              {savedWords.size} đã lưu
            </Badge>
          </div>
          <div className="space-y-2">
            {words.map((word, idx) => (
              <motion.div
                key={word.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.015 }}
              >
                <Card
                  className={cn(
                    'group transition-all duration-200 hover:shadow-md cursor-pointer border',
                    flashcardIndex === idx && 'ring-2 ring-primary/30 border-primary/40',
                    idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                  )}
                  onClick={() => { setFlashcardIndex(idx); setIsFlipped(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-[90px] shrink-0">
                      <p className="text-xl font-jp font-bold">{word.word}</p>
                    </div>
                    <div className="border-l pl-4 flex-1 min-w-0 space-y-0.5">
                      {word.reading && (
                        <p className="text-sm text-muted-foreground font-jp">{word.reading}</p>
                      )}
                      {word.hanviet && (
                        <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">{word.hanviet}</p>
                      )}
                      <p className="text-sm">{word.meaning}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); speak(word.word); }}
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); toggleSaved(word.id); }}
                      >
                        <Star className={cn('h-4 w-4 transition-colors', savedWords.has(word.id) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  // ==================== CUSTOM FOLDER DETAIL ====================
  const renderCustomDetail = () => {
    if (!selectedCustomFolder) return null;
    const folder = selectedCustomFolder;
    const words = folder.words;
    const currentWord = words[flashcardIndex];

    if (activeGame) {
      const gameVocab = words.map((w) => ({
        id: w.id, word: w.word, reading: w.reading || '', meaning: w.meaning, mastery_level: w.mastery_level,
      }));
      const onGameComplete = (results: { correct: number; total: number }) => {
        console.log('Game completed:', results);
      };
      const onUpdateMastery = (wordId: string, correct: boolean) => {
        console.log('Update mastery:', wordId, correct);
      };

      return (
        <motion.div key="custom-game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Quay lại
          </Button>
          {activeGame === 'classic' && <MultipleChoiceGame vocabulary={gameVocab} onComplete={onGameComplete} onBack={goBack} onUpdateMastery={onUpdateMastery} />}
          {activeGame === 'speed' && <SpeedGame vocabulary={gameVocab} onComplete={onGameComplete} onBack={goBack} onUpdateMastery={onUpdateMastery} />}
          {activeGame === 'listening' && <ListeningGame vocabulary={gameVocab} onComplete={onGameComplete} onBack={goBack} onUpdateMastery={onUpdateMastery} />}
          {activeGame === 'writing' && <WriteGame vocabulary={gameVocab} onComplete={onGameComplete} onBack={goBack} onUpdateMastery={onUpdateMastery} />}
        </motion.div>
      );
    }

    return (
      <motion.div
        key="custom-detail"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        className="space-y-6"
      >
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Quay lại
        </Button>

        {/* Folder header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 via-pink-50 to-white border border-rose-100 p-6">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{folder.emoji}</span>
              <div>
                <h2 className="text-2xl font-bold text-rose-800">{folder.name}</h2>
                <p className="text-sm text-rose-400">{words.length} từ vựng</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-2 border-rose-200 text-rose-600" onClick={() => setShowAddWordForm(true)}>
                <Plus className="h-4 w-4" /> Thêm từ
              </Button>
              <Button size="sm" variant="outline" className="gap-2 border-rose-200 text-rose-600" onClick={() => { setShowImportDialog(true); setImportPreview(null); setImportError(''); setJsonInput(''); }}>
                <Upload className="h-4 w-4" /> Import
              </Button>
            </div>
          </div>
        </div>

        {/* Add Word Form */}
        <AnimatePresence>
          {showAddWordForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Card className="border-rose-200">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold text-sm flex items-center gap-2"><Plus className="h-4 w-4 text-rose-400" /> Thêm từ mới</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={newWord.word} onChange={(e) => setNewWord({ ...newWord, word: e.target.value })} placeholder="Từ tiếng Nhật *" className="px-3 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-300 outline-none text-sm font-jp bg-background" autoFocus />
                    <input value={newWord.reading} onChange={(e) => setNewWord({ ...newWord, reading: e.target.value })} placeholder="Reading (hiragana)" className="px-3 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-300 outline-none text-sm font-jp bg-background" />
                    <input value={newWord.hanviet} onChange={(e) => setNewWord({ ...newWord, hanviet: e.target.value })} placeholder="Hán Việt" className="px-3 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-300 outline-none text-sm bg-background" />
                    <input value={newWord.meaning} onChange={(e) => setNewWord({ ...newWord, meaning: e.target.value })} placeholder="Nghĩa tiếng Việt *" className="px-3 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-300 outline-none text-sm bg-background" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setShowAddWordForm(false)}>Hủy</Button>
                    <Button size="sm" className="bg-gradient-to-r from-rose-400 to-pink-400 text-white" disabled={!newWord.word.trim() || !newWord.meaning.trim()} onClick={handleAddWord}>Thêm</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Flashcard */}
        {words.length > 0 && currentWord ? (
          <>
            <div className="perspective-1000">
              <motion.div
                className="relative cursor-pointer select-none"
              >
                <div className={cn(
                  'relative rounded-3xl overflow-hidden min-h-[240px] md:min-h-[280px] shadow-2xl shadow-rose-200/40',
                  'bg-gradient-to-br from-rose-100 via-pink-50 to-white border border-rose-200'
                )}>
                  {/* Decorative elements */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-52 h-52 bg-gradient-to-br from-rose-300 to-pink-200 rounded-full blur-3xl opacity-20" />
                    <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-gradient-to-tr from-pink-300 to-rose-200 rounded-full blur-3xl opacity-15" />
                    <div className="absolute top-4 right-4 text-rose-200/40 text-[80px] font-jp select-none leading-none">
                      {(reversedCard ? isFlipped : !isFlipped) ? '語' : '🌸'}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-rose-200/30 pointer-events-none">
                    <motion.div
                      className="h-full bg-gradient-to-r from-rose-300 via-pink-300 to-rose-400"
                      animate={{ width: `${((flashcardIndex + 1) / words.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  {/* Content — clickable area */}
                  <div
                    className="relative z-10 flex flex-col items-center justify-center min-h-[240px] md:min-h-[280px] p-8 cursor-pointer"
                    onClick={() => {
                      const willFlip = !isFlipped;
                      setIsFlipped(willFlip);
                      if (autoSpeak && currentWord) speak(currentWord.word);
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {(reversedCard ? isFlipped : !isFlipped) ? (
                        <motion.div
                          key={`front-${flashcardIndex}`}
                          initial={{ opacity: 0, rotateY: -90 }}
                          animate={{ opacity: 1, rotateY: 0 }}
                          exit={{ opacity: 0, rotateY: 90 }}
                          transition={{ duration: 0.3 }}
                          className="text-center"
                        >
                          <p className="text-6xl md:text-7xl font-jp text-rose-800 mb-4 drop-shadow-sm">{currentWord.word}</p>
                          {currentWord.reading && (
                            <p className="text-xl text-rose-400 font-jp">{currentWord.reading}</p>
                          )}
                          <div className="mt-4 flex items-center justify-center gap-2">
                            <span className="text-xs text-rose-400 border border-rose-200 rounded-full px-3 py-1">
                              nhấp để lật
                            </span>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key={`back-${flashcardIndex}`}
                          initial={{ opacity: 0, rotateY: 90 }}
                          animate={{ opacity: 1, rotateY: 0 }}
                          exit={{ opacity: 0, rotateY: -90 }}
                          transition={{ duration: 0.3 }}
                          className="text-center"
                        >
                          <p className="text-3xl md:text-4xl font-bold text-rose-800 mb-3">{currentWord.meaning}</p>
                          {currentWord.hanviet && (
                            <p className="text-base text-amber-400/80 uppercase tracking-widest font-medium">{currentWord.hanviet}</p>
                          )}
                          <p className="text-lg text-rose-400 font-jp mt-2">{currentWord.word} {currentWord.reading && `(${currentWord.reading})`}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Nav arrows */}
                  <button
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-rose-200/30 backdrop-blur-sm flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-200/50 transition-all z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      const prev = Math.max(0, flashcardIndex - 1);
                      setFlashcardIndex(prev);
                      setIsFlipped(false);
                      if (autoSpeak && words[prev]) speak(words[prev].word);
                    }}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-rose-200/30 backdrop-blur-sm flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-200/50 transition-all z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = Math.min(words.length - 1, flashcardIndex + 1);
                      setFlashcardIndex(next);
                      setIsFlipped(false);
                      if (autoSpeak && words[next]) speak(words[next].word);
                    }}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  {/* Counter */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <span className="text-sm text-rose-400 font-medium tabular-nums">
                      {flashcardIndex + 1} / {words.length}
                    </span>
                  </div>
                </div>
              </motion.div>

              <p className="text-center text-xs text-muted-foreground mt-3">
                Nhấn <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Space</kbd> để lật · <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">←</kbd> <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">→</kbd> để chuyển
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600">
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-green-200 text-green-400 hover:bg-green-50 hover:text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => { setFlashcardIndex(0); setIsFlipped(false); }}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => speak(currentWord?.word || '')}>
                  <Volume2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className={cn('h-9 w-9 rounded-xl', shuffled && 'bg-primary/10 text-primary')}
                  onClick={() => setShuffled(!shuffled)}
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className={cn('h-9 w-9 rounded-xl', autoSpeak && 'bg-rose-100 text-rose-600')}
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  title={autoSpeak ? 'Tắt tự phát âm' : 'Bật tự phát âm khi lật'}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className={cn('h-9 w-9 rounded-xl', reversedCard && 'bg-pink-100 text-pink-600')}
                  onClick={() => { setReversedCard(!reversedCard); setIsFlipped(false); }}
                  title={reversedCard ? 'Mặt trước: Từ JP' : 'Mặt trước: Nghĩa VN'}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Review Button */}
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                className={cn(
                  'w-full gap-3 py-7 text-lg font-bold rounded-2xl shadow-lg transition-all duration-300',
                  'bg-gradient-to-r from-rose-400 via-pink-400 to-rose-500',
                  'hover:from-rose-500 hover:via-pink-500 hover:to-rose-600',
                  'hover:shadow-xl hover:shadow-rose-300/40 text-white'
                )}
                onClick={() => setShowReviewPanel(!showReviewPanel)}
              >
                <Target className="h-5 w-5" />
                {showReviewPanel ? 'Ẩn ôn tập' : '🎯 Ôn tập ngay!'}
                <Sparkles className="h-5 w-5" />
              </Button>
            </motion.div>

            {/* Review Panel */}
            <AnimatePresence>
              {showReviewPanel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-rose-300 via-pink-300 to-rose-400" />
                    <CardContent className="p-5 space-y-4">
                      <h3 className="font-bold flex items-center gap-2"><Target className="h-4 w-4 text-rose-500" /> Chọn chế độ ôn tập</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {([
                          { mode: 'classic' as GameMode, icon: Target, label: 'Cổ điển', desc: 'Chọn đáp án đúng', gradient: 'from-rose-50 to-pink-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-rose-500' },
                          { mode: 'speed' as GameMode, icon: Zap, label: 'Tốc độ', desc: 'Trả lời nhanh', gradient: 'from-pink-50 to-rose-50', border: 'border-pink-200 hover:border-pink-400', iconColor: 'text-pink-500' },
                          { mode: 'listening' as GameMode, icon: Headphones, label: 'Nghe', desc: 'Nghe và chọn', gradient: 'from-rose-50 to-pink-50', border: 'border-rose-200 hover:border-rose-400', iconColor: 'text-rose-400' },
                          { mode: 'writing' as GameMode, icon: PenTool, label: 'Viết', desc: 'Gõ reading', gradient: 'from-pink-50 to-rose-50', border: 'border-pink-200 hover:border-pink-400', iconColor: 'text-pink-400' },
                        ]).map(({ mode, icon: Icon, label, desc, gradient, border, iconColor }) => (
                          <motion.div key={mode} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.95 }}>
                            <Card
                              className={cn('cursor-pointer transition-all duration-200 hover:shadow-md', `bg-gradient-to-br ${gradient} ${border} border`)}
                              onClick={() => { if (words.length >= 4) setActiveGame(mode); }}
                            >
                              <CardContent className="p-4 text-center space-y-2">
                                <Icon className={cn('h-6 w-6 mx-auto', iconColor)} />
                                <p className="text-sm font-bold">{label}</p>
                                <p className="text-[10px] text-muted-foreground">{desc}</p>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                      {words.length < 4 && <p className="text-xs text-center text-rose-400">Cần ít nhất 4 từ để ôn tập</p>}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <Card className="border-rose-200 border-dashed border-2">
            <CardContent className="p-8 text-center space-y-3">
              <FolderOpen className="h-12 w-12 text-rose-300 mx-auto" />
              <p className="text-muted-foreground">Chưa có từ nào. Thêm từ hoặc import để bắt đầu!</p>
            </CardContent>
          </Card>
        )}

        {/* Word List */}
        {words.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Danh sách từ ({words.length})</h3>
            <div className="space-y-2">
              {words.map((word, idx) => (
                <motion.div key={word.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.015 }}>
                  <Card className={cn('group transition-all duration-200 hover:shadow-md cursor-pointer border', flashcardIndex === idx && 'ring-2 ring-rose-300/50 border-rose-300', idx % 2 === 0 ? 'bg-card' : 'bg-muted/20')}
                    onClick={() => { setFlashcardIndex(idx); setIsFlipped(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{idx + 1}</div>
                      <div className="min-w-[90px] shrink-0">
                        <p className="text-xl font-jp font-bold">{word.word}</p>
                      </div>
                      <div className="border-l pl-4 flex-1 min-w-0 space-y-0.5">
                        {word.reading && <p className="text-sm text-muted-foreground font-jp">{word.reading}</p>}
                        {word.hanviet && <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">{word.hanviet}</p>}
                        <p className="text-sm">{word.meaning}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); speak(word.word); }}>
                          <Volume2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600" onClick={(e) => {
                          e.stopPropagation();
                          removeWordFromFolder(folder.id, word.id);
                          setSelectedCustomFolder((f) => f ? { ...f, words: f.words.filter((w) => w.id !== word.id) } : f);
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Import Dialog */}
        <AnimatePresence>
          {showImportDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowImportDialog(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-background rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-5 border border-rose-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Upload className="h-5 w-5 text-rose-400" />
                    Import từ vựng
                  </h3>
                  <button onClick={() => setShowImportDialog(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                  <button
                    className={cn('px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all', importTab === 'excel' ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-300' : 'bg-muted hover:bg-rose-50')}
                    onClick={() => { setImportTab('excel'); setImportPreview(null); setImportError(''); }}
                  >
                    <FileSpreadsheet className="h-4 w-4" /> Excel
                  </button>
                  <button
                    className={cn('px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all', importTab === 'json' ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-300' : 'bg-muted hover:bg-rose-50')}
                    onClick={() => { setImportTab('json'); setImportPreview(null); setImportError(''); }}
                  >
                    <FileJson className="h-4 w-4" /> JSON
                  </button>
                </div>

                {/* Format Guide */}
                <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-100">
                  <p className="text-sm font-bold text-rose-700 mb-2">📋 Hướng dẫn format ({importTab === 'excel' ? 'Excel' : 'JSON'})</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-rose-100/50">
                          <th className="px-3 py-2 text-left font-bold text-rose-700">{importTab === 'excel' ? 'Cột' : 'Key'}</th>
                          <th className="px-3 py-2 text-left text-rose-700">Mô tả</th>
                          <th className="px-3 py-2 text-left text-rose-700">Ví dụ</th>
                          <th className="px-3 py-2 text-center text-rose-700">Bắt buộc</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-rose-100"><td className="px-3 py-1.5 font-mono text-xs">word</td><td className="px-3 py-1.5">Từ tiếng Nhật</td><td className="px-3 py-1.5 font-jp">学校</td><td className="px-3 py-1.5 text-center text-green-600">✅</td></tr>
                        <tr className="border-t border-rose-100"><td className="px-3 py-1.5 font-mono text-xs">reading</td><td className="px-3 py-1.5">Cách đọc</td><td className="px-3 py-1.5 font-jp">がっこう</td><td className="px-3 py-1.5 text-center text-muted-foreground">—</td></tr>
                        <tr className="border-t border-rose-100"><td className="px-3 py-1.5 font-mono text-xs">hanviet</td><td className="px-3 py-1.5">Hán Việt</td><td className="px-3 py-1.5">Học Hiệu</td><td className="px-3 py-1.5 text-center text-muted-foreground">—</td></tr>
                        <tr className="border-t border-rose-100"><td className="px-3 py-1.5 font-mono text-xs">meaning</td><td className="px-3 py-1.5">Nghĩa tiếng Việt</td><td className="px-3 py-1.5">Trường học</td><td className="px-3 py-1.5 text-center text-green-600">✅</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Excel tab */}
                {importTab === 'excel' && (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Button variant="outline" size="sm" className="gap-2 border-rose-200 text-rose-600" onClick={downloadTemplate}>
                        <Download className="h-4 w-4" /> Tải file mẫu (.xlsx)
                      </Button>
                      <Button size="sm" className="gap-2 bg-gradient-to-r from-rose-400 to-pink-400 text-white" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4" /> Chọn file Excel
                      </Button>
                      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
                    </div>
                  </div>
                )}

                {/* JSON tab */}
                {importTab === 'json' && (
                  <div className="space-y-3">
                    <textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder={'[\n  { "word": "学校", "reading": "がっこう", "hanviet": "Học Hiệu", "meaning": "Trường học" }\n]'}
                      className="w-full h-40 px-4 py-3 rounded-xl border border-rose-200 focus:ring-2 focus:ring-rose-300 outline-none text-sm font-mono bg-background resize-none"
                    />
                    <Button size="sm" className="gap-2 bg-gradient-to-r from-rose-400 to-pink-400 text-white" onClick={() => { const w = parseJsonImport(jsonInput); if (w) setImportPreview(w); }}>
                      <Eye className="h-4 w-4" /> Preview
                    </Button>
                  </div>
                )}

                {/* Error */}
                {importError && (
                  <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm whitespace-pre-wrap border border-red-200">{importError}</div>
                )}

                {/* Preview */}
                {importPreview && importPreview.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-green-600">✅ {importPreview.length} từ sẵn sàng import</p>
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-rose-100">
                      <table className="w-full text-sm">
                        <thead className="bg-rose-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">word</th>
                            <th className="px-3 py-2 text-left">reading</th>
                            <th className="px-3 py-2 text-left">hanviet</th>
                            <th className="px-3 py-2 text-left">meaning</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((w, i) => (
                            <tr key={i} className="border-t border-rose-50">
                              <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                              <td className="px-3 py-1.5 font-jp">{w.word}</td>
                              <td className="px-3 py-1.5 font-jp">{w.reading}</td>
                              <td className="px-3 py-1.5">{w.hanviet}</td>
                              <td className="px-3 py-1.5">{w.meaning}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <Button variant="ghost" onClick={() => { setImportPreview(null); setJsonInput(''); }}>Hủy</Button>
                      <Button className="bg-gradient-to-r from-rose-400 to-pink-400 text-white gap-2" onClick={confirmImport}>
                        <CheckCircle2 className="h-4 w-4" /> Import {importPreview.length} từ
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <main className="container py-6 max-w-4xl">
        {showKanji ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Button
              variant="outline" size="sm"
              className="gap-2 border-emerald-300 text-emerald-600 hover:bg-emerald-50"
              onClick={() => setShowKanji(false)}
            >
              <RefreshCcw className="h-4 w-4" />
              Chuyển chế độ học Từ vựng
            </Button>
            <KanjiReview onBack={() => setShowKanji(false)} />
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {view === 'series' && renderSeries()}
            {view === 'lessons' && renderLessons()}
            {view === 'detail' && renderDetail()}
            {view === 'custom-detail' && renderCustomDetail()}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
};

// export default Vocabulary;
