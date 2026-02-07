import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, FolderPlus, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

interface Folder {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  parent_id: string | null;
  module_id: string | null;
  order_index: number;
  children?: Folder[];
}

const defaultIcons = ['📁', '📂', '📚', '📖', '✏️', '🎯', '⭐', '💡'];
const defaultColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const FolderNode: React.FC<{
  folder: Folder;
  onEdit: (folder: Folder) => void;
  onDelete: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  level: number;
}> = ({ folder, onEdit, onDelete, onCreateChild, level }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div className="space-y-1">
      <div
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted group"
        style={{ paddingLeft: `${level * 1.5}rem` }}
      >
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-background rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}
        
<div
          className="p-1.5 rounded text-lg"
          style={{ backgroundColor: folder.color }}
        >
          {folder.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{folder.name}</p>
          {folder.description && (
            <p className="text-xs text-muted-foreground truncate">
              {folder.description}
            </p>
          )}
        </div>
        
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCreateChild(folder.id)}
          >
            <FolderPlus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(folder)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(folder.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <div className="space-y-1">
          {folder.children!.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateChild={onCreateChild}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FolderManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const moduleId = searchParams.get('module');
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📁',
    color: '#10b981',
    parent_id: null as string | null,
  });

  useEffect(() => {
    if (user) {
      fetchFolders();
    }
  }, [user, moduleId]);

  const fetchFolders = async () => {
    try {
      let query = supabase
        .from('vocabulary_folders')
        .select('*')
        .eq('user_id', user!.id)
        .order('order_index', { ascending: true });

      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Build tree structure
      const folderMap = new Map<string, Folder>();
      const rootFolders: Folder[] = [];

      data?.forEach((folder) => {
        folderMap.set(folder.id, { ...folder, children: [] });
      });

      data?.forEach((folder) => {
        const folderNode = folderMap.get(folder.id)!;
        if (folder.parent_id) {
          const parent = folderMap.get(folder.parent_id);
          if (parent) {
            parent.children!.push(folderNode);
          }
        } else {
          rootFolders.push(folderNode);
        }
      });

      setFolders(rootFolders);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách folder',
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
        description: 'Vui lòng nhập tên folder',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingFolder) {
        const { error } = await supabase
          .from('vocabulary_folders')
          .update({
            name: formData.name,
            description: formData.description || null,
            icon: formData.icon,
            color: formData.color,
            parent_id: formData.parent_id,
          })
          .eq('id', editingFolder.id);

        if (error) throw error;

        toast({ title: 'Thành công', description: 'Đã cập nhật folder' });
      } else {
        const { error } = await supabase
          .from('vocabulary_folders')
          .insert({
            user_id: user!.id,
            module_id: moduleId || null,
            name: formData.name,
            description: formData.description || null,
            icon: formData.icon,
            color: formData.color,
            parent_id: parentIdForNew || formData.parent_id,
            order_index: 0,
          });

        if (error) throw error;

        toast({ title: 'Thành công', description: 'Đã tạo folder mới' });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchFolders();
    } catch (error) {
      console.error('Error saving folder:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu folder',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (folderId: string) => {
    if (!confirm('Bạn có chắc muốn xóa folder này? Các folder con cũng sẽ bị xóa.')) return;

    try {
      const { error } = await supabase
        .from('vocabulary_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      toast({ title: 'Thành công', description: 'Đã xóa folder' });
      fetchFolders();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa folder',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (folder: Folder) => {
    setEditingFolder(folder);
    setParentIdForNew(null);
    setFormData({
      name: folder.name,
      description: folder.description || '',
      icon: folder.icon,
      color: folder.color,
      parent_id: folder.parent_id,
    });
    setIsDialogOpen(true);
  };

  const openCreateChildDialog = (parentId: string) => {
    setEditingFolder(null);
    setParentIdForNew(parentId);
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingFolder(null);
    setParentIdForNew(null);
    setFormData({
      name: '',
      description: '',
      icon: '📁',
      color: '#10b981',
      parent_id: null,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navigation />
        <main className="container py-6">
          <Card>
            <CardContent className="py-8 text-center">
              <p>Vui lòng đăng nhập để quản lý folder</p>
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
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold">Quản Lý Folder</h1>
              <p className="text-muted-foreground mt-1">
                Tổ chức từ vựng thành các folder và folder con
              </p>
            </div>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Tạo Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingFolder ? 'Chỉnh Sửa Folder' : 'Tạo Folder Mới'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Tên folder *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: Động từ nhóm 1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Mô tả ngắn..."
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
                          className={`text-xl p-2 rounded hover:bg-muted ${
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
                    <div className="grid grid-cols-7 gap-2 mt-2">
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
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleCreateOrUpdate}>
                    {editingFolder ? 'Cập Nhật' : 'Tạo'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : folders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">Chưa có folder nào</p>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Tạo folder đầu tiên
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-1">
                  {folders.map((folder) => (
                    <FolderNode
                      key={folder.id}
                      folder={folder}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                      onCreateChild={openCreateChildDialog}
                      level={0}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default FolderManager;
