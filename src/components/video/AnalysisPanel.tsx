import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, BookOpen, MessageSquare, GraduationCap, Lightbulb, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';
import { useFlashcardCreation } from '@/hooks/useFlashcardCreation';
import FolderSelectionDialog from '@/components/flashcards/FolderSelectionDialog';

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

interface SentenceAnalysis {
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

interface StructuredAnalysis {
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
}

const JLPT_COLORS: Record<string, string> = {
  'N5': 'bg-green-500/20 text-green-700 dark:text-green-300',
  'N4': 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  'N3': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  'N2': 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  'N1': 'bg-red-500/20 text-red-700 dark:text-red-300',
};

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  isOpen,
  onClose,
  isLoading,
  content,
  error,
  structuredData,
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
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-background border-l shadow-2xl z-50 flex flex-col"
        >
          <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5">
            <h3 className="font-semibold flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              AI Analysis {isStructured && '(Enhanced)'}
            </h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
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
              // Enhanced structured view
              <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="overview" className="text-xs">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="breakdown" className="text-xs">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Breakdown
                  </TabsTrigger>
                  <TabsTrigger value="grammar" className="text-xs">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    Grammar
                  </TabsTrigger>
                  <TabsTrigger value="flashcards" className="text-xs">
                    <Lightbulb className="h-3 w-3 mr-1" />
                    Cards
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Overall Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">JLPT Level:</span>
                        <Badge className={JLPT_COLORS[structuredData.overall_analysis.jlpt_level] || 'bg-gray-500/20'}>
                          {structuredData.overall_analysis.jlpt_level}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Politeness:</span>
                        <Badge variant="outline">{structuredData.overall_analysis.politeness_level}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Type:</span>
                        <Badge variant="secondary">{structuredData.overall_analysis.text_type}</Badge>
                      </div>
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                        {structuredData.overall_analysis.summary}
                      </div>
                    </CardContent>
                  </Card>

                  {structuredData.cultural_notes && structuredData.cultural_notes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Cultural Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {structuredData.cultural_notes.map((note, idx) => (
                            <li key={idx} className="text-sm flex gap-2">
                              <span className="text-primary">•</span>
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Sentence Breakdown Tab */}
                <TabsContent value="breakdown" className="space-y-4">
                  {structuredData.sentences.map((sentence, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <div className="text-lg font-japanese">{sentence.japanese}</div>
                        <CardDescription>{sentence.vietnamese}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Words */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Words:</h4>
                          <div className="flex flex-wrap gap-2">
                            {sentence.breakdown.words.map((word, widx) => (
                              <div
                                key={widx}
                                className="px-2 py-1 bg-muted rounded text-xs border hover:border-primary transition-colors cursor-pointer"
                                title={`${word.meaning} (${word.word_type})`}
                              >
                                <div className="font-japanese">{word.word}</div>
                                <div className="text-muted-foreground">{word.reading}</div>
                                {word.jlpt_level && (
                                  <Badge className={`${JLPT_COLORS[word.jlpt_level]} text-xs mt-1`}>
                                    {word.jlpt_level}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Grammar Patterns */}
                        {sentence.breakdown.grammar_patterns.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Grammar Patterns:</h4>
                            <div className="space-y-2">
                              {sentence.breakdown.grammar_patterns.map((pattern, pidx) => (
                                <div key={pidx} className="p-2 bg-primary/5 rounded text-xs">
                                  <div className="font-semibold font-japanese">{pattern.pattern}</div>
                                  <div className="text-muted-foreground mt-1">{pattern.meaning}</div>
                                  <div className="text-xs italic mt-1">{pattern.usage}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                {/* Grammar Summary Tab */}
                <TabsContent value="grammar" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Grammar Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Particles */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Particles Used:</h4>
                        <div className="flex flex-wrap gap-2">
                          {structuredData.grammar_summary.particles_used.map((particle, idx) => (
                            <Badge key={idx} variant="outline" className="font-japanese">
                              {particle}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Verb Forms */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Verb Forms:</h4>
                        <div className="flex flex-wrap gap-2">
                          {structuredData.grammar_summary.verb_forms.map((form, idx) => (
                            <Badge key={idx} variant="secondary">
                              {form}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Key Patterns */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Key Patterns:</h4>
                        <div className="flex flex-wrap gap-2">
                          {structuredData.grammar_summary.key_patterns.map((pattern, idx) => (
                            <Badge key={idx} className="bg-primary/20 font-japanese">
                              {pattern}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Suggested Flashcards Tab */}
                <TabsContent value="flashcards" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold">
                      {structuredData.suggested_flashcards.length} Suggested Flashcards
                    </h4>
                    <Button size="sm" onClick={handleAddAllFlashcards} variant="outline">
                      <Plus className="h-3 w-3 mr-1" />
                      Add All
                    </Button>
                  </div>

                  {structuredData.suggested_flashcards.map((flashcard, idx) => (
                    <Card key={idx} className="hover:border-primary transition-colors">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-lg font-japanese">{flashcard.word}</div>
                            <div className="text-sm text-muted-foreground">{flashcard.reading}</div>
                            {flashcard.hanviet && (
                              <div className="text-xs text-muted-foreground">({flashcard.hanviet})</div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {flashcard.jlpt_level && (
                              <Badge className={JLPT_COLORS[flashcard.jlpt_level]}>
                                {flashcard.jlpt_level}
                              </Badge>
                            )}
                            {flashcard.word_type && (
                              <Badge variant="outline">{flashcard.word_type}</Badge>
                            )}
                          </div>
                        </div>

                        <div className="text-sm mb-2">
                          <strong>Meaning:</strong> {flashcard.meaning}
                        </div>

                        <div className="p-2 bg-muted/30 rounded text-xs space-y-1">
                          <div className="font-japanese">{flashcard.example_sentence}</div>
                          <div className="text-muted-foreground">{flashcard.example_translation}</div>
                        </div>

                        {flashcard.notes && (
                          <div className="text-xs text-muted-foreground mt-2 italic">
                            💡 {flashcard.notes}
                          </div>
                        )}

                        <Button
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => handleAddFlashcard(flashcard)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add to Deck
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
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
