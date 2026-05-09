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
      <main className="container py-8 max-w-6xl space-y-8">
        {/* Back */}
        <Button variant="ghost" className="gap-2 rounded-xl" onClick={() => navigate('/teacher')}>
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>

        <div className="space-y-2">
          <Badge variant="outline" className="text-sakura border-sakura/20 bg-sakura/5 gap-1.5 px-3 py-1">
            <GraduationCap className="h-3.5 w-3.5" /> Quản lý Giáo viên
          </Badge>
          <h1 className="text-4xl font-display font-black tracking-tight">Tạo Lớp Học Mới</h1>
          <p className="text-muted-foreground">Thiết lập không gian học tập trực tuyến cho học sinh của bạn</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Side */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="rounded-3xl border-2 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-sakura" /> Chi tiết lớp học
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="class-name" className="text-sm font-bold ml-1">
                    Tên lớp học <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="class-name"
                    placeholder="VD: N4 Sáng Thứ 3 — Nhóm A"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-12 rounded-2xl border-2 focus-visible:ring-sakura/30 transition-all text-base"
                    maxLength={80}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class-desc" className="text-sm font-bold ml-1">Mô tả lớp học (tùy chọn)</Label>
                  <Textarea
                    id="class-desc"
                    placeholder="Thông tin về lộ trình, lịch học, hoặc yêu cầu đầu vào..."
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="rounded-2xl border-2 focus-visible:ring-sakura/30 transition-all resize-none text-base"
                    maxLength={300}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold ml-1">Cấp độ JLPT Mục tiêu</Label>
                    <Select value={jlptLevel} onValueChange={setJlptLevel}>
                      <SelectTrigger className="h-12 rounded-2xl border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map(l => (
                          <SelectItem key={l} value={l} className="font-bold">{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-sakura/5 rounded-2xl border border-sakura/10 flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-sakura/10 flex items-center justify-center shrink-0">
                    <span className="text-sakura text-sm">💡</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sau khi tạo, hệ thống sẽ cấp một <strong>mã mời duy nhất</strong>. Bạn chỉ cần gửi mã này cho học sinh để họ có thể tham gia vào lớp học ngay lập tức.
                  </p>
                </div>

                <Button
                  className="w-full h-14 rounded-2xl text-lg font-black gap-2 bg-sakura hover:bg-sakura/90 shadow-lg shadow-sakura/20 transition-all active:scale-[0.98]"
                  onClick={handleCreate}
                  disabled={saving || !name.trim()}
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  Kích hoạt Lớp học
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview Side */}
          <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest">Xem trước hiển thị</h2>
              <Badge variant="secondary" className="text-[10px] animate-pulse">Live Preview</Badge>
            </div>

            <motion.div
              layout
              className="rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl relative bg-card"
            >
              {/* Card Header Background */}
              <div className={`h-32 bg-gradient-to-br ${previewGradient} relative`}>
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute top-4 right-4">
                  <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black border border-white/30">
                    {jlptLevel}
                  </div>
                </div>
                <GraduationCap className="absolute bottom-[-20px] right-6 h-20 w-20 text-white/10 rotate-12" />
              </div>

              <div className="p-8 pt-10 relative">
                {/* Avatar/Icon overlap */}
                <div className="absolute top-[-30px] left-8 h-16 w-16 rounded-2xl bg-white shadow-xl flex items-center justify-center border-4 border-background">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${previewGradient} flex items-center justify-center text-white`}>
                    <BookOpen className="h-6 w-6" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-black font-display leading-tight break-words">
                      {name || 'Tên lớp học của bạn'}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Lớp học đang sẵn sàng</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed min-h-[3em]">
                    {description || 'Mô tả lớp học sẽ xuất hiện tại đây để học sinh hiểu rõ về lộ trình học tập...'}
                  </p>

                  <div className="pt-4 border-t border-dashed flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Mã tham gia</p>
                      <div className="px-3 py-1.5 bg-muted rounded-xl border-2 border-border/50 font-mono font-black text-primary tracking-widest text-lg">
                        ????????
                      </div>
                    </div>
                    <Button disabled variant="outline" className="rounded-xl font-bold opacity-50">
                      Vào lớp
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <h4 className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                <span className="text-base">ℹ️</span> Mẹo nhỏ
              </h4>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Hãy đặt tên lớp ngắn gọn và dễ nhớ. Một mô tả chi tiết về lịch học sẽ giúp học sinh chủ động hơn trong việc sắp xếp thời gian.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateClassroom;
