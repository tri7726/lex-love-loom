import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWordHistory } from '@/hooks/useWordHistory';
import { useFlashcardFolders, CustomFolder } from '@/hooks/useFlashcardFolders';
import { VocabWord } from '@/types/vocabulary';
import { TextbookSeries, JLPTLevel, Lesson, ViewState, GameMode } from '@/components/vocabulary/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PERSIST_KEY = 'vocab_last_position'; // module-level constant

export function useVocabulary() {
  const { user } = useAuth();
  const { history: savedHistory, isLoading: historyLoading, saveWord, removeWord, isWordSaved, updateMastery } = useWordHistory();
  const [view, setView] = useState<ViewState>('series');
  
  // Selections
  const [selectedSeries, setSelectedSeries] = useState<TextbookSeries | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonRange, setLessonRange] = useState<[number, number]>([1, 5]);

  // Flashcard State
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [activeGame, setActiveGame] = useState<GameMode | null>(null);
  const [showKanji, setShowKanji] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [smartReview, setSmartReview] = useState(false);
  const [displayWords, setDisplayWords] = useState<VocabWord[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [reversedCard, setReversedCard] = useState(false);

  // Session tracking (Cross-game progression)
  const [sessionWordResults, setSessionWordResults] = useState<Record<string, { correct: number; incorrect: number }>>({});
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showGameStats, setShowGameStats] = useState(false);
  const [lastGameResult, setLastGameResult] = useState<{
    gameType: GameMode;
    correct: number;
    total: number;
    score?: number;
    wrongWords: VocabWord[];
  } | null>(null);

  // Custom session config
  const [customConfig, setCustomConfig] = useState({
    questionCount: 10,
    focus: 'all' as 'all' | 'weak' | 'random',
    timer: false,
    mixMode: false,
  });

  // Retry (game filtered to wrong words only)
  const [retryWords, setRetryWords] = useState<VocabWord[] | null>(null);

  // Custom folders
  const folderHook = useFlashcardFolders();
  const { folders: customFolders, createFolder, deleteFolder, addWordToFolder, removeWordFromFolder } = folderHook;
  const [selectedCustomFolder, setSelectedCustomFolder] = useState<CustomFolder | null>(null);
  
  // Dialogs & Forms
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddWordForm, setShowAddWordForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderEmoji, setNewFolderEmoji] = useState('📝');
  const [newWord, setNewWord] = useState({ word: '', reading: '', hanviet: '', meaning: '' });

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }, []);

  // ── localStorage position persistence ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PERSIST_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      // Future: restore last series/level on mount
      // For now we just silently read to validate the JSON
      void parsed;
    } catch {/* ignore corrupt data */}
  }, []);

  const persistPosition = useCallback((viewState: ViewState, series?: TextbookSeries | null, level?: JLPTLevel | null) => {
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify({
        viewState,
        seriesId: series?.id ?? null,
        levelId: level?.level ?? null,
        ts: Date.now(),
      }));
    } catch {/* ignore */}
  }, []);

  // Build mastery lookup map from saved history — useMemo, not useCallback
  const masteryMap = useMemo(() => {
    const map: Record<string, number> = {};
    savedHistory.forEach(item => {
      map[item.word] = item.mastery_level ?? 0;
    });
    return map;
  }, [savedHistory]);

  // Update display words: shuffle + smart review sorting
  useEffect(() => {
    if (view === 'detail' && selectedLesson) {
      let words = [...selectedLesson.words];
      if (shuffled) {
        words.sort(() => Math.random() - 0.5);
      }
      if (smartReview) {
        words.sort((a, b) => (masteryMap[a.word] ?? 0) - (masteryMap[b.word] ?? 0));
        setFlashcardIndex(0);
        setIsFlipped(false);
      }
      setDisplayWords(words);
    }
  }, [selectedLesson, shuffled, smartReview, view, masteryMap]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeGame) return;
      const isRegularDetail = view === 'detail' && selectedLesson;
      const isCustomDetail = view === 'custom-detail' && selectedCustomFolder;
      
      if (isRegularDetail || isCustomDetail) {
        const words = isRegularDetail ? displayWords : selectedCustomFolder!.words;
        
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
    if (series.id === 'mina') {
      setLessonRange(level.level === 'N5' ? [1, 5] : [26, 30]);
    } else {
      const maxRange = Math.min(5, level.lessons.length);
      setLessonRange([1, maxRange]);
    }
    setView('lessons');
    persistPosition('lessons', series, level);
  };

  const navigateToDetail = (lesson: Lesson, autoGame?: string) => {
    setSelectedLesson(lesson);
    setFlashcardIndex(0);
    setIsFlipped(false);
    setShuffled(false);
    setView('detail');
    // Auto-launch game if requested (e.g. Quick Quiz from lesson list)
    if (autoGame) {
      setActiveGame(autoGame as GameMode);
    } else {
      setActiveGame(null);
    }
  };

  const navigateToCustomFolder = (folder: CustomFolder) => {
    setSelectedCustomFolder(folder);
    setFlashcardIndex(0);
    setIsFlipped(false);
    setShuffled(false);
    setShowReviewPanel(false);
    setActiveGame(null);
    setView('custom-detail');
  };

  const handleStudyRange = () => {
    if (!selectedLevel) return;
    const [start, end] = lessonRange;
    const offset = selectedLevel.level === 'N4' ? 26 : 1;
    // Clamp to valid range to avoid negative slice indices
    const clampedStart = Math.max(start, offset);
    const clampedEnd = Math.max(end, clampedStart);
    const lessonsInRange = selectedLevel.lessons.slice(clampedStart - offset, clampedEnd - offset + 1);
    const aggregatedWords = lessonsInRange.flatMap(l => l.words);
    if (aggregatedWords.length === 0) return;

    setSelectedLesson({
      id: `range-${start}-${end}`,
      name: `Bài ${start} - ${end}`,
      words: aggregatedWords
    });
    setFlashcardIndex(0);
    setIsFlipped(false);
    setView('detail');
  };

  const goBack = () => {
    if (activeGame) { setActiveGame(null); return; }
    if (showReviewPanel) { setShowReviewPanel(false); return; }
    if (view === 'custom-detail') { setView('series'); setSelectedCustomFolder(null); setActiveGame(null); setShowReviewPanel(false); return; }
    if (view === 'detail') { setView('lessons'); setSelectedLesson(null); return; }
    if (view === 'lessons') { setView('series'); setSelectedSeries(null); setSelectedLevel(null); return; }
  };

  const toggleSaved = (vocab: VocabWord) => {
    if (isWordSaved(vocab.word)) {
      const item = savedHistory.find(h => h.word === vocab.word);
      if (item) removeWord(item.id);
    } else {
      saveWord({
        word: vocab.word,
        reading: vocab.reading || '',
        meaning: vocab.meaning
      });
    }
  };

  const handleAddWord = () => {
    if (!newWord.word.trim() || !newWord.meaning.trim() || !selectedCustomFolder) return;
    const word: Omit<VocabWord, 'id'> = {
      word: newWord.word.trim(),
      reading: newWord.reading.trim() || null,
      hanviet: newWord.hanviet.trim() || null,
      meaning: newWord.meaning.trim(),
      mastery_level: null,
    };
    // addWordToFolder saves to DB and returns the real word with DB id
    addWordToFolder(selectedCustomFolder.id, word).then((saved) => {
      if (saved) {
        setSelectedCustomFolder((f) => f ? { ...f, words: [...f.words, saved] } : f);
      }
    });
    setNewWord({ word: '', reading: '', hanviet: '', meaning: '' });
    setShowAddWordForm(false);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder(newFolderName, newFolderEmoji);
    setNewFolderName('');
    setShowCreateDialog(false);
  };

  const handleImportWords = async (words: VocabWord[]) => {
    if (!selectedCustomFolder) {
      toast.error('Vui lòng chọn folder trước khi import từ vựng');
      return;
    }
    const saved: VocabWord[] = [];
    for (const w of words) {
      // Strip the fake id, let addWordToFolder create real DB record
      const { id: _id, ...wordWithoutId } = w;
      const result = await addWordToFolder(selectedCustomFolder.id, wordWithoutId);
      if (result) saved.push(result);
    }
    if (saved.length > 0) {
      setSelectedCustomFolder((f) => f ? { ...f, words: [...f.words, ...saved] } : f);
      toast.success(`✅ Đã import ${saved.length} từ vào "${selectedCustomFolder.name}"`);
    }
  };

  // ── Export folder to Excel ──
  const exportFolder = useCallback(async (folder: CustomFolder) => {
    try {
      const XLSX = await import('xlsx');
      const data = folder.words.map(w => ({
        word: w.word,
        reading: w.reading ?? '',
        hanviet: w.hanviet ?? '',
        meaning: w.meaning,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, folder.name.slice(0, 31));
      XLSX.writeFile(wb, `${folder.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_vocab.xlsx`);
      toast.success(`📥 Đã xuất ${folder.words.length} từ ra file Excel`);
    } catch {
      toast.error('Không thể xuất file Excel');
    }
  }, []);

  // ── Add all words to SRS flashcards ──
  const addWordsToSRS = useCallback(async (words: VocabWord[]) => {
    if (!user) { toast.error('Vui lòng đăng nhập'); return; }
    if (words.length === 0) return;
    try {
      const rows = words.map(w => ({
        user_id: user.id,
        word: w.word,
        meaning: w.meaning,
        reading: w.reading ?? null,
      }));
      const { error } = await (supabase as any)
        .from('flashcards')
        .upsert(rows, { onConflict: 'user_id,word', ignoreDuplicates: true });
      if (error) throw error;
      toast.success(`🧠 Đã thêm ${words.length} từ vào SRS Review!`, {
        description: 'Vào /review để ôn tập các từ này.',
        action: { label: 'Ôn ngay', onClick: () => window.location.href = '/review' },
      });
    } catch {
      toast.error('Không thể thêm vào SRS, thử lại sau');
    }
  }, [user]);

  // ── Session tracking (Cross-game progression) ──

  const recordAnswer = useCallback((wordId: string, wordText: string, correct: boolean) => {
    setSessionWordResults(prev => {
      const cur = prev[wordId] || { correct: 0, incorrect: 0 };
      return { ...prev, [wordId]: correct
        ? { ...cur, correct: cur.correct + 1 }
        : { ...cur, incorrect: cur.incorrect + 1 }
      };
    });
    // Update streak
    if (correct) {
      setCurrentStreak(prev => {
        const next = prev + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
    } else {
      setCurrentStreak(0);
    }
    // Persist mastery to DB if word is saved
    if (isWordSaved(wordText)) {
      updateMastery(wordText, correct);
    }
  }, [isWordSaved, updateMastery]);

  const finishGame = useCallback((
    gameType: GameMode,
    correct: number,
    total: number,
    words: VocabWord[],
    score?: number,
  ) => {
    // Collect wrong words from session results
    const wrongWords = words.filter(w =>
      sessionWordResults[w.id] && sessionWordResults[w.id].incorrect > sessionWordResults[w.id].correct
    );
    setLastGameResult({ gameType, correct, total, score, wrongWords });
    setShowGameStats(true);
    // Reset streak for next game
    setCurrentStreak(0);
  }, [sessionWordResults]);

  const resetSession = useCallback(() => {
    setSessionWordResults({});
    setCurrentStreak(0);
    setBestStreak(0);
    setShowGameStats(false);
    setLastGameResult(null);
    setRetryWords(null);
  }, []);

  // Handle retry with only wrong words
  const handleRetryWrong = useCallback((wrongWords: VocabWord[]) => {
    if (wrongWords.length === 0) {
      setShowGameStats(false);
      return;
    }
    setRetryWords(wrongWords);
    setShowGameStats(false);
    // Re-launch the same game type
    if (lastGameResult) {
      setActiveGame(lastGameResult.gameType);
    }
  }, [lastGameResult]);

  // Handle switching to a suggested next game
  const handleTryNextGame = useCallback((game: GameMode) => {
    setShowGameStats(false);
    setActiveGame(game);
  }, []);

  // Clear retry words when game is dismissed or navigating away
  const clearRetry = useCallback(() => {
    setRetryWords(null);
  }, []);

  // Game chain: suggest next game based on current game type + wrong word count
  const suggestNextGame = useCallback((gameType: GameMode, wrongWords: VocabWord[]): { game: GameMode; reason: string } => {
    const n = wrongWords.length;
    const map: Record<GameMode, { game: GameMode; reason: string }> = {
      classic:       { game: 'match', reason: `Sai ${n} từ — thử MatchGame để ghép cặp nhé!` },
      speed:         { game: 'classic', reason: 'Thử Classic với tốc độ thoải mái hơn' },
      match:         { game: 'writing', reason: 'Luyện viết các từ vừa sai để nhớ lâu hơn!' },
      listening:     { game: 'classic', reason: 'Ôn mặt chữ với Classic nhé!' },
      writing:       { game: 'match', reason: 'Ghép cặp để ôn lại các từ vừa viết' },
      pronunciation: { game: 'listening', reason: 'Luyện tai với ListeningGame nhé!' },
      lab:           { game: 'classic', reason: 'Ôn lại với Classic nhé!' },
      fillblank:     { game: 'classic', reason: 'Thử Classic để ôn lại các từ vừa điền sai!' },
      boss:          { game: 'classic', reason: 'Nghỉ trận đấu trùm, ôn lại với Classic!' },
    };
    return map[gameType] || { game: 'classic', reason: 'Tiếp tục ôn tập với Classic!' };
  }, []);

  return {
    state: {
      user, savedHistory, historyLoading, view,
      selectedSeries, selectedLevel, selectedLesson, lessonRange,
      flashcardIndex, isFlipped, showReviewPanel, activeGame,
      showKanji, shuffled, smartReview, displayWords, autoSpeak, reversedCard,
      customFolders, selectedCustomFolder,
      showCreateDialog, showImportDialog, showAddWordForm,
      newFolderName, newFolderEmoji, newWord,
      isWordSaved,
      masteryMap, // expose as object now (not function)
      // Session tracking
      sessionWordResults, currentStreak, bestStreak,
      showGameStats, lastGameResult,
      customConfig, retryWords,
    },
    setters: {
      setView, setSelectedSeries, setSelectedLevel, setSelectedLesson, setLessonRange,
      setFlashcardIndex, setIsFlipped, setShowReviewPanel, setActiveGame,
      setShowKanji, setShuffled, setSmartReview, setDisplayWords, setAutoSpeak, setReversedCard,
      setSelectedCustomFolder, setShowCreateDialog, setShowImportDialog, setShowAddWordForm,
      setNewFolderName, setNewFolderEmoji, setNewWord,
      setSessionWordResults, setCurrentStreak, setBestStreak,
      setShowGameStats, setLastGameResult, setCustomConfig,
      setRetryWords, clearRetry,
    },
    actions: {
      speak, navigateToLessons, navigateToDetail, navigateToCustomFolder,
      handleStudyRange, goBack, toggleSaved, handleAddWord, handleCreateFolder,
      deleteFolder, removeWordFromFolder, handleImportWords,
      exportFolder,
      addWordsToSRS,
      getMastery: (word: string) => {
        const item = savedHistory.find(h => h.word === word);
        return item?.mastery_level ?? null;
      },
      // Session tracking
      recordAnswer, finishGame, resetSession, suggestNextGame,
      handleRetryWrong, handleTryNextGame,
      clearRetry,
    }
  };
}
