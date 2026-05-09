import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, ArrowLeft, Loader2, Save, BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

const LEVEL_COLORS: Record<string, string> = {
  N5: 'from-sky-400 to-blue-500',
  N4: 'from-emerald-400 to-teal-500',
  N3: 'from-yellow-400 to-lime-500',
  N2: 'from-orange-400 to-amber-500',
  N1: 'from-red-400 to-rose-500',
};

export const CreateClassroom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [jlptLevel, setJlptLevel] = useState('N5');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: 'Vui lòng nhập tên lớp', variant: 'destructive' });
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from('classrooms')
        .insert({
          teacher_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          jlpt_level: jlptLevel,
        })
        .select('id, invite_code')
        .single();

      if (error) throw error;

      toast({
        title: `Tạo lớp "${name}" thành công! 🎉`,
        description: `Mã mời: ${data.invite_code}`,
      });
      navigate(`/teacher/classes/${data.id}`);
    } catch (err: any) {
      toast({ title: 'Lỗi tạo lớp', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const previewGradient = LEVEL_COLORS[jlptLevel];

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="container py-8 max-w-2xl space-y-8">
        {/* Back */}
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/teacher')}>
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>

        <div className="space-y-2">
          <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 gap-1.5">
            <GraduationCap className="h-3 w-3" /> Tạo lớp mới
          </Badge>
          <h1 className="text-3xl font-display font-bold">Thông tin lớp học</h1>
        </div>

        {/* Preview card */}
        <motion.div
          animate={{ opacity: name ? 1 : 0.4 }}
          className="rounded-3xl overflow-hidden border-2 border-border shadow-lg"
        >
          <div className={`h-2 bg-gradient-to-r ${previewGradient}`} />
          <div className="p-6 bg-card/60 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold font-display">
                  {name || 'Tên lớp của bạn'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {description || 'Mô tả lớp học...'}
                </p>
              </div>
              <Badge className="shrink-0 bg-primary/10 text-primary border-0">
                {jlptLevel}
              </Badge>
            </div>
            <div className="mt-4 flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 w-fit border border-border/40">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Mã mời:</span>
              <span className="font-mono font-black text-primary tracking-widest text-sm">????????</span>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <Card className="rounded-3xl border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Chi tiết lớp học
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="class-name">
                Tên lớp <span className="text-destructive">*</span>
              </Label>
              <Input
                id="class-name"
                placeholder="VD: N4 Sáng Thứ 3 — Nhóm A"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-12 rounded-xl"
                maxLength={80}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="class-desc">Mô tả (tuỳ chọn)</Label>
              <Textarea
                id="class-desc"
                placeholder="Thông tin về lớp, lịch học, yêu cầu..."
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="rounded-xl resize-none"
                maxLength={300}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Cấp độ JLPT của lớp</Label>
              <Select value={jlptLevel} onValueChange={setJlptLevel}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2">
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
                💡 Sau khi tạo, bạn sẽ nhận được <strong>mã mời 8 ký tự</strong>. Chia sẻ mã này cho học sinh để họ tham gia lớp.
              </p>
            </div>

            <Button
              className="w-full h-14 rounded-2xl text-base font-bold gap-2"
              onClick={handleCreate}
              disabled={saving || !name.trim()}
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Tạo lớp học
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateClassroom;
