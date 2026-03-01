import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  BookMarked, 
  ChevronRight, 
  Filter, 
  Info,
  Layers,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

import { GRAMMAR_DB } from '../data/grammar-db';

export const GrammarWiki = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const filteredPoints = GRAMMAR_DB.filter(point => {
    const matchesSearch = point.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         point.explanation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = !selectedLevel || point.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      <main className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <Link to="/learning-path">
              <Button variant="ghost" size="sm" className="gap-2 mb-2">
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
            </Link>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <BookMarked className="h-8 w-8 text-sakura" />
              Thư viện Ngữ pháp
            </h1>
            <p className="text-muted-foreground">
              Tra cứu và học các cấu trúc ngữ pháp từ N5 đến N1 với giải thích chi tiết.
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm kiếm mẫu câu, ý nghĩa..." 
              className="pl-10 h-11 shadow-soft"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => (
              <Button
                key={level}
                variant={selectedLevel === level ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLevel(selectedLevel === level ? null : level)}
                className={`h-11 px-6 font-bold ${selectedLevel === level ? 'bg-sakura hover:bg-sakura/90' : ''}`}
              >
                {level}
              </Button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="grid gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPoints.length > 0 ? (
              filteredPoints.map((point, index) => (
                <motion.div
                  key={point.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="shadow-card hover:shadow-elevated transition-all border-l-4 border-l-sakura">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-sakura/10 text-sakura font-bold">
                          {point.level}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                          {point.category}
                        </span>
                      </div>
                      <CardTitle className="text-xl font-bold font-jp group cursor-pointer flex items-center gap-2">
                        {point.title}
                        <Sparkles className="h-4 w-4 text-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm font-medium text-foreground bg-muted/50 p-3 rounded-lg flex items-start gap-2">
                        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {point.explanation}
                      </p>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase opacity-70">Cấu trúc</p>
                        <code className="block bg-background border p-2 rounded text-sakura font-bold">
                          {point.usage}
                        </code>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase opacity-70">Ví dụ</p>
                        <p className="font-jp text-lg border-l-2 border-primary/20 pl-4 py-1 italic">
                          {point.example}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-20 bg-muted/30 rounded-2xl border-2 border-dashed">
                <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-bold mb-1">Không tìm thấy kết quả</h3>
                <p className="text-sm text-muted-foreground">Thử thay đổi từ khóa hoặc bộ lọc xem sao!</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
