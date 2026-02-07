import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, FolderOpen, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface CourseModule {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  order_index: number;
  created_at: string;
}

const defaultIcons = ['📚', '🎯', '⭐', '🔥', '💡', '🌸', '🎌', '✨'];
const defaultColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const ModuleManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📚',
    color: '#3b82f6',
  });

  useEffect(() => {
    if (user) {
      fetchModules();
    }
  }, [user]);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('course_modules')
        .select('*')
        .eq('user_id', user!.id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách học phần',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tên học phần',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingModule) {
        // Update
        const { error } = await supabase
          .from('course_modules')
          .update({
            name: formData.name,
            description: formData.description || null,
            icon: formData.icon,
            color: formData.color,
          })
          .eq('id', editingModule.id);

        if (error) throw error;

        toast({
          title: 'Thành công',
          description: 'Đã cập nhật học phần',
        });
      } else {
        // Create
        const { error } = await supabase
          .from('course_modules')
          .insert({
            user_id: user!.id,
            name: formData.name,
            description: formData.description || null,
            icon: formData.icon,
            color: formData.color,
            order_index: modules.length,
          });

        if (error) throw error;

        toast({
          title: 'Thành công',
          description: 'Đã tạo học phần mới',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchModules();
    } catch (error) {
      console.error('Error saving module:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu học phần',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (moduleId: string) => {
    if (!confirm('Bạn có chắc muốn xóa học phần này?')) return;

    try {
      const { error } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      toast({
        title: 'Thành công',
        description: 'Đã xóa học phần',
      });
      fetchModules();
    } catch (error) {
      console.error('Error deleting module:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa học phần',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (module: CourseModule) => {
    setEditingModule(module);
    setFormData({
      name: module.name,
      description: module.description || '',
      icon: module.icon,
      color: module.color,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingModule(null);
    setFormData({
      name: '',
      description: '',
      icon: '📚',
      color: '#3b82f6',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navigation />
        <main className="container py-6">
          <Card>
            <CardContent className="py-8 text-center">
              <p>Vui lòng đăng nhập để quản lý học phần</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <main className="container py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold">Quản Lý Học Phần</h1>
              <p className="text-muted-foreground mt-1">
                Tổ chức từ vựng theo các học phần như N5, N4, N3...
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Tạo Học Phần
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingModule ? 'Chỉnh Sửa Học Phần' : 'Tạo Học Phần Mới'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Tên học phần *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: N5 - Sơ cấp"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Mô tả ngắn về học phần này..."
                    />
                  </div>
                  <div>
                    <Label>Icon</Label>
                    <div className="grid grid-cols-8 gap-2 mt-2">
                      {defaultIcons.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon })}
                          className={`text-2xl p-2 rounded hover:bg-muted ${
                            formData.icon === icon ? 'bg-primary/10 ring-2 ring-primary' : ''
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Màu sắc</Label>
                    <div className="grid grid-cols-8 gap-2 mt-2">
                      {defaultColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded ${
                            formData.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </DialogFooter>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleCreateOrUpdate}>
                    {editingModule ? 'Cập Nhật' : 'Tạo'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Modules Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : modules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">Chưa có học phần nào</p>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Tạo học phần đầu tiên
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => (
                <motion.div
                  key={module.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="cursor-pointer hover:shadow-lg transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="p-3 rounded-lg text-white text-2xl"
                          style={{ backgroundColor: module.color }}
                        >
                          {module.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{module.name}</CardTitle>
                          {module.description && (
                            <CardDescription className="text-xs mt-1 line-clamp-2">
                              {module.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => navigate(`/folder-manager?module=${module.id}`)}
                        >
                          <FolderOpen className="h-3 w-3" />
                          Xem Folder
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(module)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(module.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ModuleManager;
