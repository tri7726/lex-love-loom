
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  GripVertical, 
  BookOpen, 
  Brain, 
  Headphones, 
  Zap, 
  Play,
  Save,
  ChevronLeft,
  Loader2,
  Layers,
  Settings2,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CurriculumItem {
  id?: string;
  type: string;
  title: string;
  content_link: string;
  order_index: number;
  status: string;
}

interface CurriculumUnit {
  id: string;
  title: string;
  description: string;
  order_index: number;
  status: string;
  curriculum_items: CurriculumItem[];
}

export const CurriculumManager = () => {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<any[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [units, setUnits] = useState<CurriculumUnit[]>([]);
  const [mockExams, setMockExams] = useState<{id: string, title: string, level: string}[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<string>('vocabulary');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [targetUnitId, setTargetUnitId] = useState<string>('');

  useEffect(() => {
    fetchLevels();
  }, []);

  useEffect(() => {
    if (selectedLevelId) {
      fetchCurriculum();
    }
  }, [selectedLevelId]);

  const fetchLevels = async () => {
    const { data } = await (supabase as any).from('curriculum_levels').select('*').order('code');
    setLevels(data || []);
    if (data?.length > 0) setSelectedLevelId(data[0].id);
  };

  const fetchCurriculum = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('curriculum_units')
        .select('*, curriculum_items(*)')
        .eq('level_id', selectedLevelId)
        .order('order_index');
      
      if (error) throw error;
      
      const sortedUnits = (data || []).map((unit: any) => ({
        ...unit,
        curriculum_items: (unit.curriculum_items || []).sort((a: any, b: any) => a.order_index - b.order_index)
      }));
      
      setUnits(sortedUnits);

      // Also fetch mock exams for linking
      const { data: examsData } = await (supabase as any)
        .from('mock_exams')
        .select('id, title, level')
        .eq('is_published', true);
      
      if (examsData) setMockExams(examsData);
    } catch (err) {
      toast.error('Lỗi tải lộ trình');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const unitData = {
      title: formData.get('title'),
      description: formData.get('description'),
      level_id: selectedLevelId,
      order_index: editingUnit ? editingUnit.order_index : units.length + 1,
      status: editingUnit ? editingUnit.status : 'published'
    };

    try {
      if (editingUnit) {
        await (supabase as any).from('curriculum_units').update(unitData).eq('id', editingUnit.id);
      } else {
        await (supabase as any).from('curriculum_units').insert(unitData);
      }
      toast.success('Đã lưu Unit');
      setUnitDialogOpen(false);
      fetchCurriculum();
    } catch (err) {
      toast.error('Lỗi khi lưu');
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const itemData = {
      title: formData.get('title'),
      type: formData.get('type'),
      content_link: formData.get('content_link'),
      unit_id: targetUnitId,
      order_index: editingItem ? editingItem.order_index : 10,
      status: editingItem ? editingItem.status : 'published'
    };

    try {
      if (editingItem) {
        await (supabase as any).from('curriculum_items').update(itemData).eq('id', editingItem.id);
      } else {
        await (supabase as any).from('curriculum_items').insert(itemData);
      }
      toast.success('Đã lưu mục học phần');
      setItemDialogOpen(false);
      fetchCurriculum();
    } catch (err) {
      toast.error('Lỗi khi lưu');
    }
  };

  const deleteUnit = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa Unit này và tất cả nội dung bên trong?')) return;
    await (supabase as any).from('curriculum_units').delete().eq('id', id);
    fetchCurriculum();
  };

  const deleteItem = async (id: string) => {
    await (supabase as any).from('curriculum_items').delete().eq('id', id);
    fetchCurriculum();
  };

  const toggleUnitStatus = async (unit: CurriculumUnit) => {
    const newStatus = unit.status === 'published' ? 'draft' : 'published';
    await (supabase as any).from('curriculum_units').update({ status: newStatus }).eq('id', unit.id);
    toast.success(`Đã ${newStatus === 'published' ? 'mở' : 'đóng'} Unit`);
    fetchCurriculum();
  };

  const toggleItemStatus = async (item: CurriculumItem) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    await (supabase as any).from('curriculum_items').update({ status: newStatus }).eq('id', item.id);
    toast.success(`Đã ${newStatus === 'published' ? 'mở' : 'đóng'} mục học phần`);
    fetchCurriculum();
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] pb-20">
      <main className="max-w-6xl mx-auto px-4 md:px-10 py-10">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="space-y-1">
             <button onClick={() => navigate('/teacher')} className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-sakura mb-4 transition-colors">
                <ChevronLeft className="h-4 w-4" /> Quay lại Dashboard
             </button>
             <h1 className="text-4xl font-black text-sumi flex items-center gap-3">
               <Layers className="h-10 w-10 text-sakura" /> Quản lý lộ trình
             </h1>
             <p className="text-muted-foreground font-medium">Xây dựng và tổ chức nội dung bài học theo từng cấp độ JLPT.</p>
          </div>

          <div className="flex items-center gap-3">
             <Select value={selectedLevelId} onValueChange={setSelectedLevelId}>
                <SelectTrigger className="w-40 h-12 rounded-xl border-2 border-sakura-light/20 font-black">
                   <SelectValue placeholder="Chọn cấp độ" />
                </SelectTrigger>
                <SelectContent>
                   {levels.map(lvl => (
                     <SelectItem key={lvl.id} value={lvl.id}>{lvl.code}</SelectItem>
                   ))}
                </SelectContent>
             </Select>
             <Button 
                onClick={() => { setEditingUnit(null); setUnitDialogOpen(true); }}
                className="h-12 px-6 rounded-xl bg-sakura hover:bg-sakura-dark text-white font-black shadow-sakura"
             >
                <Plus className="h-5 w-5 mr-2" /> Thêm Unit
             </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
             <Loader2 className="h-10 w-10 animate-spin text-sakura" />
          </div>
        ) : (
          <div className="space-y-8">
            {units.length === 0 && (
              <Card className="rounded-[2.5rem] border-2 border-dashed border-sakura-light/30 bg-white/40 p-20 text-center">
                 <h3 className="text-xl font-bold mb-2 text-muted-foreground">Chưa có bài học nào cho cấp độ này</h3>
                 <p className="text-sm text-muted-foreground mb-6">Hãy bắt đầu bằng việc tạo Unit đầu tiên.</p>
                 <Button onClick={() => setUnitDialogOpen(true)} variant="outline" className="rounded-xl border-sakura text-sakura font-bold">
                    Tạo ngay
                 </Button>
              </Card>
            )}

            {units.map((unit, uIdx) => (
              <Card key={unit.id} className="rounded-[2.5rem] border-2 border-sakura-light/10 shadow-card bg-white overflow-hidden">
                 <CardHeader className="p-8 pb-4 flex flex-row items-start justify-between bg-slate-50/50">
                    <div className="flex items-start gap-4">
                       <div className="h-10 w-10 rounded-full bg-sakura text-white flex items-center justify-center font-black">
                          {unit.order_index}
                       </div>
                       <div className="space-y-1">
                          <CardTitle className="text-2xl font-black text-sumi">{unit.title}</CardTitle>
                          <p className="text-sm text-muted-foreground font-medium">{unit.description}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button 
                          variant="ghost" size="sm" 
                          onClick={() => toggleUnitStatus(unit)}
                          className={cn(
                            "rounded-xl gap-2 font-bold px-3",
                            unit.status === 'published' ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" : "text-amber-600 bg-amber-50 hover:bg-amber-100"
                          )}
                       >
                          {unit.status === 'published' ? <CheckCircle2 className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                          {unit.status === 'published' ? 'Đã mở' : 'Bản nháp'}
                       </Button>
                       <Button 
                          variant="ghost" size="icon" 
                          onClick={() => { setEditingUnit(unit); setUnitDialogOpen(true); }}
                          className="h-10 w-10 rounded-xl hover:bg-sakura/10 text-sakura"
                       >
                          <Edit3 className="h-5 w-5" />
                       </Button>
                       <Button 
                          variant="ghost" size="icon" 
                          onClick={() => deleteUnit(unit.id)}
                          className="h-10 w-10 rounded-xl hover:bg-rose-50 text-rose-500"
                       >
                          <Trash2 className="h-5 w-5" />
                       </Button>
                    </div>
                 </CardHeader>
                 <CardContent className="p-8 pt-6 space-y-4">
                    <div className="space-y-3">
                       {unit.curriculum_items.map((item, iIdx) => (
                         <div key={item.id} className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl group hover:border-sakura-light/30 transition-all">
                            <div className="flex items-center gap-4">
                               <GripVertical className="h-4 w-4 text-slate-300" />
                               <div className={cn(
                                 "h-10 w-10 rounded-xl flex items-center justify-center",
                                 item.type === 'vocabulary' ? "bg-matcha/10 text-matcha" :
                                 item.type === 'grammar' ? "bg-indigo-100 text-indigo-600" :
                                 item.type === 'listening' ? "bg-sky-100 text-sky-600" :
                                 item.type === 'assignment' ? "bg-amber-100 text-amber-600" :
                                 "bg-slate-100 text-slate-600"
                               )}>
                                  {item.type === 'vocabulary' ? <BookOpen className="h-5 w-5" /> :
                                   item.type === 'grammar' ? <Brain className="h-5 w-5" /> :
                                   item.type === 'listening' ? <Headphones className="h-5 w-5" /> :
                                   item.type === 'assignment' ? <Zap className="h-5 w-5" /> :
                                   <Play className="h-5 w-5" />}
                               </div>
                               <div>
                                  <p className="font-black text-sumi">{item.title}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{item.content_link}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Button 
                                  variant="ghost" size="icon" 
                                  onClick={() => { setEditingItem(item); setTargetUnitId(unit.id); setItemDialogOpen(true); }}
                                  className="h-8 w-8 rounded-lg hover:bg-slate-100"
                               >
                                  <Edit3 className="h-4 w-4" />
                               </Button>
                               <Button 
                                  variant="ghost" size="icon" 
                                  onClick={() => deleteItem(item.id!)}
                                  className="h-8 w-8 rounded-lg hover:bg-rose-50 text-rose-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                               </Button>
                            </div>
                         </div>
                       ))}

                       <Button 
                          onClick={() => { setEditingItem(null); setTargetUnitId(unit.id); setItemDialogOpen(true); }}
                          variant="ghost" 
                          className="w-full h-14 rounded-2xl border-2 border-dashed border-slate-100 text-muted-foreground hover:text-sakura hover:border-sakura-light/30 hover:bg-sakura/5 gap-2 font-bold"
                       >
                          <Plus className="h-5 w-5" /> Thêm mục mới vào {unit.title}
                       </Button>
                    </div>
                 </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Unit Dialog */}
        <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
           <DialogContent className="rounded-[2.5rem]">
              <form onSubmit={handleSaveUnit}>
                 <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-sumi">{editingUnit ? 'Sửa Unit' : 'Thêm Unit mới'}</DialogTitle>
                 </DialogHeader>
                 <div className="py-6 space-y-4">
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-sumi px-1">Tiêu đề bài học</label>
                       <Input name="title" defaultValue={editingUnit?.title} placeholder="Ví dụ: Unit 1: Lời chào" required className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-sumi px-1">Mô tả ngắn</label>
                       <Textarea name="description" defaultValue={editingUnit?.description} placeholder="Mô tả những gì học sinh sẽ học..." className="rounded-xl min-h-[100px]" />
                    </div>
                 </div>
                 <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setUnitDialogOpen(false)} className="font-bold">Hủy</Button>
                    <Button type="submit" className="bg-sakura text-white font-black rounded-xl gap-2 px-6">
                       <Save className="h-4 w-4" /> Lưu Unit
                    </Button>
                 </DialogFooter>
              </form>
           </DialogContent>
        </Dialog>

        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
           <DialogContent className="rounded-[2.5rem]">
              <form onSubmit={handleSaveItem}>
                 <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-sumi">{editingItem ? 'Sửa mục học' : 'Thêm mục mới'}</DialogTitle>
                 </DialogHeader>
                 <div className="py-6 space-y-4">
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-sumi px-1">Loại nội dung</label>
                       <Select 
                         name="type" 
                         defaultValue={editingItem?.type || 'vocabulary'}
                         onValueChange={(val) => setSelectedItemType(val)}
                       >
                          <SelectTrigger className="h-12 rounded-xl font-bold">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="vocabulary">Từ vựng & Kanji</SelectItem>
                             <SelectItem value="grammar">Ngữ pháp</SelectItem>
                             <SelectItem value="listening">Luyện nghe</SelectItem>
                             <SelectItem value="assignment">Bài tập / Kiểm tra</SelectItem>
                             <SelectItem value="video">Video bài giảng</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>

                    {selectedItemType === 'assignment' && (
                      <div className="space-y-2 p-4 bg-sakura/5 rounded-2xl border border-sakura/10">
                        <label className="text-xs font-black text-sakura uppercase tracking-widest">Chọn đề thi từ hệ thống</label>
                        <Select 
                          onValueChange={(examId) => {
                            const exam = mockExams.find(ex => ex.id === examId);
                            if (exam) {
                              const titleInput = document.getElementsByName('title')[0] as HTMLInputElement;
                              const linkInput = document.getElementsByName('content_link')[0] as HTMLInputElement;
                              if (titleInput) titleInput.value = `Thi thử: ${exam.title}`;
                              if (linkInput) linkInput.value = `/mock-tests/${examId}`;
                            }
                          }}
                        >
                          <SelectTrigger className="h-10 rounded-xl font-bold bg-white">
                            <SelectValue placeholder="-- Chọn đề thi --" />
                          </SelectTrigger>
                          <SelectContent>
                            {mockExams.map(ex => (
                              <SelectItem key={ex.id} value={ex.id}>[{ex.level}] {ex.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                       <label className="text-sm font-bold text-sumi px-1">Tiêu đề hiển thị</label>
                       <Input name="title" defaultValue={editingItem?.title} placeholder="Ví dụ: Từ vựng Unit 1" required className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-sumi px-1">Đường dẫn nội dung (Link)</label>
                       <Input name="content_link" defaultValue={editingItem?.content_link} placeholder="/vocabulary?level=N5..." required className="h-12 rounded-xl font-mono text-xs" />
                    </div>
                 </div>
                 <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setItemDialogOpen(false)} className="font-bold">Hủy</Button>
                    <Button type="submit" className="bg-sakura text-white font-black rounded-xl gap-2 px-6">
                       <Save className="h-4 w-4" /> Lưu mục
                    </Button>
                 </DialogFooter>
              </form>
           </DialogContent>
        </Dialog>

      </main>
    </div>
  );
};

export default CurriculumManager;
