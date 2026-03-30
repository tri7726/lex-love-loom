import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Camera, 
  Check, 
  ChevronLeft, 
  Save, 
  Loader2,
  AlertCircle,
  Type,
  Book
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfile, type Profile } from '@/hooks/useProfile';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const EditProfile = () => {
  const { profile, refreshProfile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    jlptLevel: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.display_name || '',
        bio: profile.bio || '',
        jlptLevel: profile.jlpt_level || 'N5'
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.displayName,
          bio: formData.bio,
          jlpt_level: formData.jlptLevel,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      toast({
        title: "Thành công!",
        description: "Hồ sơ của bạn đã được cập nhật.",
      });
      
      await refreshProfile();
      navigate(`/profile/${profile.user_id}`);
    } catch (error: unknown) {
      toast({
        title: "Lỗi cập nhật",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="container py-10 max-w-2xl mx-auto space-y-8">
        <Link to={profile ? `/profile/${profile.user_id}` : '/friends'}>
          <Button variant="ghost" className="gap-2 mb-4">
            <ChevronLeft className="h-4 w-4" /> Quay lại hồ sơ
          </Button>
        </Link>

        <section className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-display font-bold">Chỉnh sửa hồ sơ</h1>
            <p className="text-muted-foreground">
              Cập nhật thông tin cá nhân để bạn bè dễ dàng nhận diện bạn.
            </p>
          </div>

          <Card className="border-2 border-primary/10 shadow-soft overflow-hidden">
            <CardHeader className="bg-primary/5 pb-8">
              <div className="flex justify-center -mb-20 pt-4">
                <div className="relative group">
                  <div className="h-32 w-32 rounded-[2rem] bg-muted border-4 border-background shadow-xl flex items-center justify-center overflow-hidden">
                    <User className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <Button size="icon" className="absolute -bottom-2 -right-2 rounded-xl shadow-lg">
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-16 space-y-6 px-8">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Type className="h-3 w-3" /> Tên hiển thị
                </Label>
                <Input 
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  placeholder="Nhập tên của bạn..."
                  className="rounded-xl border-2 h-12 focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jlptLevel" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Book className="h-3 w-3" /> Trình độ JLPT mục tiêu
                </Label>
                <Select 
                  value={formData.jlptLevel} 
                  onValueChange={(val) => setFormData({...formData, jlptLevel: val})}
                >
                  <SelectTrigger className="rounded-xl border-2 h-12">
                    <SelectValue placeholder="Chọn trình độ" />
                  </SelectTrigger>
                  <SelectContent>
                    {['N5', 'N4', 'N3', 'N2', 'N1'].map(level => (
                      <SelectItem key={level} value={level}>JLPT {level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  Lời giới thiệu (Bio)
                </Label>
                <Textarea 
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Chia sẻ một chút về mục tiêu học tập của bạn..."
                  className="rounded-xl border-2 min-h-[120px] focus-visible:ring-primary/20"
                />
              </div>

              <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 flex gap-3 text-sm text-secondary-foreground">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p>Thông tin này sẽ được hiển thị công khai cho tất cả người dùng trong cộng đồng.</p>
              </div>
            </CardContent>
            <CardFooter className="px-8 pb-8 flex gap-3">
              <Button 
                onClick={handleSave} 
                disabled={loading}
                className="flex-1 rounded-xl h-12 shadow-sakura font-bold gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu thay đổi
              </Button>
            </CardFooter>
          </Card>
        </section>
      </main>
    </div>
  );
};
