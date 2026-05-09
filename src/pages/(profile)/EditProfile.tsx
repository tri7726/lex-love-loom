import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Camera, 
  Check, 
  ChevronLeft, 
  Save, 
  Loader2,
  AlertCircle,
  Type,
  Book,
  MapPin,
  Globe,
  Facebook,
  Twitter,
  Github,
  Image as ImageIcon,
  Sparkles,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfile } from '@/hooks/useProfile';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export const EditProfile = () => {
  const { profile, refreshProfile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'social'>('basic');
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    jlptLevel: '',
    location: '',
    website: '',
    facebook: '',
    twitter: '',
    github: '',
    bannerUrl: '',
    avatarUrl: ''
  });

  useEffect(() => {
    if (profile) {
      // Cast profile to any to bypass stale TypeScript definition errors
      const p = profile as any;
      setFormData({
        displayName: p.display_name || '',
        bio: p.bio || '',
        jlptLevel: p.jlpt_level || 'N5',
        location: p.location || '',
        website: p.website || '',
        facebook: p.social_links?.facebook || '',
        twitter: p.social_links?.twitter || '',
        github: p.social_links?.github || '',
        bannerUrl: p.banner_url || '',
        avatarUrl: p.avatar_url || ''
      });
    }
  }, [profile]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File quá lớn", description: "Vui lòng chọn ảnh dưới 2MB.", variant: "destructive" });
      return;
    }

    setUploading(type);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.user_id}/${type}-${Date.now()}.${fileExt}`;
      const bucket = type === 'avatar' ? 'avatars' : 'banners';

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        [type === 'avatar' ? 'avatarUrl' : 'bannerUrl']: publicUrl
      }));

      toast({ title: "Đã tải ảnh lên", description: "Đừng quên nhấn Lưu để hoàn tất." });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: "Lỗi tải ảnh", description: error.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

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
          location: formData.location,
          website: formData.website,
          banner_url: formData.bannerUrl,
          avatar_url: formData.avatarUrl,
          social_links: {
            facebook: formData.facebook,
            twitter: formData.twitter,
            github: formData.github
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      toast({ title: "Thành công! ✨", description: "Hồ sơ của bạn đã được cập nhật lung linh hơn." });
      await refreshProfile();
      navigate(`/profile/${profile.user_id}`);
    } catch (error: any) {
      toast({ title: "Lỗi cập nhật", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="container py-10 max-w-2xl mx-auto space-y-8 px-4">
        <Link to={profile ? `/profile/${profile.user_id}` : '/friends'}>
          <Button variant="ghost" className="gap-2 mb-4 text-sakura hover:bg-sakura-light/50 rounded-xl transition-all">
            <ChevronLeft className="h-4 w-4" /> Quay lại hồ sơ
          </Button>
        </Link>

        <section className="space-y-6">
          <div className="space-y-2">
            <Badge className="bg-sakura/10 text-sakura border-sakura/20 mb-2 font-black uppercase text-[10px] tracking-widest">
              <Sparkles className="h-3 w-3 mr-1" /> Profile Settings
            </Badge>
            <h1 className="text-4xl font-display font-black text-sumi tracking-tight">Chỉnh sửa hồ sơ</h1>
            <p className="text-muted-foreground opacity-80 font-medium">Tùy biến không gian cá nhân của bạn theo phong cách Sakura.</p>
          </div>

          <Card className="border-2 border-sakura-light/30 shadow-card overflow-hidden rounded-[2.5rem] bg-white/80 backdrop-blur-md">
            {/* Banner Section */}
            <div className="relative h-44 bg-gradient-to-r from-sakura-light/30 via-accent/20 to-sakura-light/30">
              {formData.bannerUrl ? (
                <img src={formData.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-30 text-sakura"><ImageIcon className="h-12 w-12" /></div>
              )}
              <Button 
                size="sm" variant="secondary" 
                onClick={() => bannerInputRef.current?.click()}
                disabled={!!uploading}
                className="absolute top-4 right-4 rounded-xl gap-2 backdrop-blur-md bg-white/50 hover:bg-white/80 text-sakura font-bold border border-sakura-light/30 shadow-soft"
              >
                {uploading === 'banner' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} 
                Thay ảnh bìa
              </Button>
              <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'banner')} />
              
              {/* Avatar Overlay */}
              <div className="absolute -bottom-14 left-8">
                <div className="relative group">
                  <div className="h-32 w-32 rounded-[2.5rem] bg-white border-4 border-white shadow-card flex items-center justify-center overflow-hidden transition-transform group-hover:scale-[1.02]">
                    {formData.avatarUrl ? (
                      <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-14 w-14 text-sakura-light" />
                    )}
                    {uploading === 'avatar' && (
                      <div className="absolute inset-0 bg-sakura/40 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <Button 
                    size="icon" 
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={!!uploading}
                    className="absolute -bottom-1 -right-1 rounded-2xl shadow-elevated h-10 w-10 border-2 border-white bg-sakura text-white hover:bg-sakura-dark"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'avatar')} />
                </div>
              </div>
            </div>

            <CardContent className="pt-20 space-y-8 px-8 pb-10">
              <div className="flex gap-2 p-1.5 bg-sakura-light/10 rounded-2xl w-fit border border-sakura-light/20">
                <Button 
                  variant={activeTab === 'basic' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('basic')} 
                  className={cn("rounded-xl px-8 transition-all font-bold", activeTab === 'basic' ? "bg-sakura text-white shadow-soft" : "text-sakura")}
                >
                  Cơ bản
                </Button>
                <Button 
                  variant={activeTab === 'social' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setActiveTab('social')} 
                  className={cn("rounded-xl px-8 transition-all font-bold", activeTab === 'social' ? "bg-sakura text-white shadow-soft" : "text-sakura")}
                >
                  Liên kết
                </Button>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'basic' ? (
                  <motion.div key="basic" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-sakura-dark flex items-center gap-2 px-1"><Type className="h-3 w-3" /> Tên hiển thị</Label>
                        <Input value={formData.displayName} onChange={(e) => setFormData({...formData, displayName: e.target.value})} placeholder="Tên của bạn..." className="rounded-2xl border-2 border-sakura-light/30 h-14 bg-white focus:ring-sakura/20 font-medium" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-sakura-dark flex items-center gap-2 px-1"><Book className="h-3 w-3" /> Trình độ JLPT</Label>
                        <Select value={formData.jlptLevel} onValueChange={(val) => setFormData({...formData, jlptLevel: val})}>
                          <SelectTrigger className="rounded-2xl border-2 border-sakura-light/30 h-14 bg-white font-bold text-sumi">
                            <SelectValue placeholder="Chọn cấp độ" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-2 border-sakura-light/20">
                            {['N5', 'N4', 'N3', 'N2', 'N1'].map(level => <SelectItem key={level} value={level} className="font-bold">JLPT {level}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-sakura-dark flex items-center gap-2 px-1"><MapPin className="h-3 w-3" /> Vị trí</Label>
                        <Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Ví dụ: Hà Nội, Việt Nam" className="rounded-2xl border-2 border-sakura-light/30 h-14 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-sakura-dark flex items-center gap-2 px-1"><Globe className="h-3 w-3" /> Website</Label>
                        <Input value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} placeholder="https://example.com" className="rounded-2xl border-2 border-sakura-light/30 h-14 bg-white" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-sakura-dark flex items-center gap-2 px-1">Giới thiệu bản thân</Label>
                      <Textarea value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} placeholder="Hãy kể về hành trình học tiếng Nhật của bạn..." className="rounded-2xl border-2 border-sakura-light/30 min-h-[140px] bg-white resize-none font-medium" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="social" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    <div className="p-6 rounded-3xl bg-sakura-light/10 border border-sakura-light/20 flex gap-4 text-sm items-center">
                      <div className="h-12 w-12 rounded-2xl bg-white shadow-soft flex items-center justify-center text-sakura"><Upload className="h-6 w-6" /></div>
                      <p className="font-bold text-sumi/80">Kết nối mạng xã hội để bạn bè dễ dàng liên lạc với bạn ngoài ứng dụng.</p>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-sakura-dark flex items-center gap-2 px-1"><Facebook className="h-3 w-3" /> Facebook URL</Label>
                        <Input value={formData.facebook} onChange={(e) => setFormData({...formData, facebook: e.target.value})} placeholder="Link trang cá nhân của bạn" className="rounded-2xl border-2 border-sakura-light/30 h-14 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-sakura-dark flex items-center gap-2 px-1"><Twitter className="h-3 w-3" /> Twitter @Username</Label>
                        <Input value={formData.twitter} onChange={(e) => setFormData({...formData, twitter: e.target.value})} placeholder="Nhập username (không cần @)" className="rounded-2xl border-2 border-sakura-light/30 h-14 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-sakura-dark flex items-center gap-2 px-1"><Github className="h-3 w-3" /> Github Username</Label>
                        <Input value={formData.github} onChange={(e) => setFormData({...formData, github: e.target.value})} placeholder="Nhập username Github" className="rounded-2xl border-2 border-sakura-light/30 h-14 bg-white" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>

            <CardFooter className="px-8 pb-10 flex gap-4">
              <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-2xl h-16 px-8 border-2 border-sakura-light/20 text-sakura font-bold transition-all">Hủy</Button>
              <Button onClick={handleSave} disabled={loading || !!uploading} className="flex-1 rounded-2xl h-16 shadow-elevated bg-sakura hover:bg-sakura-dark text-white font-black gap-3 text-lg transition-all active:scale-95">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-6 w-6" />}
                Lưu Thay Đổi ✨
              </Button>
            </CardFooter>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default EditProfile;
