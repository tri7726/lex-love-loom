import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Save, X, Loader2, BookOpen, FolderOpen, Plus, Check, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFlashcardFolders, VocabWord } from '@/hooks/useFlashcardFolders';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface WordData {
  word: string;
  reading: string;
  meaning?: string;
  translation?: string;
  vietnamese?: string;
  word_type?: string;
  examples?: Array<{ japanese: string; vietnamese: string }>;
  notes?: string;
}

interface WordLookupPanelProps {
  wordData: WordData | null;
  loading: boolean;
  onClose: () => void;
  onSpeak: (text: string) => void;
}

export function WordLookupPanel({ wordData, loading, onClose, onSpeak }: WordLookupPanelProps) {
  const { folders, addWordToFolder, createFolder } = useFlashcardFolders();
  const { toast } = useToast();
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [savedFolderId, setSavedFolderId] = useState<string | null>(null);

  const handleSaveToFolder = (folderId: string) => {
    if (!wordData) return;

    addWordToFolder(folderId, {
      word: wordData.word || '',
      reading: wordData.reading || '',
      meaning: wordData.meaning || wordData.translation || wordData.vietnamese || '',
      word_type: wordData.word_type,
      example_sentence: wordData.examples?.[0]?.japanese || '',
      example_translation: wordData.examples?.[0]?.vietnamese || '',
    });

    setSavedFolderId(folderId);
    toast({
      title: 'Đã lưu!',
      description: `Đã lưu "${wordData.word}" vào Sổ tay.`,
    });
    
    setTimeout(() => {
      setShowFolderPicker(false);
      setSavedFolderId(null);
    }, 1000);
  };

  const handleCreateAndSave = () => {
    if (!searchQuery.trim() || !wordData) return;
    const newFolder = createFolder(searchQuery.trim(), '📚');
    handleSaveToFolder(newFolder.id);
    setSearchQuery('');
  };

  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {(loading || wordData) && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="sticky top-6"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 mb-6 text-left border border-slate-100 dark:border-slate-800 shadow-sm relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-sakura" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Tra từ</span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 ml-1">
                  <Database className="h-3 w-3 text-slate-500" />
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">Preload</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : wordData ? (
              <div className="space-y-4">
                {/* Word & Reading & Audio */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-3xl font-jp font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1">
                      {wordData.word}
                    </h3>
                    <span className="text-slate-500 dark:text-slate-400 text-base font-jp">
                      {wordData.reading}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onSpeak(wordData.word)}
                    className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Meaning */}
                <div className="space-y-1">
                  <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Nghĩa</p>
                  <div className="text-slate-800 dark:text-slate-200 text-lg leading-relaxed font-medium">
                    {wordData.meaning || wordData.translation || wordData.vietnamese || "Không có dữ liệu"}
                  </div>
                </div>

                {/* Additional Info (Examples, Type, Notes) - Kept minimal if they exist */}
                {(wordData.word_type || (wordData.examples && wordData.examples.length > 0) || wordData.notes) && (
                  <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700/50 space-y-3">
                    {wordData.word_type && (
                      <Badge variant="outline" className="text-[10px] uppercase font-medium tracking-wider text-slate-500 border-slate-200 bg-transparent px-2 py-0 h-5">
                        {wordData.word_type}
                      </Badge>
                    )}

                    {wordData.examples && wordData.examples.length > 0 && (
                      <div className="space-y-2">
                        {wordData.examples.map((ex, idx) => (
                          <div key={idx} className="text-sm">
                            <p className="font-jp text-slate-700 dark:text-slate-300">{ex.japanese}</p>
                            <p className="text-slate-500 dark:text-slate-500">{ex.vietnamese}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {wordData.notes && (
                      <p className="text-sm text-slate-500 italic">
                        {wordData.notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2">
                    {!showFolderPicker ? (
                      <Button 
                        onClick={() => setShowFolderPicker(true)} 
                        className="w-full h-12 rounded-xl bg-[#de6b7c] hover:bg-[#c95b6a] text-white font-medium text-sm transition-all"
                      >
                        Lưu vào bộ sưu tập
                      </Button>
                    ) : null}
                </div>

                {/* Dialog instead of inline picker */}
                <Dialog open={showFolderPicker} onOpenChange={setShowFolderPicker}>
                  <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 rounded-2xl flex flex-col max-h-[85vh]">
                    <DialogHeader className="p-6 pb-2 text-left">
                      <DialogTitle className="text-xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-1">
                        Add Flashcard
                      </DialogTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Choose a folder to add your flashcards to
                      </p>
                    </DialogHeader>

                    <div className="px-6 py-4">
                      <div className="relative">
                        <Input
                          placeholder="Search folders..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-4 rounded-xl border-sakura focus-visible:ring-sakura/20 h-12"
                        />
                      </div>
                    </div>

                    <div className="px-6 pb-2">
                       <p className="text-sm font-serif text-slate-500 dark:text-slate-400 mb-2">
                         All Folders
                       </p>
                    </div>

                    <div className="px-4 pb-6 overflow-y-auto flex-1 min-h-[100px]">
                      {filteredFolders.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {searchQuery ? "No folders match your search." : "No folders yet. Create one in Folder Manager."}
                          </p>
                          {searchQuery && (
                            <Button 
                              variant="link" 
                              className="text-sakura mt-2 h-auto p-0"
                              onClick={handleCreateAndSave}
                            >
                              Create "{searchQuery}"
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-1">
                          {filteredFolders.map(f => (
                            <button
                              key={f.id}
                              onClick={() => handleSaveToFolder(f.id)}
                              disabled={savedFolderId === f.id}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group",
                                savedFolderId === f.id 
                                  ? "bg-sakura/10 text-sakura"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                              )}
                            >
                              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-lg shrink-0">
                                {f.emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate group-hover:text-sakura transition-colors">{f.name}</p>
                              </div>
                              {savedFolderId === f.id && <Check className="h-4 w-4 text-sakura" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
