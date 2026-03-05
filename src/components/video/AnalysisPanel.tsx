import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, BookOpen, MessageSquare, GraduationCap, Lightbulb, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';
import { useFlashcardCreation } from '@/hooks/useFlashcardCreation';
import { FolderSelectionDialog } from '@/components/flashcards/FolderSelectionDialog';
import { cn } from '@/lib/utils';

// Type definitions matching the backend response
interface WordBreakdown {
  word: string;
  reading: string;
  hanviet?: string;
  meaning: string;
  word_type: string;
  jlpt_level?: string;
}

interface GrammarPattern {
  pattern: string;
  meaning: string;
  usage: string;
}

export interface SentenceAnalysis {
  japanese: string;
  vietnamese: string;
  breakdown: {
    words: WordBreakdown[];
    grammar_patterns: GrammarPattern[];
  };
}

interface SuggestedFlashcard {
  word: string;
  reading: string;
  hanviet?: string;
  meaning: string;
  example_sentence: string;
  example_translation: string;
  jlpt_level?: string;
  word_type?: string;
  notes?: string;
}

export interface StructuredAnalysis {
  overall_analysis: {
    jlpt_level: string;
    politeness_level: string;
    text_type: string;
    summary: string;
  };
  sentences: SentenceAnalysis[];
  suggested_flashcards: SuggestedFlashcard[];
  grammar_summary: {
    particles_used: string[];
    verb_forms: string[];
    key_patterns: string[];
  };
  cultural_notes: string[];
}

interface AnalysisPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  content: string | null;
  error: string | null;
  structuredData?: StructuredAnalysis | null;
  onToggle?: () => void;
}

const JLPT_COLORS: Record<string, string> = {
  'N5': 'bg-green-500/20 text-green-700 dark:text-green-300',
  'N4': 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  'N3': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  'N2': 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  'N1': 'bg-red-500/20 text-red-700 dark:text-red-300',
};

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  isOpen,
  onClose,
  isLoading,
  content,
  error,
  structuredData,
  onToggle,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Flashcard creation state
  const { createFlashcard, createFlashcards, isCreating } = useFlashcardCreation();
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [pendingFlashcard, setPendingFlashcard] = useState<SuggestedFlashcard | null>(null);
  const [pendingBulkAdd, setPendingBulkAdd] = useState(false);

  const handleAddFlashcard = (flashcard: SuggestedFlashcard) => {
    setPendingFlashcard(flashcard);
    setPendingBulkAdd(false);
    setShowFolderDialog(true);
  };

  const handleAddAllFlashcards = () => {
    if (!structuredData?.suggested_flashcards) return;
    
    setPendingFlashcard(null);
    setPendingBulkAdd(true);
    setShowFolderDialog(true);
  };

  const handleFolderSelected = async (folderId: string) => {
    setShowFolderDialog(false);
    
    if (pendingBulkAdd && structuredData) {
      await createFlashcards(structuredData.suggested_flashcards, folderId);
    } else if (pendingFlashcard) {
      await createFlashcard(pendingFlashcard, folderId);
    }
    
    setPendingFlashcard(null);
    setPendingBulkAdd(false);
  };

  // If we have structured data, show enhanced view
  const isStructured = structuredData !== null && structuredData !== undefined;

  return (
    <AnimatePresence>
      {/* Floating Toggle Button (Handle) */}
      <motion.div
        initial={false}
        animate={{ 
          x: isOpen ? -500 : 0, // Stay at the edge of the panel when open, or screen edge when closed
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-1/2 right-0 -translate-y-1/2 z-[60]"
      >
        <Button
          variant="secondary"
          size="icon"
          className="h-12 w-8 rounded-l-xl rounded-r-none border-y border-l shadow-xl bg-background hover:bg-muted group transition-all"
          onClick={onToggle || onClose}
          title={isOpen ? "Ẩn bảng phân tích" : "Hiện bảng phân tích"}
        >
          {isOpen ? (
            <ChevronRight className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          )}
        </Button>
      </motion.div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-background border-l shadow-2xl z-50 flex flex-col"
        >
          <div className="p-6 border-b flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <h3 className="text-2xl font-display font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-sakura animate-pulse-subtle" />
              AI Analysis
            </h3>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Analyzing context...</p>
              </div>
            ) : error ? (
              <div className="p-4 m-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            ) : isStructured ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
                <TabsList className="flex w-full bg-sakura-light/30 dark:bg-slate-900/50 p-1 mb-8 rounded-2xl border border-sakura-light/50 dark:border-slate-800">
                  <TabsTrigger value="overview" className="flex-1 py-2 text-xs font-medium rounded-xl transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-sakura data-[state=active]:shadow-sm">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="breakdown" className="flex-1 py-2 text-xs font-medium rounded-xl transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-sakura data-[state=active]:shadow-sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Breakdown
                  </TabsTrigger>
                  <TabsTrigger value="grammar" className="flex-1 py-2 text-xs font-medium rounded-xl transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-sakura data-[state=active]:shadow-sm">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Grammar
                  </TabsTrigger>
                  <TabsTrigger value="flashcards" className="flex-1 py-2 text-xs font-medium rounded-xl transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-sakura data-[state=active]:shadow-sm">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Cards
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 rounded-3xl overflow-hidden">
                      <CardContent className="p-8 space-y-8">
                        <div>
                          <h2 className="text-2xl font-display font-medium text-slate-900 dark:text-slate-100 mb-6">Overall Analysis</h2>
                          
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium text-slate-500 w-24">JLPT Level:</span>
                              <Badge className={cn("px-3 py-1 rounded-full font-bold", JLPT_COLORS[structuredData.overall_analysis.jlpt_level] || 'bg-slate-100 text-slate-600')}>
                                {structuredData.overall_analysis.jlpt_level}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium text-slate-500 w-24">Politeness:</span>
                              <Badge variant="secondary" className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none font-medium">
                                {structuredData.overall_analysis.politeness_level}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium text-slate-500 w-24">Type:</span>
                              <Badge variant="secondary" className="px-3 py-1 rounded-full bg-sakura-light/50 text-sakura-dark dark:bg-rose-950/30 dark:text-rose-300 border-none font-medium">
                                {structuredData.overall_analysis.text_type}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl text-base leading-relaxed text-slate-700 dark:text-slate-300 border border-slate-100/50 dark:border-slate-800/50">
                          {structuredData.overall_analysis.summary}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {structuredData.cultural_notes && structuredData.cultural_notes.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="mt-6"
                    >
                      <h3 className="text-xl font-display font-medium text-slate-900 dark:text-slate-100 mb-6 px-2">Cultural Notes</h3>
                      <div className="space-y-4">
                        {structuredData.cultural_notes.map((note, idx) => (
                          <div key={idx} className="flex gap-4 group">
                            <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sakura flex-shrink-0" />
                            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                              {note}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </TabsContent>

                {/* Breakdown Tab */}
                <TabsContent value="breakdown" className="space-y-12">
                  {structuredData.sentences.map((sentence, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="mb-12 last:mb-0"
                    >
                      <div className="px-2 mb-6">
                        <h4 className="text-xl font-jp text-slate-900 dark:text-slate-100 leading-relaxed mb-3">
                          {sentence.japanese}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {sentence.vietnamese}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {sentence.breakdown.words.map((word, widx) => (
                          <motion.div 
                            key={widx} 
                            whileHover={{ scale: 1.02 }}
                            className="bg-sakura-light/10 dark:bg-slate-900/30 p-4 rounded-2xl border border-sakura-light/20 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm hover:shadow-md cursor-default group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-jp text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-sakura transition-colors">
                                {word.word}
                              </div>
                              {word.jlpt_level && (
                                <Badge variant="secondary" className="text-[10px] rounded-full bg-white dark:bg-slate-800 text-slate-500 font-bold">
                                  {word.jlpt_level}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs font-jp text-slate-400 mb-2">{word.reading}</div>
                            {word.hanviet && (
                              <div className="text-[11px] text-sakura-dark/80 font-bold mb-2 uppercase tracking-wide">
                                Hán Việt: {word.hanviet}
                              </div>
                            )}
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {word.meaning}
                            </p>
                          </motion.div>
                        ))}
                      </div>

                      {sentence.breakdown.grammar_patterns && sentence.breakdown.grammar_patterns.length > 0 && (
                        <div className="px-2 space-y-4">
                          <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Grammar in sentence</h5>
                          <div className="space-y-4">
                            {sentence.breakdown.grammar_patterns.map((pattern, pidx) => (
                              <div key={pidx} className="flex gap-4 group">
                                <div className="mt-2 h-1 w-1 rounded-full bg-slate-300 flex-shrink-0" />
                                <div className="space-y-1">
                                  <div className="font-bold font-jp text-slate-800 dark:text-slate-200 text-sm">
                                    {pattern.pattern}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {pattern.meaning}
                                  </div>
                                  {pattern.usage && (
                                    <div className="text-[11px] text-slate-400 dark:text-slate-500 italic leading-relaxed">
                                      {pattern.usage}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </TabsContent>

                {/* Grammar Summary Tab */}
                <TabsContent value="grammar" className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 rounded-3xl overflow-hidden">
                      <CardContent className="p-8 space-y-12">
                        {/* Particles */}
                        <div>
                          <h4 className="text-xl font-display font-medium text-slate-900 dark:text-slate-100 mb-6 font-bold">Particles Used</h4>
                          <div className="flex flex-wrap gap-3">
                            {structuredData.grammar_summary.particles_used.map((particle, idx) => (
                              <Badge 
                                key={idx}
                                variant="secondary" 
                                className="font-jp text-lg px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-full font-bold"
                              >
                                {typeof particle === 'string' ? particle : (particle as any).particle || (particle as any).name || JSON.stringify(particle)}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Verb Forms */}
                        <div>
                          <h4 className="text-xl font-display font-medium text-slate-900 dark:text-slate-100 mb-6 font-bold">Verb Forms</h4>
                          <div className="flex flex-wrap gap-3">
                            {structuredData.grammar_summary.verb_forms.map((form, idx) => (
                              <Badge 
                                key={idx}
                                variant="secondary" 
                                className="px-4 py-1.5 bg-orange-100/50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-none rounded-full font-medium"
                              >
                                {typeof form === 'string' ? form : (form as any).form || (form as any).name || JSON.stringify(form)}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Key Patterns */}
                        <div>
                          <h4 className="text-xl font-display font-medium text-slate-900 dark:text-slate-100 mb-6 font-bold">Key Patterns</h4>
                          <div className="space-y-6">
                            {structuredData.grammar_summary.key_patterns.map((pattern, idx) => (
                              <div key={idx} className="flex gap-4 group">
                                <div className="mt-2 h-1.5 w-1.5 rounded-full bg-sakura flex-shrink-0" />
                                <div className="font-jp text-base font-bold text-slate-800 dark:text-slate-200">
                                  {typeof pattern === 'string' ? pattern : (pattern as any).pattern || (pattern as any).name || JSON.stringify(pattern)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>

                {/* Suggested Flashcards Tab */}
                <TabsContent value="flashcards" className="space-y-8">
                  <div className="flex justify-between items-center px-2 mb-4">
                    <h4 className="text-xl font-display font-medium text-slate-900 dark:text-slate-100">
                      Suggested Flashcards
                    </h4>
                    <Button size="sm" onClick={handleAddAllFlashcards} variant="ghost" className="text-xs font-bold text-sakura hover:bg-sakura-light/50 rounded-full">
                      Add All
                    </Button>
                  </div>

                  <div className="space-y-6 pb-4">
                    {structuredData.suggested_flashcards.map((flashcard, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-950 rounded-3xl overflow-hidden">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div className="space-y-1">
                                <div className="text-2xl font-jp text-slate-900 dark:text-slate-100 font-bold group-hover:text-sakura transition-colors">{flashcard.word}</div>
                                <div className="text-sm text-slate-400 font-jp">{flashcard.reading}</div>
                                {flashcard.hanviet && (
                                  <div className="text-[11px] text-sakura-dark font-bold uppercase tracking-wider">
                                    Hán Việt: {flashcard.hanviet}
                                  </div>
                                )}
                              </div>
                              {flashcard.jlpt_level && (
                                <Badge variant="secondary" className="text-[10px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                                  {flashcard.jlpt_level}
                                </Badge>
                              )}
                            </div>

                            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl text-base text-slate-700 dark:text-slate-300 mb-6 font-medium">
                              {flashcard.meaning}
                            </div>

                            <div className="space-y-2 px-2">
                              <div className="text-sm font-jp text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{flashcard.example_sentence}</div>
                              <div className="text-xs text-slate-400 italic">{flashcard.example_translation}</div>
                            </div>

                            <Button
                              size="sm"
                              className="w-full mt-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold text-xs h-10 rounded-full shadow-sm"
                              onClick={() => handleAddFlashcard(flashcard)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Save to Deck
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : content ? (
              // Fallback to markdown for non-structured responses
              <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center text-muted-foreground text-sm mt-10 p-6">
                Ask about the current segment to get detailed cultural and grammatical explanations.
              </div>
            )}
          </ScrollArea>
        </motion.div>
      )}
      
      {/* Folder Selection Dialog */}
      <FolderSelectionDialog
        open={showFolderDialog}
        onClose={() => {
          setShowFolderDialog(false);
          setPendingFlashcard(null);
          setPendingBulkAdd(false);
        }}
        onSelectFolder={handleFolderSelected}
        title={pendingBulkAdd ? "Add All Flashcards" : "Add Flashcard"}
      />
    </AnimatePresence>
  );
};

export default AnalysisPanel;
