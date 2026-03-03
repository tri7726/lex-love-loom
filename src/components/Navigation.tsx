import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  BookOpen,
  Brain,
  Mic,
  Layers,
  Menu,
  Trophy,
  MessageSquare,
  BookMarked,
  HelpCircle,
  LogOut,
  Gamepad2,
  Video,
  Book,
  Map as MapIcon,
  Search,
  Zap,
  Palette,
  Moon,
  Sun,
  Leaf,
  Globe,
  Sword,
  User,
  Users,
  Bell,
  ShieldCheck,
  CheckCircle,
  RotateCcw,
  Volume2,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StreakBadge } from './StreakBadge';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { JishoSearch } from './JishoSearch';

const navItems = [
  { path: '/', icon: Home, label: 'Trang chủ' },
  { path: '/ai-tutor', icon: Brain, label: 'AI Tutor' },
];

const studyItems = [
  { path: '/learning-path', icon: MapIcon, label: 'Lộ trình', description: 'Chinh phục JLPT N5-N1' },
  { path: '/vocabulary', icon: BookOpen, label: 'Từ vựng', description: 'Kho từ & Hán tự' },
  { path: '/grammar', icon: BookMarked, label: 'Ngữ pháp', description: 'Cấu trúc & Mẫu câu' },
  { path: '/kanji-worksheet', icon: Palette, label: 'Tập viết', description: 'Tạo bảng tập viết Hán tự' },
];

const assessItems = [
  { path: '/quiz', icon: Zap, label: 'Quiz hằng ngày', description: 'Ôn tập nhanh' },
  { path: '/mock-tests', icon: ShieldCheck, label: 'Thi thử JLPT', description: 'Đề thi thực tế' },
  { path: '/flashcard-review', icon: RotateCcw, label: 'Thẻ ghi nhớ (SRS)', description: 'Ôn tập ngắt quãng' },
];

const gameItems = [
  { path: '/flashcard-games', icon: Gamepad2, label: 'Trò chơi', description: 'Ghép cặp, Tốc độ, Luyện gõ...' },
];

const skillItems = [
  { path: '/reading', icon: Book, label: 'Đọc hiểu', description: 'Luyện đọc báo & truyền thuyết' },
  { path: '/speaking-practice', icon: Mic, label: 'Luyện nói AI', description: 'Phát âm & Hội thoại' },
  { path: '/pronunciation', icon: Volume2, label: 'Phát âm', description: 'Luyện âm chuẩn' },
  { path: '/video-learning', icon: Video, label: 'Học qua Video', description: 'Phim & Nhạc Nhật' },
  { path: '/news', icon: Globe, label: 'Tin tức', description: 'Báo NHK Easy' },
];

const socialItems = [
  { path: '/roleplay', icon: MessageSquare, label: 'Hội thoại AI', description: 'Giao tiếp tình huống' },
  { path: '/leagues', icon: Trophy, label: 'Giải đấu', description: 'Xếp hạng hàng tuần' },
  { path: '/leaderboard', icon: Trophy, label: 'Bảng xếp hạng', description: 'Top học viên' },
  { path: '/friends', icon: User, label: 'Bạn bè', description: 'Kết nối đồng đội' },
  { path: '/messages', icon: MessageSquare, label: 'Tin nhắn', description: 'Trò chuyện trò' },
  { path: '/achievements', icon: Trophy, label: 'Thành tích', description: 'Huy hiệu của bạn' },
];

interface NavigationProps {
  streak?: number;
  xp?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  streak = 7,
  xp = 1250,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getUserInitial = () => {
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🌸</span>
            <span className="font-display text-xl font-bold text-gradient-sakura">
              日本語マスター
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'relative gap-2 font-black uppercase text-[10px] tracking-widest h-10 px-4 transition-all',
                      isActive
                        ? 'text-sakura bg-sakura/10'
                        : 'text-muted-foreground hover:text-sakura hover:bg-sakura/5'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}

            {/* Bài học Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 font-black uppercase text-[10px] tracking-widest h-10 px-4 text-muted-foreground hover:text-sakura hover:bg-sakura/5 transition-all">
                  <BookOpen className="h-4 w-4" />
                  Bài học
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-2 rounded-2xl border-2 border-sakura/10 shadow-elevated transition-all">
                {studyItems.map((item) => (
                  <DropdownMenuItem key={item.path} asChild className="rounded-xl p-3 cursor-pointer focus:bg-sakura/5">
                    <Link to={item.path} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-sakura/10 flex items-center justify-center text-sakura">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">{item.description}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Đánh giá Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 font-black uppercase text-[10px] tracking-widest h-10 px-4 text-muted-foreground hover:text-matcha hover:bg-matcha/5 transition-all">
                  <CheckCircle className="h-4 w-4" />
                  Đánh giá
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-2 rounded-2xl border-2 border-matcha/10 shadow-elevated transition-all">
                {assessItems.map((item) => (
                  <DropdownMenuItem key={item.path} asChild className="rounded-xl p-3 cursor-pointer focus:bg-matcha/5">
                    <Link to={item.path} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-matcha/10 flex items-center justify-center text-matcha">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">{item.description}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Trò chơi Link */}
            {gameItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant="ghost"
                  className="gap-2 font-black uppercase text-[10px] tracking-widest h-10 px-4 text-muted-foreground hover:text-orange-500 hover:bg-orange-50 transition-all"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}

            {/* Kỹ năng Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 font-black uppercase text-[10px] tracking-widest h-10 px-4 text-muted-foreground hover:text-indigo-jp hover:bg-indigo-jp/5 transition-all">
                  <Zap className="h-4 w-4" />
                  Kỹ năng
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-2 rounded-2xl border-2 border-indigo-jp/10 shadow-elevated transition-all">
                {skillItems.map((item) => (
                  <DropdownMenuItem key={item.path} asChild className="rounded-xl p-3 cursor-pointer focus:bg-indigo-jp/5">
                    <Link to={item.path} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-jp/10 flex items-center justify-center text-indigo-jp">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">{item.description}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Kết nối Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 font-black uppercase text-[10px] tracking-widest h-10 px-4 text-muted-foreground hover:text-gold hover:bg-gold/5 transition-all">
                  <Users className="h-4 w-4" />
                  Kết nối
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-2 rounded-2xl border-2 border-gold/10 shadow-elevated transition-all">
                {socialItems.map((item) => (
                  <DropdownMenuItem key={item.path} asChild className="rounded-xl p-3 cursor-pointer focus:bg-gold/5">
                    <Link to={item.path} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">{item.description}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* User section */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <JishoSearch />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  {theme === 'sakura' && <Sun className="h-5 w-5 text-sakura" />}
                  {theme === 'matcha' && <Leaf className="h-5 w-5 text-matcha" />}
                  {theme === 'tokyo' && <Moon className="h-5 w-5 text-indigo-jp" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('sakura')} className="gap-2">
                  <span className="h-2 w-2 rounded-full bg-sakura" />
                  Sakura (Gốc)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('matcha')} className="gap-2">
                  <span className="h-2 w-2 rounded-full bg-matcha" />
                  Matcha (Trà xanh)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('tokyo')} className="gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-jp" />
                  Tokyo Night (Tối)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {streak > 0 && <StreakBadge streak={streak} />}

            <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-gold/10 text-gold font-semibold">
              <span className="text-sm">{xp.toLocaleString()} XP</span>
            </div>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 border-2 border-background" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden rounded-2xl border-2 border-border shadow-soft">
                  <div className="p-4 border-b border-border bg-muted/50 flex items-center justify-between">
                    <h3 className="font-bold text-sm">Thông báo</h3>
                    <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 hover:bg-primary/10 text-primary uppercase font-black"> Đã đọc tất cả </Button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {[
                      { id: 1, type: 'follow', content: 'Vũ Hải vừa theo dõi bạn.', time: '2 phút trước', icon: User, color: 'text-primary' },
                      { id: 2, type: 'challenge', content: 'Thùy Dương đã gửi lời thách đấu 1vs1!', time: '1 giờ trước', icon: Sword, color: 'text-secondary' },
                    ].map((notif) => (
                      <div key={notif.id} className="p-4 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors flex gap-4">
                        <div className={cn("h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0", notif.color)}>
                          <notif.icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-tight">{notif.content}</p>
                          <p className="text-[10px] text-muted-foreground">{notif.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 bg-muted/20 border-t border-border mt-auto">
                    <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground"> Xem tất cả </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-9 w-9 border-2 border-primary/30 cursor-pointer hover:border-primary transition-colors">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getUserInitial()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to={`/profile/${user.id}`} className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      <span>Hồ sơ cá nhân</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/edit-profile" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      <span>Chỉnh sửa hồ sơ</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-destructive cursor-pointer">
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="outline" size="sm">
                  Đăng nhập
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t px-2 py-3 shadow-elevated">
          <div className="flex justify-around items-center">
            {[
              { path: '/', icon: Home, label: 'Trang chủ' },
              { path: '/ai-tutor', icon: Brain, label: 'AI Tutor' },
              { path: '/learning-path', icon: BookOpen, label: 'Học tập' },
              { path: '/flashcard-games', icon: Gamepad2, label: 'Game' },
              { path: '/leagues', icon: Trophy, label: 'XH' },
            ].map((mItem) => {
              const isActive = location.pathname === mItem.path;
              return (
                <Link key={mItem.path} to={mItem.path} className="flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'flex flex-col h-auto py-1 px-0 gap-1 w-full rounded-xl transition-all',
                      isActive
                        ? 'text-sakura bg-sakura/5'
                        : 'text-muted-foreground'
                    )}
                  >
                    <mItem.icon className={cn("h-5 w-5", isActive && "animate-pulse-slow")} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">{mItem.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
    </>
  );
};
