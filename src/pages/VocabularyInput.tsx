import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navigation from '@/components/Navigation';
import { toast } from 'sonner';

const VocabularyInput = () => {
  const [word, setWord] = useState('');
  const [furigana, setFurigana] = useState('');
  const [meaning, setMeaning] = useState('');
  const [level, setLevel] = useState('N5');
  const [category, setCategory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word || !meaning) {
      toast.error('Please fill in required fields');
      return;
    }
    
    toast.success('Word added successfully!');
    setWord('');
    setFurigana('');
    setMeaning('');
    setCategory('');
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-2">
            <Plus className="h-8 w-8 text-matcha" />
            Add Vocabulary
          </h1>
          <p className="text-muted-foreground">
            Add new words to your vocabulary list
          </p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-lg mx-auto shadow-card">
            <CardHeader>
              <CardTitle>New Word</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="word">Japanese Word *</Label>
                  <Input
                    id="word"
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    placeholder="例: 食べる"
                    className="font-jp text-lg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="furigana">Furigana</Label>
                  <Input
                    id="furigana"
                    value={furigana}
                    onChange={(e) => setFurigana(e.target.value)}
                    placeholder="例: たべる"
                    className="font-jp"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meaning">Meaning *</Label>
                  <Input
                    id="meaning"
                    value={meaning}
                    onChange={(e) => setMeaning(e.target.value)}
                    placeholder="e.g., to eat"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Level</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="N5">N5</SelectItem>
                        <SelectItem value="N4">N4</SelectItem>
                        <SelectItem value="N3">N3</SelectItem>
                        <SelectItem value="N2">N2</SelectItem>
                        <SelectItem value="N1">N1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g., Verbs"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full gap-2">
                  <Save className="h-4 w-4" />
                  Save Word
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default VocabularyInput;
