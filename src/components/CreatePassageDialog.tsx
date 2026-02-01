import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CreatePassageDialogProps {
  onCreated: () => void;
}

export function CreatePassageDialog({ onCreated }: CreatePassageDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    level: 'N5',
    category: '',
    content: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Vui lòng đăng nhập để tạo bài đọc');
      return;
    }

    setLoading(true);
    try {
      // Call AI to generate furigana and vocabulary
      let content_with_furigana = form.content.replace(/\n/g, '<br />');
      let vocabulary_list: Array<{ word: string; reading: string; meaning: string }> = [];

      try {
        const { data, error } = await supabase.functions.invoke('generate-reading', {
          body: { content: form.content, level: form.level }
        });

        if (!error && data) {
          content_with_furigana = data.content_with_furigana || content_with_furigana;
          vocabulary_list = data.vocabulary_list || [];
        }
      } catch (aiError) {
        console.warn('AI analysis failed, using raw content:', aiError);
      }

      // Insert into database
      const { error: insertError } = await supabase
        .from('reading_passages')
        .insert({
          title: form.title,
          content: form.content,
          content_with_furigana,
          level: form.level,
          category: form.category || null,
          vocabulary_list,
          user_id: user.id,
        });

      if (insertError) throw insertError;

      toast.success('Tạo bài đọc thành công!');
      setOpen(false);
      setForm({ title: '', level: 'N5', category: '', content: '' });
      onCreated();
    } catch (error: any) {
      console.error('Error creating passage:', error);
      toast.error('Không thể tạo bài đọc: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo bài đọc mới
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sakura" />
            Tạo Bài Đọc Mới
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tên bài đọc</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ví dụ: 私の一日"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Trình độ</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="N5">N5 - Sơ cấp</SelectItem>
                  <SelectItem value="N4">N4 - Tiền trung</SelectItem>
                  <SelectItem value="N3">N3 - Trung cấp</SelectItem>
                  <SelectItem value="N2">N2 - Tiền cao</SelectItem>
                  <SelectItem value="N1">N1 - Cao cấp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Chủ đề</Label>
              <Input
                id="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ví dụ: Du lịch"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Nội dung (Tiếng Nhật)</Label>
            <Textarea
              id="content"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Nhập nội dung tiếng Nhật tại đây..."
              className="min-h-[150px] font-jp"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Đang xử lý AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Tạo bài đọc
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
