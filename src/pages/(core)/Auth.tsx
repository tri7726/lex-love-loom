import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { SEO } from '@/components/seo/SEO';
import { useAuth } from '@/hooks/useAuth';

const emailSchema = z.string().email('Email không hợp lệ');
const passwordSchema = z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự');

export const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const safeRedirect = React.useMemo(() => {
    const r = searchParams.get('redirect');
    if (r && r.startsWith('/') && !r.startsWith('//')) return r;
    return '/';
  }, [searchParams]);

  // Khi đã có session (vừa đăng nhập hoặc đã đăng nhập sẵn) → redirect.
  useEffect(() => {
    if (!authLoading && user) {
      navigate(safeRedirect, { replace: true });
    }
  }, [authLoading, user, navigate, safeRedirect]);

  const validateInputs = () => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const msg = error.errors[0].message;
        setErrorMsg(msg);
        toast.error('Lỗi xác thực', { description: msg });
      }
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        let message = error.message;
        if (error.message.includes('Invalid login credentials')) {
          message = 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.';
        } else if (error.message.includes('Email not confirmed')) {
          message = 'Vui lòng xác nhận email trước khi đăng nhập. Hãy kiểm tra hộp thư đến của bạn.';
        } else if (error.message.includes('Too many requests')) {
          message = 'Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.';
        }
        throw new Error(message);
      }

      toast.success('Đăng nhập thành công!', { description: 'Đang chuyển hướng…' });
      // Redirect được xử lý bởi useEffect khi auth state cập nhật.
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Lỗi không xác định';
      setErrorMsg(msg);
      toast.error('Lỗi đăng nhập', { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      });

      if (error) {
        let message = error.message;
        if (error.message.includes('User already registered')) {
          message = 'Email này đã được đăng ký. Vui lòng đăng nhập.';
        } else if (error.message.includes('Password is too short')) {
          message = 'Mật khẩu quá ngắn. Phải có ít nhất 6 ký tự.';
        } else if (error.message.includes('Signup disabled')) {
          message = 'Việc đăng ký hiện đang bị tạm khóa. Vui lòng liên hệ quản trị viên.';
        }
        throw new Error(message);
      }

      toast.success('Đăng ký thành công!', {
        description: 'Vui lòng kiểm tra email để xác nhận tài khoản.',
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Lỗi không xác định';
      setErrorMsg(msg);
      toast.error('Lỗi đăng ký', { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  // Đang khôi phục session ban đầu → tránh nháy form.
  if (authLoading || (user && !authLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-sakura/10 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sakura" />
          <p className="text-sm text-muted-foreground">
            {user ? 'Đang chuyển hướng…' : 'Đang kiểm tra phiên đăng nhập…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-sakura/10 flex items-center justify-center p-4">
      <SEO title="Đăng nhập" description="Đăng nhập hoặc tạo tài khoản Sakura Nihongo để bắt đầu hành trình học tiếng Nhật." canonical="/auth" noindex />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-primary mb-2">日本語マスター</h1>
          <p className="text-muted-foreground">Học tiếng Nhật thông minh với AI</p>
        </div>

        <Card className="shadow-card border-sakura/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Chào mừng!</CardTitle>
            <CardDescription>Đăng nhập hoặc tạo tài khoản mới</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Đăng nhập</TabsTrigger>
                <TabsTrigger value="signup">Đăng ký</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang đăng nhập...
                      </>
                    ) : (
                      'Đăng nhập'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Tên hiển thị</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Tên của bạn"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Tối thiểu 6 ký tự"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang đăng ký...
                      </>
                    ) : (
                      'Đăng ký'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Bằng việc đăng ký, bạn đồng ý với điều khoản sử dụng của chúng tôi.
        </p>
      </motion.div>
    </div>
  );
};

// export default Auth;
export default Auth;
