import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Save, X, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WordData {
  word: string;
  reading: string;
  meaning: string;
  word_type?: string;
  examples?: Array<{ japanese: string; vietnamese: string }>;
  notes?: string;
}

interface WordLookupPanelProps {
  wordData: WordData | null;
  loading: boolean;
  onClose: () => void;
  onSave: () => void;
  onSpeak: (text: string) => void;
}

export function WordLookupPanel({ wordData, loading, onClose, onSave, onSpeak }: WordLookupPanelProps) {
  return (
    <AnimatePresence>
      {(loading || wordData) && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="sticky top-6"
        >
          <Card className="shadow-elevated border-sakura/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-sakura" />
                  Tra từ
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-sakura" />
                </div>
              ) : wordData ? (
                <div className="space-y-4">
                  {/* Word and reading */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-3xl font-jp font-bold">{wordData.word}</p>
                      <p className="text-lg text-muted-foreground font-jp">{wordData.reading}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onSpeak(wordData.word)}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Word type */}
                  {wordData.word_type && (
                    <Badge variant="secondary">{wordData.word_type}</Badge>
                  )}

                  {/* Meaning */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Nghĩa</p>
                    <p className="text-lg">{wordData.meaning}</p>
                  </div>

                  {/* Examples */}
                  {wordData.examples && wordData.examples.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Ví dụ</p>
                      <div className="space-y-2">
                        {wordData.examples.map((ex, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-muted/50">
                            <p className="font-jp text-sm">{ex.japanese}</p>
                            <p className="text-sm text-muted-foreground">{ex.vietnamese}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {wordData.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Ghi chú</p>
                      <p className="text-sm">{wordData.notes}</p>
                    </div>
                  )}

                  {/* Save button */}
                  <Button onClick={onSave} className="w-full gap-2">
                    <Save className="h-4 w-4" />
                    Lưu vào bộ sưu tập
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
