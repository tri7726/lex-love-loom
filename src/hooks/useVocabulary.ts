import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWordHistory } from '@/hooks/useWordHistory';
import { useFlashcardFolders, CustomFolder, VocabWord } from '@/hooks/useFlashcardFolders';
import { TextbookSeries, JLPTLevel, Lesson, ViewState, GameMode } from '@/components/vocabulary/types';

export function useVocabulary() {
  const { user } = useAuth();
  const { history: savedHistory, isLoading: historyLoading } = useWordHistory();
  const [view, setView] = useState<ViewState>('series');
  
  // Selections
  const [selectedSeries, setSelectedSeries] = useState<TextbookSeries | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonRange, setLessonRange] = useState<[number, number]>([1, 5]);

  // Word History Link
  const { history: savedHistory, saveWord, removeWord, isWordSaved } = useWordHistory();

  // Flashcard State
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [activeGame, setActiveGame] = useState<GameMode | null>(null);
  const [showKanji, setShowKanji] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [displayWords, setDisplayWords] = useState<VocabWord[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [reversedCard, setReversedCard] = useState(false);

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

  // Update effect for shuffling words when studying a regular lesson
  useEffect(() => {
    if (view === 'detail' && selectedLesson) {
      setDisplayWords(shuffled ? [...selectedLesson.words].sort(() => Math.random() - 0.5) : selectedLesson.words);
    }
  }, [selectedLesson, shuffled, view]);

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
    }
    setView('lessons');
  };

  const navigateToDetail = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setFlashcardIndex(0);
    setIsFlipped(false);
    setShuffled(false);
    setView('detail');
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
    const lessonsInRange = selectedLevel.lessons.slice(start - offset, end - (offset - 1));
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

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder(newFolderName, newFolderEmoji);
    setNewFolderName('');
    setShowCreateDialog(false);
  };

  const handleImportWords = (words: VocabWord[]) => {
    if (!selectedCustomFolder) return;
    words.forEach((w) => addWordToFolder(selectedCustomFolder.id, w));
    setSelectedCustomFolder((f) => f ? { ...f, words: [...f.words, ...words] } : f);
  };

  return {
    state: {
      user, savedHistory, historyLoading, view,
      selectedSeries, selectedLevel, selectedLesson, lessonRange,
      flashcardIndex, isFlipped, showReviewPanel, activeGame, 
      showKanji, shuffled, displayWords, autoSpeak, reversedCard,
      customFolders, selectedCustomFolder,
      showCreateDialog, showImportDialog, showAddWordForm,
      newFolderName, newFolderEmoji, newWord,
      isWordSaved // Added this to help UI check saved status
    },
    setters: {
      setView, setSelectedSeries, setSelectedLevel, setSelectedLesson, setLessonRange,
      setFlashcardIndex, setIsFlipped, setShowReviewPanel, setActiveGame,
      setShowKanji, setShuffled, setDisplayWords, setAutoSpeak, setReversedCard,
      setSelectedCustomFolder, setShowCreateDialog, setShowImportDialog, setShowAddWordForm,
      setNewFolderName, setNewFolderEmoji, setNewWord
    },
    actions: {
      speak, navigateToLessons, navigateToDetail, navigateToCustomFolder,
      handleStudyRange, goBack, toggleSaved, handleAddWord, handleCreateFolder,
      deleteFolder, removeWordFromFolder, handleImportWords
    }
  };
}
